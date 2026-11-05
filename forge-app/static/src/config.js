import { invoke, view } from '@forge/bridge';

const $ = (id) => document.getElementById(id);

function option(value, label) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  return o;
}

async function main() {
  await view.theme.enable();
  const ctx = await view.getContext();
  const config = ctx.extension?.config ?? {};
  const r = await invoke('listFiles');

  const select = $('file');
  const scripts = $('scripts');
  if (r.error) {
    $('status').textContent = "Couldn't read this page's files. Close and try again.";
  } else if (!r.files.length) {
    $('status').textContent = 'No .md or .html files on this page yet. Drag one onto the page, then open these settings again.';
  }

  select.append(option('', 'Newest .md or .html on this page'));
  for (const f of r.files ?? []) select.append(option(f.name, f.name));
  // Keep a saved choice visible even if the file was since removed.
  if (config.file && !(r.files ?? []).some((f) => f.name === config.file)) {
    select.append(option(config.file, `${config.file} (missing)`));
  }
  select.value = config.file ?? '';
  scripts.checked = config.scripts === true;

  // Scripts only for one named HTML file, never for "newest".
  const syncScripts = () => {
    $('scripts-row').hidden = !/\.html?$/i.test(select.value);
  };
  select.addEventListener('change', syncScripts);
  syncScripts();

  $('key').addEventListener('toggle', async (e) => {
    if (!e.target.open || $('key-value').textContent) return;
    $('key-value').textContent = await invoke('extensionKey');
  });

  $('cancel').addEventListener('click', () => view.close());
  $('save').addEventListener('click', async () => {
    $('save').disabled = true;
    try {
      const picked = (r.files ?? []).find((f) => f.name === select.value);
      const allow = scripts.checked && !$('scripts-row').hidden && !!picked;
      // Pin scripts to this exact attachment and version; any later upload runs without them.
      await view.submit({
        config: {
          file: select.value,
          scripts: allow,
          version: allow ? picked.version : null,
          attachment: allow ? picked.id : null,
        },
      });
    } catch {
      $('status').textContent = "Couldn't save. Try again.";
      $('save').disabled = false;
    }
  });

  $('form').hidden = false;
}

main().catch(() => {
  $('status').textContent = "Couldn't open the settings. Close and try again.";
});
