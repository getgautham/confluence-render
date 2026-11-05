// Stand-in for @forge/bridge in `npm run preview`. Not shipped.
// Open .preview/render/index.html?file=sample.md (add &scripts=1, &dark=1).
const q = new URLSearchParams(location.search);
const file = q.get('file') || 'sample.md';

export const view = {
  theme: {
    enable: async () => {
      if (q.get('dark')) {
        document.documentElement.dataset.colorMode = 'dark';
        document.body.style.background = '#1F1F21';
      }
    },
  },
  getContext: async () => ({ extension: { config: { file, scripts: q.get('scripts') === '1' } } }),
  submit: async (p) => console.log('submit', JSON.stringify(p)),
  close: async () => console.log('close'),
};

export async function invoke(name) {
  if (name === 'listFiles') return { files: [{ name: 'sample.md' }, { name: 'sample.html' }] };
  if (name === 'extensionKey') return '00000000-0000-0000-0000-000000000000/11111111-1111-1111-1111-111111111111/static/render-file';
  const text = await (await fetch(`../samples/${file}`)).text();
  return { name: file, kind: file.endsWith('.md') ? 'md' : 'html', text };
}
