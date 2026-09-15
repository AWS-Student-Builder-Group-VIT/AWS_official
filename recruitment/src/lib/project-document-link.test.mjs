import assert from 'node:assert/strict';
import test from 'node:test';

import { parseProjectDocumentLink } from './project-document-link.mjs';

test('accepts and normalizes secure project document links', () => {
  assert.equal(
    parseProjectDocumentLink('  https://example.sharepoint.com/task.docx  '),
    'https://example.sharepoint.com/task.docx',
  );
  assert.equal(parseProjectDocumentLink('https://docs.google.com/document/d/example'), 'https://docs.google.com/document/d/example');
});

test('allows an omitted document link for existing project tasks', () => {
  assert.equal(parseProjectDocumentLink(''), null);
  assert.equal(parseProjectDocumentLink(undefined), null);
});

test('rejects unsafe or malformed project document links', () => {
  assert.throws(() => parseProjectDocumentLink('javascript:alert(1)'), /valid HTTP or HTTPS/i);
  assert.throws(() => parseProjectDocumentLink('file:///C:/task.docx'), /valid HTTP or HTTPS/i);
  assert.throws(() => parseProjectDocumentLink('not a link'), /valid HTTP or HTTPS/i);
});
