import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeMarioKart } from './marioKartCore.js';

test('Mario Kart awards points from the best of five attempts', () => {
  const result = summarizeMarioKart([
    { score: 250, coins: 2, success: false },
    { score: 800, coins: 6, success: true },
    { score: 625, coins: 4, success: true },
    { score: 100, coins: 1, success: false },
    { score: 500, coins: 3, success: true },
  ]);
  assert.deepEqual(result, { bestScore: 800, totalScore: 2275, points: 32, rank: 'Solutions Architect' });
});

test('Mario Kart safely summarizes an empty tournament', () => {
  assert.deepEqual(summarizeMarioKart([]), { bestScore: 0, totalScore: 0, points: 0, rank: 'Cloud Explorer' });
});
