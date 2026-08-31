import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeTeamCode,
  pickMysteryQuestion,
  validateAdminAdjustment,
  validateGameCompletion,
} from './hackathonScoring.js';

test('normalizes team codes and rejects malformed codes', () => {
  assert.equal(normalizeTeamCode(' ab12cd '), 'AB12CD');
  assert.throws(() => normalizeTeamCode(''), /team code/i);
  assert.throws(() => normalizeTeamCode('code with spaces'), /team code/i);
});

test('accepts only official results for a scored game', () => {
  assert.deepEqual(validateGameCompletion('pacman', { official: true, completed: true, rawScore: 1200 }), {
    official: true,
    completed: true,
    rawScore: 1200,
  });
  assert.throws(() => validateGameCompletion('gunshot-roulette', {}), /not scored/i);
  assert.throws(() => validateGameCompletion('pacman', { official: false }), /official/i);
});

test('requires bounded integer admin adjustments and an audit reason', () => {
  assert.deepEqual(validateAdminAdjustment({ delta: -50, reason: 'Correct duplicate event award' }), {
    delta: -50,
    reason: 'Correct duplicate event award',
  });
  assert.throws(() => validateAdminAdjustment({ delta: 0, reason: 'none' }), /non-zero/i);
  assert.throws(() => validateAdminAdjustment({ delta: 10, reason: ' ' }), /reason/i);
  assert.throws(() => validateAdminAdjustment({ delta: 1000000, reason: 'too much' }), /range/i);
});

test('mystery questions are selected from the server-owned catalog', () => {
  const first = pickMysteryQuestion(() => 0);
  const last = pickMysteryQuestion(() => 0.999999);
  assert.equal(first.title, 'Serverless Student Portal');
  assert.equal(first.points, 150);
  assert.equal(last.title, 'Attendance via Face Recognition');
  assert.equal(last.points, 160);
  assert.notEqual(first, pickMysteryQuestion(() => 0));
});
