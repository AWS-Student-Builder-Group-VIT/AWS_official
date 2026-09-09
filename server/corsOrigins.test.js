import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { isAllowedOrigin } from './corsOrigins.js';

test('allows local loopback Vite origins used during frontend development', () => {
  assert.equal(isAllowedOrigin('http://127.0.0.1:5174'), true);
});

test('continues to reject unknown external origins', () => {
  assert.equal(isAllowedOrigin('https://untrusted.example'), false);
});

test('Express CORS callback enforces the origin policy', () => {
  const source = readFileSync(new URL('./index.js', import.meta.url), 'utf8');
  const callbackBody = source.match(/origin: \(origin, callback\) => \{([\s\S]*?)\n {2}\},/)[1];
  const check = new Function('origin', 'callback', 'isAllowedOrigin', 'allowedOrigins', callbackBody);
  let result;
  check('https://untrusted.example', (error, allowed) => { result = { error, allowed }; }, isAllowedOrigin, []);
  assert.ok(result.error instanceof Error);
  assert.notEqual(result.allowed, true);
  check('http://127.0.0.1:5174', (error, allowed) => { result = { error, allowed }; }, isAllowedOrigin, []);
  assert.equal(result.error, null);
  assert.equal(result.allowed, true);
});
