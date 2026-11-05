import { invoke, view } from '@forge/bridge';
import { buildSrcdoc, measureHeight } from './doc.js';

const root = document.getElementById('root');
const MAX_HEIGHT = 50000;

const MESSAGES = {
  'no-files': () => 'Attach a .md or .html file to this page and it shows up here.',
  'not-found': (r) => `${r.file} isn't attached to this page anymore. Pick another file in the macro settings.`,
  'too-big': (r) => `${r.file} is over 2 MB. Split it into smaller files.`,
  'no-page': () => 'This macro works on pages and blog posts.',
  'not-published': () => "Publish the page to see this file here. Confluence keeps a new page's files private until it's published once.",
  confluence: (r) =>
    r.status === 401 || r.status === 403
      ? "You don't have access to this file."
      : "Couldn't load the file. Refresh the page to try again.",
};

function note(text) {
  const p = document.createElement('p');
  p.className = 'note';
  p.textContent = text;
  root.replaceChildren(p);
}

function themeColours() {
  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const dark = document.documentElement.dataset.colorMode === 'dark';
  return {
    scheme: dark ? 'dark' : 'light',
    font: v('--ds-font-family-body', 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif'),
    mono: v('--ds-font-family-code', 'ui-monospace, SFMono-Regular, Menlo, monospace'),
    text: v('--ds-text', dark ? '#CECFD2' : '#292A2E'),
    subtle: v('--ds-text-subtle', dark ? '#A9ABAF' : '#505258'),
    link: v('--ds-link', dark ? '#669DF1' : '#1868DB'),
    border: v('--ds-border', dark ? '#3D3F43' : '#DDDEE1'),
    codeBg: v('--ds-background-neutral', dark ? '#2C2D30' : '#F0F1F2'),
  };
}

function mount(file) {
  const scripts = file.scripts === 'on';
  const frame = document.createElement('iframe');
  frame.title = file.name;
  // Scripts on: no same-origin, so the file's code can't reach this frame or Confluence.
  // Scripts off: same-origin is safe (nothing can run) and lets us measure the height directly.
  frame.setAttribute(
    'sandbox',
    scripts
      ? 'allow-scripts allow-popups allow-popups-to-escape-sandbox'
      : 'allow-same-origin allow-popups allow-popups-to-escape-sandbox',
  );
  if (file.kind === 'html') frame.classList.add('page');

  const fit = (h) => {
    const next = Math.min(Math.ceil(h), MAX_HEIGHT);
    if (Math.abs(frame.offsetHeight - next) > 1) frame.style.height = `${next}px`;
  };

  if (scripts) {
    window.addEventListener('message', (e) => {
      if (e.source === frame.contentWindow && typeof e.data?.crHeight === 'number') fit(e.data.crHeight);
    });
  } else {
    frame.addEventListener('load', () => {
      const doc = frame.contentDocument;
      if (!doc) return;
      const measure = () => fit(measureHeight(doc));
      new ResizeObserver(measure).observe(doc.body ?? doc.documentElement);
      measure();
    });
  }

  frame.srcdoc = buildSrcdoc({ kind: file.kind, text: file.text, scripts, theme: themeColours() });
  root.replaceChildren(frame);
  if (file.scripts === 'stale') {
    note('This file changed since its scripts were allowed, so they are off. An editor can allow them again in the macro settings.');
    root.append(frame);
  }
}

async function main() {
  await view.theme.enable();
  const ctx = await view.getContext();
  const config = ctx.extension?.config ?? {};
  const r = await invoke('getFile', {
    file: config.file || null,
    scripts: config.scripts,
    version: config.version,
    attachment: config.attachment,
  });
  if (r.error) return note((MESSAGES[r.error] ?? MESSAGES.confluence)(r));
  mount(r);
}

main().catch(() => note("Couldn't load the file. Refresh the page to try again."));
