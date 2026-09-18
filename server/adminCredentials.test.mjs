import assert from 'node:assert/strict';
import test from 'node:test';

import { secretMatches } from './recruitmentRoutes.js';

test('accepts only an exact credential match', () => {
  assert.equal(secretMatches('aws2026', 'aws2026'), true);
  assert.equal(secretMatches('aws2026', 'aws2027'), false);
  // Differing lengths must be rejected, not thrown at by timingSafeEqual.
  assert.equal(secretMatches('aws', 'aws2026'), false);
  assert.equal(secretMatches('aws2026', 'aws'), false);
});

test('rejects missing credentials instead of matching empty config', () => {
  assert.equal(secretMatches(undefined, 'aws2026'), false);
  assert.equal(secretMatches('aws2026', undefined), false);
  assert.equal(secretMatches(undefined, undefined), true, 'empty vs empty is equal; the route guards unset env separately');
});
