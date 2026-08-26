import assert from 'node:assert/strict';
import test from 'node:test';
import { asteroidStage, summarizeAsteroidTournament } from './asteroidCommandCore.js';

test('Asteroid Command advances one stage per 2500 points', () => {
  assert.equal(asteroidStage(0), 1);
  assert.equal(asteroidStage(2499), 1);
  assert.equal(asteroidStage(2500), 2);
  assert.equal(asteroidStage(7500), 4);
});

test('Asteroid Command awards one point per 100 best-score points', () => {
  assert.deepEqual(summarizeAsteroidTournament([400, 1250, 900, 0, 600]), { bestScore: 1250, points: 12.5 });
});
