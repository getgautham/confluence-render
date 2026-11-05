import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

// Turns a file into the document shown inside the sandboxed frame.
// Nothing from the file ever touches the macro's own DOM.

const md = new MarkdownIt({ html: true, linkify: true });

export function mdToHtml(text) {
  return DOMPurify.sanitize(md.render(text));
}

// Only used when scripts are on: the frame has no same-origin access then,
// so it has to tell us its height.
const HEIGHT_REPORTER =
  '<script>(function(){var s=function(){parent.postMessage({crHeight:document.documentElement.scrollHeight},"*")};' +
  'addEventListener("load",s);new ResizeObserver(s).observe(document.documentElement);s()})()</script>';

function withHead(html, extra) {
  const m = /<head[^>]*>/i.exec(html);
  if (m) return html.slice(0, m.index + m[0].length) + extra + html.slice(m.index + m[0].length);
  return extra + html;
}

// t = colours read from Confluence's theme, so markdown matches the page in light and dark.
function mdCss(t) {
  return `
:root{color-scheme:${t.scheme}}
html,body{margin:0;background:transparent}
body{font:14px/1.714 ${t.font};color:${t.text};padding:2px 0 8px;overflow-wrap:anywhere}
h1,h2,h3,h4,h5,h6{line-height:1.25;margin:1.6em 0 .5em;font-weight:600}
h1{font-size:1.71em}h2{font-size:1.43em}h3{font-size:1.14em}h4,h5,h6{font-size:1em}
body>:first-child{margin-top:0}
p,ul,ol,pre,table,blockquote{margin:0 0 .9em}
a{color:${t.link}}
img{max-width:100%}
code{font:.92em/1.5 ${t.mono};background:${t.codeBg};padding:.1em .3em;border-radius:3px}
pre{background:${t.codeBg};padding:12px 14px;border-radius:4px;overflow:auto}
pre code{background:none;padding:0}
blockquote{border-left:2px solid ${t.border};padding-left:14px;color:${t.subtle}}
table{border-collapse:collapse;display:block;overflow:auto}
th,td{border:1px solid ${t.border};padding:6px 10px;text-align:left;vertical-align:top}
th{background:${t.codeBg};font-weight:600}
hr{border:0;border-top:1px solid ${t.border};margin:1.5em 0}`;
}

export function buildSrcdoc({ kind, text, scripts, theme }) {
  const base = '<meta charset="utf-8"><base target="_blank">';
  if (kind === 'md') {
    return `<!doctype html><html><head>${base}<style>${mdCss(theme)}</style></head><body>${mdToHtml(text)}</body></html>`;
  }
  return withHead(text, base + (scripts ? HEIGHT_REPORTER : ''));
}
