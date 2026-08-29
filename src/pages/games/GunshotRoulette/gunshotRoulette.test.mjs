import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const stylesheet = readFileSync(new URL('./gunshotRoulette.css', import.meta.url), 'utf8');

test('the gun table overrides Tailwind display utilities and retains its width', () => {
  assert.match(
    stylesheet,
    /\.aws-roulette-original\s+\.table\s*\{[^}]*display:\s*block[^}]*width:\s*100%/s,
  );
});
