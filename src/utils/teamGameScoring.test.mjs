import assert from 'node:assert/strict';
import test from 'node:test';

import { completeTeamGame, normalizeGameCompletion, SCORED_TEAM_GAMES, startTeamGame } from './teamGameScoring.js';

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

test('normalizes score games into the server contract', () => {
  for (const game of ['pacman','mario-kart','asteroid-command','snake','flappy-bird','fruit-ninja']) {
    assert.deepEqual(normalizeGameCompletion(game, { score: 123 }), { official: true, completed: true, rawScore: 123 });
  }
});

test('normalizes achievement and completion games', () => {
  assert.deepEqual(normalizeGameCompletion('wordle', { solved: true }), { official: true, solved: true });
  assert.deepEqual(normalizeGameCompletion('crack-the-code', { solved: true }), { official: true, solved: true });
  assert.deepEqual(normalizeGameCompletion('detective-crime', { solved: true }), { official: true, solved: true });
  assert.deepEqual(normalizeGameCompletion('level-devil', { completedLevels: 4 }), { official: true, completedLevels: 4 });
  assert.deepEqual(normalizeGameCompletion('morse', { correctCount: 3 }), { official: true, correctCount: 3 });
  assert.deepEqual(normalizeGameCompletion('watergirl-fireboy', { highestLevel: 4, totalDeaths: 1 }), { official: true, highestLevel: 4, totalDeaths: 1 });
});

test('practice results and unscored games cannot produce a submission', () => {
  assert.equal(normalizeGameCompletion('wordle', { official: false, solved: true }), null);
  assert.equal(normalizeGameCompletion('gunshot-roulette', { score: 100 }), null);
  assert.equal(normalizeGameCompletion('hack-type', { score: 100 }), null);
  assert.equal(SCORED_TEAM_GAMES.length, 12);
});

test('public game routes do not submit without an official attempt', async () => {
  const localStorage = memoryStorage();
  const sessionStorage = memoryStorage();
  localStorage.setItem('mystery-box-hackathon-team', JSON.stringify({ code: 'TEAM12' }));
  sessionStorage.setItem('mystery-box-hackathon-token', 'token');
  global.window = { localStorage, sessionStorage, dispatchEvent() {} };

  let calls = 0;
  global.fetch = async () => { calls += 1; return { ok: true, json: async () => ({}) }; };
  const result = await completeTeamGame('wordle', null, { solved: true });

  assert.equal(result.queued, true);
  assert.equal(calls, 0);
  assert.match(localStorage.getItem('aws-team-score-outbox:v1'), /pending/);

  delete global.fetch;
  delete global.window;
});

test('queues failed completions and retries them when the same attempt resumes', async () => {
  const localStorage = memoryStorage();
  const sessionStorage = memoryStorage();
  localStorage.setItem('mystery-box-hackathon-team', JSON.stringify({ code: 'TEAM12' }));
  sessionStorage.setItem('mystery-box-hackathon-token', 'token');
  global.window = { localStorage, sessionStorage, dispatchEvent() {} };
  global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };

  global.fetch = async () => ({ ok: false, status: 503, json: async () => ({ error: 'offline' }) });
  const queued = await completeTeamGame('wordle', { enabled: true, attemptId: 'attempt-1' }, { solved: true });
  assert.equal(queued.queued, true);
  assert.match(localStorage.getItem('aws-team-score-outbox:v1'), /attempt-1/);

  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return calls === 1
      ? { ok: true, status: 200, json: async () => ({ attemptId: 'attempt-1', resumed: true }) }
      : { ok: true, status: 200, json: async () => ({ points: 20, balance: 20 }) };
  };
  localStorage.setItem('aws-builder-wordle:v1', 'stale-other-team-state');
  const attempt = await startTeamGame('wordle');
  assert.equal(attempt.attemptId, 'attempt-1');
  assert.equal(calls, 2);
  assert.equal(localStorage.getItem('aws-team-score-outbox:v1'), '{}');
  assert.equal(localStorage.getItem('aws-builder-wordle:v1'), null);

  delete global.fetch;
  delete global.window;
  delete global.CustomEvent;
});
