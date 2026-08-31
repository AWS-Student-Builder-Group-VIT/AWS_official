import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canStartOfficialGame,
  getTopicSwapQuote,
  normalizeTeamCode,
  pickMysteryQuestion,
  summarizeTeamGameUsage,
  validateAdminAdjustment,
  validateGameCompletion,
  validateGameMode,
} from './hackathonScoring.js';

test('normalizes team codes and rejects malformed codes', () => {
  assert.equal(normalizeTeamCode(' ab12cd '), 'AB12CD');
  assert.equal(normalizeTeamCode(' #shijzu '), 'SHIJZU');
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
  assert.equal(first.title, 'Cloud Resume Builder with CI/CD');
  assert.equal(first.points, 100);
  assert.equal(last.title, 'Autonomous Cloud Security Incident Responder');
  assert.equal(last.points, 180);
  assert.notEqual(first, pickMysteryQuestion(() => 0));
});

test('team game usage allows repeat games but blocks starts beyond max slots', () => {
  const attempts = [
    { game_slug: 'wordle', status: 'completed' },
    { game_slug: 'wordle', status: 'completed' },
    { game_slug: 'morse', status: 'active', id: 'active-1' },
  ];
  assert.deepEqual(summarizeTeamGameUsage({ attempts, maxAttempts: 5 }), {
    maxAttempts: 5,
    usedAttempts: 3,
    remainingAttempts: 2,
    completedAttempts: 2,
    activeAttempt: attempts[2],
  });
  assert.deepEqual(canStartOfficialGame({ attempts, maxAttempts: 5, gamesEnabled: true }).allowed, true);
  assert.deepEqual(canStartOfficialGame({ attempts: attempts.map((attempt) => ({ ...attempt, status: 'completed' })).concat([{ status: 'completed' }, { status: 'completed' }]), maxAttempts: 5, gamesEnabled: true }), {
    allowed: false,
    reason: 'game-limit-reached',
  });
  assert.deepEqual(canStartOfficialGame({ attempts, maxAttempts: 5, gamesEnabled: false }), {
    allowed: false,
    reason: 'game-mode-disabled',
  });
  assert.equal(summarizeTeamGameUsage({ attempts: [], maxAttempts: 0 }).maxAttempts, 0);
});

test('game mode validation accepts explicit admin actions only', () => {
  assert.equal(validateGameMode({ enabled: true }), true);
  assert.equal(validateGameMode({ enabled: false }), false);
  assert.throws(() => validateGameMode({ enabled: 'true' }), /boolean/i);
});

test('topic swap quotes enforce same-tier one-time leader purchase', () => {
  const current = { id: 'easy-1', difficulty: 'Easy', points: 100 };
  const target = { id: 'easy-2', difficulty: 'Easy', points: 100 };
  assert.deepEqual(getTopicSwapQuote({ currentTopic: current, targetTopic: target, teamPoints: 100, hasChangedQuestion: false }), {
    cost: 100,
    allowed: true,
  });
  assert.deepEqual(getTopicSwapQuote({ currentTopic: current, targetTopic: target, teamPoints: 99, hasChangedQuestion: false }), {
    cost: 100,
    allowed: false,
    reason: 'insufficient-points',
  });
  assert.deepEqual(getTopicSwapQuote({ currentTopic: current, targetTopic: { id: 'med-1', difficulty: 'Medium' }, teamPoints: 200, hasChangedQuestion: false }), {
    cost: 100,
    allowed: false,
    reason: 'same-difficulty-required',
  });
  assert.deepEqual(getTopicSwapQuote({ currentTopic: current, targetTopic: current, teamPoints: 200, hasChangedQuestion: false }), {
    cost: 100,
    allowed: false,
    reason: 'same-topic',
  });
  assert.deepEqual(getTopicSwapQuote({ currentTopic: current, targetTopic: target, teamPoints: 200, hasChangedQuestion: true }), {
    cost: 100,
    allowed: false,
    reason: 'topic-swap-used',
  });
});
