import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kindOf, pickFile, scriptsState } from '../src/files.js';

test('kindOf', () => {
  assert.equal(kindOf('notes.md'), 'md');
  assert.equal(kindOf('NOTES.Markdown'), 'md');
  assert.equal(kindOf('page.HTM'), 'html');
  assert.equal(kindOf('page.html'), 'html');
  assert.equal(kindOf('photo.png'), null);
  assert.equal(kindOf('md'), null);
});

test('pickFile: named file wins, missing name is null, default is newest', () => {
  const files = [
    { name: 'old.md', updated: '2026-01-01T00:00:00Z' },
    { name: 'new.html', updated: '2026-03-01T00:00:00Z' },
  ];
  assert.equal(pickFile(files, 'old.md').name, 'old.md');
  assert.equal(pickFile(files, 'gone.md'), null);
  assert.equal(pickFile(files, null).name, 'new.html');
  assert.equal(pickFile([], null), null);
});

test('scriptsState: on only for the exact attachment id and version', () => {
  const file = { id: 'att9', name: 'chart.html', version: 3 };
  const ok = { file: 'chart.html', scripts: true, version: 3, attachment: 'att9' };
  assert.equal(scriptsState(ok, file), 'on');
  assert.equal(scriptsState({ ...ok, version: 2 }, file), 'stale', 'new version uploaded');
  assert.equal(scriptsState(ok, { ...file, id: 'att10' }), 'stale', 'deleted and re-uploaded under the same name');
  assert.equal(scriptsState({ ...ok, file: null }, file), 'stale', 'newest mode');
  assert.equal(scriptsState({ ...ok, attachment: undefined }, file), 'stale', 'no pin saved');
  assert.equal(scriptsState({ ...ok, scripts: false }, file), 'off');
  assert.equal(scriptsState({ ...ok, file: 'notes.md' }, { id: 'a', name: 'notes.md', version: 3 }), 'off');
});
