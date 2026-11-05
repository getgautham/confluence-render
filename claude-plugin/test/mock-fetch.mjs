// Loaded with `node --import` in tests only: a fake Confluence that records every request.
import { appendFileSync } from 'node:fs';

const log = process.env.MOCK_LOG;
const scoped = process.env.MOCK_SCOPED === '1';
const existing = process.env.MOCK_EXISTING_ADF;

globalThis.fetch = async (url, init = {}) => {
  const method = init.method ?? 'GET';
  let body = null;
  if (typeof init.body === 'string') body = JSON.parse(init.body);
  else if (init.body instanceof FormData) {
    const f = init.body.get('file');
    body = { form: [...init.body.keys()], fileName: f?.name, size: f?.size };
  }
  appendFileSync(log, JSON.stringify({ method, url: String(url), headers: init.headers ?? {}, body }) + '\n');

  const u = new URL(url);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
  if (u.pathname === '/_edge/tenant_info') return json({ cloudId: 'cloud-1' });
  if (scoped && u.host.endsWith('.atlassian.net')) return json({ message: 'Unauthorized' }, 401);

  const p = u.pathname.replace(/^.*?\/wiki/, '');
  if (method === 'GET' && p === '/api/v2/spaces') {
    const all = [{ id: '99', key: 'ENG', name: 'Engineering' }, { id: '7', key: 'MKT', name: 'Marketing' }];
    const keys = u.searchParams.get('keys');
    return json({ results: keys ? all.filter((s) => s.key === keys) : all });
  }
  if (method === 'POST' && p === '/api/v2/pages') return json({ id: '123', title: body.title, _links: { webui: '/spaces/ENG/pages/123' } });
  if (method === 'PUT' && /^\/rest\/api\/content\/\d+\/child\/attachment$/.test(p)) return json({ results: [{ id: 'att1' }] });
  if (method === 'GET' && /^\/api\/v2\/pages\/\d+$/.test(p)) {
    return json({
      id: '456',
      title: 'Old page',
      version: { number: 4 },
      body: { atlas_doc_format: { value: existing ?? '{"type":"doc","version":1,"content":[]}' } },
      _links: { webui: '/spaces/ENG/pages/456' },
    });
  }
  if (method === 'PUT' && /^\/api\/v2\/pages\/\d+$/.test(p)) return json({ id: '456' });
  return json({ message: `no route ${method} ${p}` }, 404);
};
