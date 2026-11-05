import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kindOf, pickFile, scriptsState, imageName, imageRefs, swapImages } from '../src/files.js';

test('kindOf', () => {
  assert.equal(kindOf('notes.md'), 'md');
  assert.equal(kindOf('NOTES.Markdown'), 'md');
  assert.equal(kindOf('page.HTM'), 'html');
  assert.equal(kindOf('page.html'), 'html');
  assert.equal(kindOf('photo.png'), null);
  assert.equal(kindOf('md'), null);
});

test('pickFile: named file wins, missing name is null, default is newest', () => {
  const files = [
    { name: 'old.md', updated: '2026-01-01T00:00:00Z' },
    { name: 'new.html', updated: '2026-03-01T00:00:00Z' },
  ];
  assert.equal(pickFile(files, 'old.md').name, 'old.md');
  assert.equal(pickFile(files, 'gone.md'), null);
  assert.equal(pickFile(files, null).name, 'new.html');
  assert.equal(pickFile([], null), null);
});

test('scriptsState: on only for the exact attachment id and version', () => {
  const file = { id: 'att9', name: 'chart.html', version: 3 };
  const ok = { file: 'chart.html', scripts: true, version: 3, attachment: 'att9' };
  assert.equal(scriptsState(ok, file), 'on');
  assert.equal(scriptsState({ ...ok, version: 2 }, file), 'stale', 'new version uploaded');
  assert.equal(scriptsState(ok, { ...file, id: 'att10' }), 'stale', 'deleted and re-uploaded under the same name');
  assert.equal(scriptsState({ ...ok, file: null }, file), 'stale', 'newest mode');
  assert.equal(scriptsState({ ...ok, attachment: undefined }, file), 'stale', 'no pin saved');
  assert.equal(scriptsState({ ...ok, scripts: false }, file), 'off');
  assert.equal(scriptsState({ ...ok, file: 'notes.md' }, { id: 'a', name: 'notes.md', version: 3 }), 'off');
});

test('imageName: relative image paths name an attachment; links and data: do not', () => {
  assert.equal(imageName('chart.png'), 'chart.png');
  assert.equal(imageName('img/My%20chart.PNG?v=2#x'), 'My chart.PNG');
  assert.equal(imageName('./logo.svg'), 'logo.svg');
  assert.equal(imageName('https://example.com/a.png'), null);
  assert.equal(imageName('//cdn.example.com/a.png'), null);
  assert.equal(imageName('data:image/png;base64,AAAA'), null);
  assert.equal(imageName('notes.md'), null);
  assert.equal(imageName(''), null);
});

test('swapImages: only <img> srcs that name an attached image change', () => {
  const html = `<p>x</p><img alt="a" src="chart.png"><img src='img/logo.svg' alt=b><img src=gone.png>` +
    `<img src="https://e.com/chart.png"><script src="chart.png"></script><pre>&lt;img src="chart.png"&gt;</pre>`;
  assert.deepEqual(imageRefs(html, ['chart.png', 'logo.svg', 'other.png']).sort(), ['chart.png', 'logo.svg']);
  const out = swapImages(html, (n) => ({ 'chart.png': 'data:image/png;base64,QQ==', 'logo.svg': 'data:image/svg+xml;base64,Qg==' })[n] ?? null);
  assert.match(out, /<img alt="a" src="data:image\/png;base64,QQ==">/);
  assert.match(out, /<img src="data:image\/svg\+xml;base64,Qg==" alt=b>/);
  assert.match(out, /<img src=gone\.png>/, 'missing image left alone');
  assert.match(out, /<img src="https:\/\/e\.com\/chart\.png">/, 'web link left alone');
  assert.match(out, /<script src="chart\.png">/, 'only img tags');
  assert.match(out, /&lt;img src="chart\.png"&gt;/, 'escaped text left alone');
});
