import test from 'node:test';
import assert from 'node:assert/strict';

import { isAllowedOrigin } from './corsOrigins.js';

test('allows local loopback Vite origins used during frontend development', () => {
  assert.equal(isAllowedOrigin('http://127.0.0.1:5174'), true);
});

test('continues to reject unknown external origins', () => {
  assert.equal(isAllowedOrigin('https://untrusted.example'), false);
});
