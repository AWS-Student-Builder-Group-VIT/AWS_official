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
import * as scoring from './hackathonScoring.js';

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

test('team game usage counts distinct non-void attempts and reports played games', () => {
  const attempts = [
    { game_slug: 'wordle', status: 'completed', slot_number: 1 },
    { game_slug: 'wordle', status: 'completed', slot_number: 2, voided_at: '2026-09-01T00:00:00Z' },
    { game_slug: 'morse', status: 'active', id: 'active-1' },
  ];
  assert.deepEqual(summarizeTeamGameUsage({ attempts, maxAttempts: 5 }), {
    maxAttempts: 5,
    usedAttempts: 2,
    remainingAttempts: 3,
    completedAttempts: 1,
    playedGameSlugs: ['wordle', 'morse'],
    activeAttempt: attempts[2],
  });
});

test('official game starts reject repeats, another active game, and the sixth distinct game', () => {
  const completed = [{ game_slug: 'wordle', status: 'completed', slot_number: 1 }];
  assert.deepEqual(canStartOfficialGame({ attempts: completed, maxAttempts: 5, gamesEnabled: true, gameSlug: 'wordle' }), {
    allowed: false,
    reason: 'game-already-played',
    attempt: completed[0],
  });
  const active = [...completed, { id: 'active-1', game_slug: 'morse', status: 'active', slot_number: 2 }];
  assert.deepEqual(canStartOfficialGame({ attempts: active, maxAttempts: 5, gamesEnabled: true, gameSlug: 'pacman' }), {
    allowed: false,
    reason: 'active-attempt-exists',
    attempt: active[1],
  });
  const fiveDistinct = ['wordle', 'morse', 'pacman', 'snake', 'fruit-ninja'].map((game_slug, index) => ({
    game_slug,
    status: 'completed',
    slot_number: index + 1,
  }));
  assert.deepEqual(canStartOfficialGame({ attempts: fiveDistinct, maxAttempts: 5, gamesEnabled: true, gameSlug: 'flappy-bird' }), {
    allowed: false,
    reason: 'game-limit-reached',
  });
  assert.deepEqual(canStartOfficialGame({ attempts: [], maxAttempts: 5, gamesEnabled: false, gameSlug: 'wordle' }), {
    allowed: false,
    reason: 'game-mode-disabled',
  });
});

test('allocates the lowest slot freed by a voided attempt', () => {
  assert.equal(scoring.findLowestAvailableSlot([
    { slot_number: 1, status: 'completed' },
    { slot_number: 2, status: 'completed', voided_at: '2026-09-01T00:00:00Z' },
    { slot_number: 3, status: 'completed' },
  ], 5), 2);
  assert.equal(scoring.findLowestAvailableSlot([], 0), null);
});

test('admin game limits are constrained to the twelve scored games', () => {
  assert.equal(scoring.validateAdminGameLimit(0), 0);
  assert.equal(scoring.validateAdminGameLimit(12), 12);
  assert.throws(() => scoring.validateAdminGameLimit(13), /0 to 12/i);
  assert.throws(() => scoring.validateAdminGameLimit(1.5), /0 to 12/i);
});

test('game errors preserve structured reason, attempt, usage, and balance', () => {
  const error = new Error('Resume the active game');
  error.reason = 'active-attempt-exists';
  error.attempt = { id: 'attempt-1' };
  error.usage = { remainingAttempts: 4 };
  error.balance = 110;
  assert.deepEqual(scoring.buildGameErrorPayload(error), {
    error: 'Resume the active game',
    reason: 'active-attempt-exists',
    attempt: { id: 'attempt-1' },
    usage: { remainingAttempts: 4 },
    balance: 110,
  });
});

test('attempt reset requires a meaningful audit reason', () => {
  assert.equal(scoring.validateAttemptResetReason('Duplicate award correction'), 'Duplicate award correction');
  assert.throws(() => scoring.validateAttemptResetReason('bad'), /audit reason/i);
});

test('game mode validation accepts explicit admin actions only', () => {
  assert.equal(validateGameMode({ enabled: true }), true);
  assert.equal(validateGameMode({ enabled: false }), false);
  assert.throws(() => validateGameMode({ enabled: 'true' }), /boolean/i);
});

test('topic swap quotes price upgrades, same-tier moves, and downgrades', () => {
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
  assert.deepEqual(getTopicSwapQuote({ currentTopic: current, targetTopic: { id: 'med-1', difficulty: 'Medium' }, teamPoints: 75, hasChangedQuestion: false }), { cost: 75, allowed: true });
  assert.deepEqual(getTopicSwapQuote({ currentTopic: current, targetTopic: { id: 'hard-1', difficulty: 'Hard' }, teamPoints: 50, hasChangedQuestion: false }), { cost: 50, allowed: true });
  assert.deepEqual(getTopicSwapQuote({ currentTopic: { id: 'med-1', difficulty: 'Medium' }, targetTopic: { id: 'hard-1', difficulty: 'Hard' }, teamPoints: 50, hasChangedQuestion: false }), { cost: 50, allowed: true });
  assert.deepEqual(getTopicSwapQuote({ currentTopic: { id: 'hard-1', difficulty: 'Hard' }, targetTopic: { id: 'med-1', difficulty: 'Medium' }, teamPoints: 125, hasChangedQuestion: false }), { cost: 125, allowed: true });
  assert.deepEqual(getTopicSwapQuote({ currentTopic: { id: 'hard-1', difficulty: 'Hard' }, targetTopic: current, teamPoints: 150, hasChangedQuestion: false }), { cost: 150, allowed: true });
  assert.deepEqual(getTopicSwapQuote({ currentTopic: { id: 'med-1', difficulty: 'Medium' }, targetTopic: current, teamPoints: 149, hasChangedQuestion: false }), {
    cost: 150,
    allowed: false,
    reason: 'insufficient-points',
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
