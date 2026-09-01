import assert from 'node:assert/strict';
import test from 'node:test';

import { readApiResponse } from './apiResponse.js';

test('reads JSON API errors', async () => {
  const result = await readApiResponse({ ok: false, status: 409, text: async () => JSON.stringify({ error: 'Team code is invalid' }) }, 'Join failed');
  assert.deepEqual(result, { data: { error: 'Team code is invalid' }, error: 'Team code is invalid' });
});

test('preserves useful non-JSON deployment errors', async () => {
  const result = await readApiResponse({ ok: false, status: 500, text: async () => 'FUNCTION_INVOCATION_FAILED' }, 'Create failed');
  assert.deepEqual(result, { data: {}, error: 'FUNCTION_INVOCATION_FAILED (HTTP 500)' });
});

test('uses a status-aware fallback for empty responses', async () => {
  const result = await readApiResponse({ ok: false, status: 502, text: async () => '' }, 'Team server failed');
  assert.deepEqual(result, { data: {}, error: 'Team server failed (HTTP 502)' });
});
