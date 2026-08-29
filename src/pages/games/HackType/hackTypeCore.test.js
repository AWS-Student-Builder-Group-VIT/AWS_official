import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateStats, createAttempt, restoreState } from './hackTypeCore.js';

test('calculates WPM, accuracy and score from typed characters', () => {
  const stats = calculateStats({ correctCharacters: 150, incorrectCharacters: 50, elapsedMs: 60000 });
  assert.deepEqual(stats, { wpm: 30, accuracy: 75, score: 22.5 });
});

test('creates five-attempt state and safely resets corrupt saved data', () => {
  assert.equal(createAttempt().attempt, 1);
  assert.equal(restoreState('{invalid').attempt, 1);
});
