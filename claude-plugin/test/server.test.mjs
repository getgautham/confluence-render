import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KEY = '11111111-2222-3333-4444-555555555555/66666666-7777-8888-9999-000000000000/static/render-file';
const dir = mkdtempSync(join(tmpdir(), 'cr-test-'));
const files = {};

before(() => {
  files.html = join(dir, 'report.html');
  writeFileSync(files.html, '<!doctype html><h1>Hi</h1>');
  files.md = join(dir, 'notes.md');
  writeFileSync(files.md, '# Notes');
  files.txt = join(dir, 'secret.txt');
  writeFileSync(files.txt, 'secret');
  files.sneaky = join(dir, 'sneaky.md');
  symlinkSync(files.txt, files.sneaky);
});

// Runs the server, sends JSON-RPC calls, returns { replies, requests } (requests = what hit "Confluence").
async function run(calls, env = {}) {
  const log = join(dir, `log-${Math.random().toString(36).slice(2)}.jsonl`);
  const child = spawn(process.execPath, ['--import', './test/mock-fetch.mjs', 'server/index.mjs'], {
    env: {
      PATH: process.env.PATH,
      MOCK_LOG: log,
      CONFLUENCE_SITE: 'acme.atlassian.net',
      CONFLUENCE_EMAIL: 'a@acme.test',
      CONFLUENCE_API_TOKEN: 'fake-token',
      CONFLUENCE_MACRO_KEY: KEY,
      ...env,
    },
  });
  const msgs = [
    { jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    ...calls.map((c, i) => ({ jsonrpc: '2.0', id: i + 1, ...c })),
  ];
  const want = calls.length + 1;
  const replies = await new Promise((resolve, reject) => {
    let buf = '';
    const got = [];
    const timer = setTimeout(() => reject(new Error('timeout: ' + buf)), 5000);
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        got.push(JSON.parse(buf.slice(0, i)));
        buf = buf.slice(i + 1);
      }
      if (got.length >= want) {
        clearTimeout(timer);
        resolve(got);
      }
    });
    for (const m of msgs) child.stdin.write(JSON.stringify(m) + '\n');
  });
  child.kill();
  const requests = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  return { replies: replies.sort((a, b) => a.id - b.id).slice(1), requests };
}

const call = (name, args) => ({ method: 'tools/call', params: { name, arguments: args } });
const text = (r) => r.result.content[0].text;

test('lists two tools', async () => {
  const { replies } = await run([{ method: 'tools/list' }]);
  assert.deepEqual(replies[0].result.tools.map((t) => t.name), ['list_spaces', 'publish_file']);
});

test('new page: creates the page with the macro, then uploads the file', async () => {
  const { replies, requests } = await run([call('publish_file', { path: files.html, space_key: 'ENG', run_scripts: true })]);
  assert.equal(replies[0].result.isError, undefined, text(replies[0]));
  const out = JSON.parse(text(replies[0]));
  assert.equal(out.url, 'https://acme.atlassian.net/wiki/spaces/ENG/pages/123');

  const create = requests.find((r) => r.method === 'POST');
  assert.equal(create.body.spaceId, '99');
  assert.equal(create.body.title, 'report');
  const node = JSON.parse(create.body.body.value).content[0];
  assert.equal(node.attrs.extensionKey, KEY);
  assert.equal(node.attrs.extensionType, 'com.atlassian.ecosystem');
  assert.deepEqual(node.attrs.parameters.guestParams, { file: 'report.html', scripts: false }, 'scripts off until pinned');

  const pin = requests.find((r) => r.method === 'PUT' && r.url.endsWith('/api/v2/pages/123'));
  const pinned = JSON.parse(pin.body.body.value).content;
  assert.equal(pinned.length, 1, 'no duplicate macro');
  assert.deepEqual(pinned[0].attrs.parameters.guestParams, { file: 'report.html', scripts: true, version: 1, attachment: 'att1' });
  assert.equal(pin.body.version.number, 2);

  const up = requests.find((r) => r.url.endsWith('/rest/api/content/123/child/attachment'));
  assert.ok(requests.indexOf(up) < requests.indexOf(pin), 'pins after the upload exists');
  assert.equal(up.method, 'PUT');
  assert.equal(up.headers['X-Atlassian-Token'], 'no-check');
  assert.equal(up.body.fileName, 'report.html');
  assert.ok(requests.every((r) => new URL(r.url).host === 'acme.atlassian.net'), 'only talks to the site');
});

test('markdown never gets scripts on', async () => {
  const { requests } = await run([call('publish_file', { path: files.md, space_key: 'ENG', run_scripts: true })]);
  const node = JSON.parse(requests.find((r) => r.method === 'POST').body.body.value).content[0];
  assert.equal(node.attrs.parameters.guestParams.scripts, false);
});

test('existing page: uploads, then appends the macro once', async () => {
  const { requests } = await run([call('publish_file', { path: files.md, page_id: '456' })]);
  const put = requests.find((r) => r.method === 'PUT' && r.url.endsWith('/api/v2/pages/456'));
  assert.equal(put.body.version.number, 5);
  assert.equal(JSON.parse(put.body.body.value).content[0].attrs.parameters.guestParams.file, 'notes.md');

  const adf = JSON.stringify({ type: 'doc', version: 1, content: [JSON.parse(put.body.body.value).content[0]] });
  const again = await run([call('publish_file', { path: files.md, page_id: '456' })], { MOCK_EXISTING_ADF: adf });
  assert.ok(!again.requests.some((r) => r.method === 'PUT' && r.url.endsWith('/api/v2/pages/456')), 'no second macro');
  assert.ok(again.requests.some((r) => r.url.endsWith('/child/attachment')), 'new file version uploaded');
});

test('existing page with scripts: re-pins the macro to the new upload', async () => {
  const old = { type: 'doc', version: 1, content: [{ type: 'extension', attrs: { extensionKey: KEY, parameters: { guestParams: { file: 'report.html', scripts: true, version: 2 } } } }] };
  const env = { MOCK_EXISTING_ADF: JSON.stringify(old), MOCK_ATT_VERSION: '3', MOCK_ATT_ID: 'att7' };
  const { requests } = await run([call('publish_file', { path: files.html, page_id: '456', run_scripts: true })], env);
  const put = requests.find((r) => r.method === 'PUT' && r.url.endsWith('/api/v2/pages/456'));
  const gp = JSON.parse(put.body.body.value).content[0].attrs.parameters.guestParams;
  assert.deepEqual(gp, { file: 'report.html', scripts: true, version: 3, attachment: 'att7' });

  const without = await run([call('publish_file', { path: files.html, page_id: '456' })], env);
  assert.ok(!without.requests.some((r) => r.method === 'PUT' && r.url.endsWith('/api/v2/pages/456')), 'no re-pin without run_scripts');
});

test('refuses non-md/html files and symlinks that point at them', async () => {
  const { replies, requests } = await run([
    call('publish_file', { path: files.txt, space_key: 'ENG' }),
    call('publish_file', { path: files.sneaky, space_key: 'ENG' }),
  ]);
  for (const r of replies) {
    assert.equal(r.result.isError, true);
    assert.match(text(r), /Only \.md/);
  }
  assert.equal(requests.length, 0, 'nothing sent to Confluence');
});

test('scoped token: falls through to the Atlassian gateway', async () => {
  const { replies, requests } = await run([call('list_spaces', { query: 'eng' })], { MOCK_SCOPED: '1' });
  assert.deepEqual(JSON.parse(text(replies[0])), [{ key: 'ENG', name: 'Engineering' }]);
  assert.ok(requests.at(-1).url.startsWith('https://api.atlassian.com/ex/confluence/cloud-1/wiki/'));
});

test('not set up: says what is missing, sends nothing', async () => {
  const { replies, requests } = await run([call('list_spaces', {})], { CONFLUENCE_SITE: 'evil.example.com', CONFLUENCE_MACRO_KEY: '' });
  assert.equal(replies[0].result.isError, true);
  assert.match(text(replies[0]), /site .*macro key/);
  assert.equal(requests.length, 0);
});
