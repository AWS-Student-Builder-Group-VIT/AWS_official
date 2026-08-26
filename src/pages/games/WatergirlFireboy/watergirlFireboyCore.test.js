import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreWatergirlAttempt, summarizeWatergirl } from './watergirlFireboyCore.js';

test('Watergirl Fireboy scores gems and remaining time', () => {
  assert.deepEqual(scoreWatergirlAttempt({ gems: 8, secondsRemaining: 12, success: true }), { base: 800, timeBonus: 120, total: 920 });
  assert.deepEqual(scoreWatergirlAttempt({ gems: 4, secondsRemaining: 20, success: false }), { base: 400, timeBonus: 0, total: 400 });
});

test('Watergirl Fireboy awards points from the best run', () => {
  assert.deepEqual(summarizeWatergirl([{ score: 400 }, { score: 920 }, { score: 700 }]), { bestScore: 920, points: 9.2 });
});
