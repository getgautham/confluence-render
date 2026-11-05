// Bundles the two Custom UI screens next to their index.html.
//   node build.mjs            -> static/render/main.js, static/config/main.js (what forge deploy ships)
//   node build.mjs --preview  -> .preview/ with a fake Forge bridge, to look at the renderer in a browser
import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';

const preview = process.argv.includes('--preview');
if (preview) cpSync('test/samples', '.preview/samples', { recursive: true });
const common = { bundle: true, format: 'iife', target: 'es2020', minify: !preview, logLevel: 'info' };

for (const name of ['render', 'config']) {
  const outdir = preview ? `.preview/${name}` : `static/${name}`;
  if (preview) {
    mkdirSync(outdir, { recursive: true });
    cpSync(`static/${name}/index.html`, `${outdir}/index.html`);
  }
  await build({
    ...common,
    entryPoints: [`static/src/${name}.js`],
    outfile: `${outdir}/main.js`,
    alias: preview ? { '@forge/bridge': './test/fake-bridge.js' } : {},
  });
}
