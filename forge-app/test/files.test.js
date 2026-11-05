import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kindOf, pickFile } from '../src/files.js';

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
