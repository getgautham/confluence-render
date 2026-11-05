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

// Images attached to the page beside the file. One call returns 5 MB at most,
// so 3 MB per image leaves room for base64.
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };

export function imageType(name) {
  const m = /\.([a-z]+)$/.exec(String(name).toLowerCase());
  return (m && IMAGES[m[1]]) ?? null;
}

// <img src="chart.png"> or "img/chart.png" names the attachment chart.png.
// Web links, data: and other absolute URLs name nothing.
export function imageName(src) {
  if (!src || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) return null;
  let path = src.split(/[?#]/)[0];
  try {
    path = decodeURIComponent(path);
  } catch {}
  const name = path.split('/').pop();
  return name && imageType(name) ? name : null;
}

const IMG_SRC = /(<img\b[^>]*?\ssrc\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;

// Replaces each <img> src that names an image with to(name); null leaves it.
export function swapImages(html, to) {
  return html.replace(IMG_SRC, (all, pre, a, b, c) => {
    const name = imageName(a ?? b ?? c);
    const src = name ? to(name) : null;
    return src ? `${pre}"${src}"` : all;
  });
}

export function imageRefs(html, attached) {
  const have = new Set(attached);
  const found = new Set();
  swapImages(html, (name) => (have.has(name) && found.add(name), null));
  return [...found];
}
