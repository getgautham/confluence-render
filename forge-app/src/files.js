// Pure helpers shared by the resolver and its tests. No Forge imports here.

export const MAX_BYTES = 2 * 1024 * 1024; // keeps the resolver reply well under Forge's payload limit
export const MACRO_KEY = 'render-file';

const KINDS = { md: 'md', markdown: 'md', html: 'html', htm: 'html' };

export function kindOf(name) {
  const m = /\.([a-z]+)$/.exec(String(name).toLowerCase());
  return (m && KINDS[m[1]]) ?? null;
}

// The file the macro was set to, or (when none was set) the newest .md/.html on the page.
export function pickFile(files, wanted) {
  if (wanted) return files.find((f) => f.name === wanted) ?? null;
  return [...files].sort((a, b) => String(b.updated).localeCompare(String(a.updated)))[0] ?? null;
}

// Scripts run only on the exact attachment (id) and version an editor allowed.
// Anyone who can attach files could upload a new version, or delete the file and
// upload a new one under the same name (version restarts at 1, but the id changes).
// Either way it shows with scripts off ('stale') until an editor allows it again.
export function scriptsState(config, file) {
  if (config?.scripts !== true || kindOf(file.name) !== 'html') return 'off';
  const same = config.file === file.name && config.attachment === file.id && Number(config.version) === file.version;
  return same ? 'on' : 'stale';
}
