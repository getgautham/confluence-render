import Resolver from '@forge/resolver';
import api, { route, assumeTrustedRoute, getAppContext } from '@forge/api';
import { kindOf, imageType, pickFile, scriptsState, MAX_BYTES, MAX_IMAGE_BYTES, MACRO_KEY } from './files.js';

// Every Confluence call runs as the person viewing the page (asUser), so they
// only ever see files their own Confluence permissions already allow.

class HttpError extends Error {
  constructor(status) {
    super(`confluence ${status}`);
    this.status = status;
  }
}

async function attachments(pageId) {
  const res = await api
    .asUser()
    .requestConfluence(route`/wiki/api/v2/pages/${pageId}/attachments?limit=250`, {
      headers: { Accept: 'application/json' },
    });
  if (!res.ok) throw new HttpError(res.status);
  const { results = [] } = await res.json();
  return results.map((a) => ({
      id: a.id,
      name: a.title,
      size: a.fileSize,
      version: a.version?.number ?? null,
      updated: a.version?.createdAt ?? '',
      download: a.downloadLink ?? a._links?.download ?? null,
    }));
}

async function listFiles(pageId) {
  return (await attachments(pageId)).filter((a) => kindOf(a.name));
}

// downloadLink comes from Confluence's own reply, so it's a trusted path.
// Used exactly as given: its query string carries the version and draft status.
function download(att) {
  if (!/^\/(download|rest\/api\/content)\//.test(att.download ?? '')) throw new HttpError(502);
  return api.asUser().requestConfluence(assumeTrustedRoute(`/wiki${att.download}`));
}

function pageIdOf(context) {
  return context?.extension?.content?.id ?? null;
}

const resolver = new Resolver();

resolver.define('listFiles', async ({ context }) => {
  const pageId = pageIdOf(context);
  if (!pageId) return { error: 'no-page' };
  try {
    return { files: await listFiles(pageId) };
  } catch (e) {
    return { error: 'confluence', status: e.status ?? null };
  }
});

resolver.define('getFile', async ({ context, payload }) => {
  const pageId = pageIdOf(context);
  if (!pageId) return { error: 'no-page' };
  const wanted = typeof payload?.file === 'string' && payload.file ? payload.file : null;
  try {
    const all = await attachments(pageId);
    const files = all.filter((a) => kindOf(a.name));
    const file = pickFile(files, wanted);
    if (!file) return { error: files.length ? 'not-found' : 'no-files', file: wanted };
    if (file.size > MAX_BYTES) return { error: 'too-big', file: file.name };
    const res = await download(file);
    // The file is listed but won't download: the page has never been published.
    if (res.status === 404) return { error: 'not-published', file: file.name };
    if (!res.ok) throw new HttpError(res.status);
    return {
      name: file.name,
      kind: kindOf(file.name),
      text: await res.text(),
      scripts: scriptsState(
        { file: wanted, scripts: payload?.scripts, version: payload?.version, attachment: payload?.attachment },
        file,
      ),
      images: all.filter((a) => imageType(a.name)).map((a) => a.name),
    };
  } catch (e) {
    console.warn(`[getFile] ${e.status ?? e.name}`);
    return { error: 'confluence', status: e.status ?? null };
  }
});

// One image attached to this page, as a data: URL the sandboxed frame can show.
resolver.define('getImage', async ({ context, payload }) => {
  const pageId = pageIdOf(context);
  const name = typeof payload?.name === 'string' ? payload.name : '';
  const type = imageType(name);
  if (!pageId || !type) return { error: 'not-found' };
  try {
    const img = (await attachments(pageId)).find((a) => a.name === name);
    if (!img) return { error: 'not-found' };
    if (img.size > MAX_IMAGE_BYTES) return { error: 'too-big' };
    const res = await download(img);
    if (!res.ok) throw new HttpError(res.status);
    return { src: `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}` };
  } catch (e) {
    console.warn(`[getImage] ${e.status ?? e.name}`);
    return { error: 'confluence' };
  }
});

// The key the Claude plugin needs to place this macro on a page. Not a secret.
resolver.define('extensionKey', () => {
  const { appAri, environmentAri } = getAppContext();
  return `${appAri.appId}/${environmentAri.environmentId}/static/${MACRO_KEY}`;
});

export const handler = resolver.getDefinitions();
