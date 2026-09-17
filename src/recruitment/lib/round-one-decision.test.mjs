import assert from 'node:assert/strict';
import test from 'node:test';

import { roundOneOutcome } from './round-one-decision.js';

test('qualified in any one track qualifies the candidate', () => {
  assert.deepEqual(roundOneOutcome([true, false, null], 'round_0'), { round_0_status: 'qualified', status: 'round_1', current_round: 1 });
});

test('rejected in every track rejects the candidate', () => {
  assert.deepEqual(roundOneOutcome([false, false], 'round_1'), { round_0_status: 'not_qualified', status: 'rejected', current_round: 0 });
});

test('undecided tracks put the candidate back under review', () => {
  assert.deepEqual(roundOneOutcome([false, null], 'rejected'), { round_0_status: 'submitted', status: 'round_0', current_round: 0 });
  assert.deepEqual(roundOneOutcome([], 'round_1'), { round_0_status: 'submitted', status: 'round_0', current_round: 0 });
});

test('never pulls a candidate back from a later stage', () => {
  assert.deepEqual(roundOneOutcome([false], 'selected'), { round_0_status: 'not_qualified' });
});
