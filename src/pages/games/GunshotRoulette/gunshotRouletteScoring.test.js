import assert from 'node:assert/strict';
import test from 'node:test';
import * as teamGameScoring from '../../../utils/teamGameScoring.js';

test('Gunshot Roulette submits final bankroll only when the dealer is eliminated', () => {
  assert.equal(typeof teamGameScoring.getGunshotCompletion, 'function');
  assert.deepEqual(teamGameScoring.getGunshotCompletion({ dealerEliminated: true, bankroll: 137 }), { score: 137 });
  assert.deepEqual(teamGameScoring.getGunshotCompletion({ dealerEliminated: false, bankroll: 999 }), { score: 0 });
  assert.deepEqual(teamGameScoring.getGunshotCompletion({ dealerEliminated: true, bankroll: 'invalid' }), { score: 0 });
});
