// Talks to one Confluence Cloud site as one person (their email + API token).
// No dependencies: Node's own fetch, FormData and Blob.
import { readFile, realpath, stat } from 'node:fs/promises';
import { basename, dirname, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

export const MAX_BYTES = 2 * 1024 * 1024; // same cap as the Confluence macro
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // the macro's cap per image
const RENDERABLE = /\.(md|markdown|html|htm)$/i;
const IMAGE = /\.(png|jpe?g|gif|webp|svg)$/i;
const IMAGE_REF = /!\[[^\]]*\]\(\s*<?([^)\s>]+)|<img\b[^>]*?\ssrc\s*=\s*["']?([^"'\s>]+)/gi;
const SITE = /^[a-z0-9][a-z0-9-]*\.atlassian\.net$/;
const KEY = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/static\/render-file$/;
const MACRO_TITLE = 'Markdown & HTML file';

export class UserError extends Error {}

export function readConfig(env) {
  const site = String(env.CONFLUENCE_SITE ?? '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
  const email = String(env.CONFLUENCE_EMAIL ?? '').trim();
  const token = String(env.CONFLUENCE_API_TOKEN ?? '').trim();
  const macroKey = String(env.CONFLUENCE_MACRO_KEY ?? '').trim();
  const missing = [];
  if (!SITE.test(site)) missing.push('site (like yourcompany.atlassian.net)');
  if (!email) missing.push('email');
  if (!token) missing.push('API token');
  if (!KEY.test(macroKey)) missing.push('macro key (open the macro settings in Confluence, "Key for the Claude plugin")');
  return { site, email, token, macroKey, missing };
}

// guestParams: { file, scripts, version, attachment }. With scripts on, version +
// attachment id pin them to one upload: the macro runs them on that upload only.
export function macroNode(macroKey, guestParams) {
  const localId = randomUUID();
  return {
    type: 'extension',
    attrs: {
      layout: 'default',
      extensionType: 'com.atlassian.ecosystem',
      extensionKey: macroKey,
      text: MACRO_TITLE,
      parameters: {
        layout: 'extension',
        guestParams,
        forgeEnvironment: 'PRODUCTION',
        localId,
        extensionId: `ari:cloud:ecosystem::extension/${macroKey}`,
        extensionTitle: MACRO_TITLE,
      },
      localId,
    },
  };
}

export function findMacro(adf, file) {
  return (adf?.content ?? []).find(
    (n) =>
      n.type === 'extension' &&
      String(n.attrs?.extensionKey ?? '').endsWith('/static/render-file') &&
      n.attrs?.parameters?.guestParams?.file === file,
  );
}

// Reads the file the person named. Resolves symlinks first so "notes.md" can't
// quietly point at something else on disk.
export async function loadFile(path) {
  if (typeof path !== 'string' || !path) throw new UserError('Give the path to a .md or .html file.');
  let real;
  try {
    real = await realpath(path);
  } catch {
    throw new UserError(`No file at ${path}.`);
  }
  if (!RENDERABLE.test(path) || !RENDERABLE.test(real)) {
    throw new UserError('Only .md, .markdown, .html and .htm files can be published.');
  }
  const info = await stat(real);
  if (!info.isFile()) throw new UserError(`${path} is not a file.`);
  if (info.size > MAX_BYTES) throw new UserError(`${basename(path)} is over 2 MB. Split it into smaller files.`);
  return { name: basename(path), dir: dirname(real), bytes: await readFile(real) };
}

// Images the file points at by relative path (![](chart.png), <img src="img/chart.png">).
// Read from the file's own folder only, so a file can't pull in a picture from elsewhere
// on disk. Uploaded beside the file under their own name; the macro shows them inline.
export async function loadImages(file) {
  const found = new Map(); // name -> real path
  const skipped = [];
  for (const m of file.bytes.toString('utf8').matchAll(IMAGE_REF)) {
    const ref = m[1] ?? m[2];
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) continue; // web links and data: stay as they are
    let path = ref.split(/[?#]/)[0];
    try {
      path = decodeURIComponent(path);
    } catch {}
    const name = basename(path);
    if (!IMAGE.test(name)) continue;
    let real = null;
    try {
      real = await realpath(resolve(file.dir, path));
    } catch {}
    if (!real || !real.startsWith(file.dir + sep) || !IMAGE.test(real) || !(await stat(real)).isFile()) {
      skipped.push(`${ref}: not an image in the file's folder`);
    } else if (found.has(name)) {
      if (found.get(name) !== real) skipped.push(`${ref}: another image is also called ${name}`);
    } else if ((await stat(real)).size > MAX_IMAGE_BYTES) {
      skipped.push(`${ref}: over 3 MB`);
    } else {
      found.set(name, real);
    }
  }
  const images = [];
  for (const [name, real] of found) images.push({ name, bytes: await readFile(real) });
  return { images, skipped };
}

export function client(cfg, fetchImpl = fetch) {
  const auth = 'Basic ' + Buffer.from(`${cfg.email}:${cfg.token}`).toString('base64');
  let base = null;

  // Classic API tokens work on the site URL; scoped API tokens only through
  // Atlassian's gateway. Try the site, then the gateway. Both are Atlassian hosts.
  async function resolveBase() {
    if (base) return base;
    const site = `https://${cfg.site}/wiki`;
    const probe = await fetchImpl(`${site}/api/v2/spaces?limit=1`, { headers: { Authorization: auth, Accept: 'application/json' } });
    if (probe.ok) return (base = site);
    if (probe.status !== 401 && probe.status !== 403) throw await failure(probe, 'reach Confluence');
    const info = await fetchImpl(`https://${cfg.site}/_edge/tenant_info`);
    const { cloudId } = info.ok ? await info.json() : {};
    if (!cloudId) throw new UserError(`Confluence said no to these credentials (${probe.status}). Check the email and API token.`);
    const gateway = `https://api.atlassian.com/ex/confluence/${cloudId}/wiki`;
    const retry = await fetchImpl(`${gateway}/api/v2/spaces?limit=1`, { headers: { Authorization: auth, Accept: 'application/json' } });
    if (!retry.ok) throw new UserError(`Confluence said no to these credentials (${retry.status}). Check the email, API token and its scopes.`);
    return (base = gateway);
  }

  async function call(method, path, { json, form, what } = {}) {
    const root = await resolveBase();
    const headers = { Authorization: auth, Accept: 'application/json' };
    let body;
    if (json) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (form) {
      headers['X-Atlassian-Token'] = 'no-check';
      body = form;
    }
    const res = await fetchImpl(root + path, { method, headers, body });
    if (!res.ok) throw await failure(res, what);
    return res.status === 204 ? null : res.json();
  }

  return { call, siteUrl: `https://${cfg.site}/wiki` };
}

async function failure(res, what) {
  let detail = '';
  try {
    const j = await res.json();
    detail = j.message || j.errors?.[0]?.title || j.errors?.[0]?.message || '';
  } catch {}
  const hint = { 401: 'check the API token', 403: "you don't have permission", 404: 'not found' }[res.status];
  return new UserError(`Couldn't ${what} (${res.status}${hint ? `, ${hint}` : ''})${detail ? `: ${String(detail).slice(0, 300)}` : ''}.`);
}

export async function listSpaces(api, query) {
  const r = await api.call('GET', '/api/v2/spaces?limit=250&status=current', { what: 'list spaces' });
  const q = String(query ?? '').toLowerCase();
  return (r.results ?? [])
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q))
    .map((s) => ({ key: s.key, name: s.name }));
}

async function upload(api, pageId, file) {
  const form = new FormData();
  form.append('file', new Blob([file.bytes]), file.name);
  form.append('minorEdit', 'true');
  // PUT adds the file, or a new version of it if the page already has one with this name.
  const r = await api.call('PUT', `/rest/api/content/${encodeURIComponent(pageId)}/child/attachment`, { form, what: `upload ${file.name}` });
  const att = r?.results?.[0];
  return { id: att?.id ?? null, version: att?.version?.number ?? null };
}

// Makes sure the page shows the file. Adds the macro if it's missing; with scripts,
// re-pins it to this exact upload (an unpinned new upload runs without scripts).
async function placeMacro(api, cfg, pageId, name, scripts, att) {
  const page = await api.call('GET', `/api/v2/pages/${encodeURIComponent(pageId)}?body-format=atlas_doc_format`, { what: 'read the page' });
  const adf = JSON.parse(page.body?.atlas_doc_format?.value || '{"type":"doc","version":1,"content":[]}');
  const node = findMacro(adf, name);
  if (node && !scripts) return page;
  const params = scripts ? { file: name, scripts: true, version: att.version, attachment: att.id } : { file: name, scripts: false };
  if (node) node.attrs.parameters.guestParams = { ...node.attrs.parameters.guestParams, ...params };
  else adf.content = [...(adf.content ?? []), macroNode(cfg.macroKey, params)];
  await api.call('PUT', `/api/v2/pages/${encodeURIComponent(pageId)}`, {
    what: 'update the page',
    json: {
      id: String(pageId),
      status: 'current',
      title: page.title,
      version: { number: page.version.number + 1, message: `Shows ${name}` },
      body: { representation: 'atlas_doc_format', value: JSON.stringify(adf) },
    },
  });
  return page;
}

export async function publish(api, cfg, args) {
  const file = await loadFile(args.path);
  const scripts = args.run_scripts === true && /\.html?$/i.test(file.name);
  const { images, skipped } = await loadImages(file);
  const extra = { ...(images.length ? { images: images.map((i) => i.name) } : {}), ...(skipped.length ? { images_skipped: skipped } : {}) };
  // Images go up first, so the page never shows the file with its pictures missing.
  const uploadAll = async (pageId) => {
    for (const img of images) await upload(api, pageId, img);
    return upload(api, pageId, file);
  };

  if (args.page_id) {
    const pageId = String(args.page_id);
    const att = await uploadAll(pageId);
    const page = await placeMacro(api, cfg, pageId, file.name, scripts, att);
    return { url: api.siteUrl + (page._links?.webui ?? `/pages/${pageId}`), file: file.name, updated: true, ...extra };
  }

  if (!args.space_key) throw new UserError('Give a space_key for a new page, or a page_id to update one.');
  const spaces = await api.call('GET', `/api/v2/spaces?keys=${encodeURIComponent(args.space_key)}`, { what: 'find the space' });
  const space = spaces.results?.[0];
  if (!space) throw new UserError(`No space with key ${args.space_key}, or you can't see it.`);
  // Scripts stay off until the upload exists to pin them to (placeMacro below).
  const doc = { type: 'doc', version: 1, content: [macroNode(cfg.macroKey, { file: file.name, scripts: false })] };
  const page = await api.call('POST', '/api/v2/pages', {
    what: 'create the page',
    json: {
      spaceId: space.id,
      status: 'current',
      title: args.title || file.name.replace(/\.[^.]+$/, ''),
      ...(args.parent_page_id ? { parentId: String(args.parent_page_id) } : {}),
      body: { representation: 'atlas_doc_format', value: JSON.stringify(doc) },
    },
  });
  const url = api.siteUrl + (page._links?.webui ?? `/pages/${page.id}`);
  try {
    const att = await uploadAll(page.id);
    if (scripts) await placeMacro(api, cfg, page.id, file.name, true, att);
  } catch (e) {
    throw new UserError(`Made the page (${url}) but didn't finish. ${e.message} Run again with page_id ${page.id}.`);
  }
  return { url, file: file.name, page_id: page.id, created: true, ...extra };
}
