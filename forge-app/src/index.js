import Resolver from '@forge/resolver';
import api, { route, getAppContext } from '@forge/api';
import { kindOf, pickFile, scriptsState, MAX_BYTES, MACRO_KEY } from './files.js';

// Every Confluence call runs as the person viewing the page (asUser), so they
// only ever see files their own Confluence permissions already allow.

class HttpError extends Error {
  constructor(status) {
    super(`confluence ${status}`);
    this.status = status;
  }
}

async function listFiles(pageId) {
  const res = await api
    .asUser()
    .requestConfluence(route`/wiki/api/v2/pages/${pageId}/attachments?limit=250`, {
      headers: { Accept: 'application/json' },
    });
  if (!res.ok) throw new HttpError(res.status);
  const { results = [] } = await res.json();
  return results
    .filter((a) => kindOf(a.title))
    .map((a) => ({
      id: a.id,
      name: a.title,
      size: a.fileSize,
      version: a.version?.number ?? null,
      updated: a.version?.createdAt ?? '',
    }));
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
    const files = await listFiles(pageId);
    const file = pickFile(files, wanted);
    if (!file) return { error: files.length ? 'not-found' : 'no-files', file: wanted };
    if (file.size > MAX_BYTES) return { error: 'too-big', file: file.name };
    const res = await api
      .asUser()
      .requestConfluence(route`/wiki/rest/api/content/${pageId}/child/attachment/${file.id}/download`);
    if (!res.ok) throw new HttpError(res.status);
    return {
      name: file.name,
      kind: kindOf(file.name),
      text: await res.text(),
      scripts: scriptsState({ file: wanted, scripts: payload?.scripts, version: payload?.version }, file),
    };
  } catch (e) {
    return { error: 'confluence', status: e.status ?? null };
  }
});

// The key the Claude plugin needs to place this macro on a page. Not a secret.
resolver.define('extensionKey', () => {
  const { appAri, environmentAri } = getAppContext();
  return `${appAri.appId}/${environmentAri.environmentId}/static/${MACRO_KEY}`;
});

export const handler = resolver.getDefinitions();
