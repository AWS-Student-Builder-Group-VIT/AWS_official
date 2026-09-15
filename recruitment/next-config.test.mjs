import test from 'node:test';
import assert from 'node:assert/strict';
import createNextConfig from './next.config.mjs';

test('development and production builds write to isolated Next output directories', () => {
  assert.equal(typeof createNextConfig, 'function');
  const development = createNextConfig('phase-development-server');
  const production = createNextConfig('phase-production-build');

  assert.equal(development.distDir, '.next-dev');
  assert.equal(production.distDir, '.next-build');
  assert.notEqual(development.distDir, production.distDir);
});
