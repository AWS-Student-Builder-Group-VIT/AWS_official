export const SCORED_TEAM_GAMES = Object.freeze([
  'pacman', 'mario-kart', 'asteroid-command', 'snake', 'flappy-bird', 'watergirl-fireboy',
  'fruit-ninja', 'wordle', 'crack-the-code', 'detective-crime', 'level-devil', 'morse',
]);

const TEAM_STORAGE_KEY = 'mystery-box-hackathon-team';
const TOKEN_STORAGE_KEY = 'mystery-box-hackathon-token';
const OUTBOX_STORAGE_KEY = 'aws-team-score-outbox:v1';
const BINDING_STORAGE_PREFIX = 'aws-team-game-binding:v1:';
const SCORE_GAMES = new Set(['pacman','mario-kart','asteroid-command','snake','flappy-bird','fruit-ninja']);
const PERSISTED_GAME_KEYS = Object.freeze({
  wordle: 'aws-builder-wordle:v1',
  morse: 'aws-morse:v1',
  'level-devil': 'aws-level-devil:v1',
});

export function normalizeGameCompletion(gameSlug, payload = {}) {
  if (!SCORED_TEAM_GAMES.includes(gameSlug) || payload?.official === false) return null;
  if (SCORE_GAMES.has(gameSlug)) return { official: true, completed: true, rawScore: Number(payload.score) || 0 };
  if (['wordle','crack-the-code','detective-crime'].includes(gameSlug)) return { official: true, solved: payload.solved === true };
  if (gameSlug === 'level-devil') return { official: true, completedLevels: Number(payload.completedLevels) || 0 };
  if (gameSlug === 'morse') return { official: true, correctCount: Number(payload.correctCount) || 0 };
  if (gameSlug === 'watergirl-fireboy') return { official: true, highestLevel: Number(payload.highestLevel) || 0, totalDeaths: Number(payload.totalDeaths) || 0 };
  return null;
}

export function buildOfficialGameReceipt(gameSlug, response = {}) {
  const confirmed = response.submitted === true;
  return {
    gameSlug,
    confirmed,
    queued: response.queued === true,
    points: confirmed ? Number(response.points || 0) : 0,
    balance: confirmed && Number.isFinite(Number(response.balance)) ? Number(response.balance) : null,
    usedAttempts: confirmed && Number.isFinite(Number(response.usage?.usedAttempts)) ? Number(response.usage.usedAttempts) : null,
    remainingAttempts: confirmed && Number.isFinite(Number(response.usage?.remainingAttempts)) ? Number(response.usage.remainingAttempts) : null,
    error: String(response.error || ''),
  };
}

function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const team = JSON.parse(window.localStorage.getItem(TEAM_STORAGE_KEY) || 'null');
    return token && team?.code ? { token, code: team.code } : null;
  } catch {
    return null;
  }
}

function readOutbox() {
  try { return JSON.parse(window.localStorage.getItem(OUTBOX_STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function writeOutbox(outbox) {
  window.localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(outbox));
}

function setOutboxEntry(key, value) {
  const outbox = readOutbox();
  outbox[key] = value;
  writeOutbox(outbox);
}

function removeOutboxEntry(key) {
  const outbox = readOutbox();
  delete outbox[key];
  writeOutbox(outbox);
}

function preparePersistedGame(gameSlug, teamCode, attemptId) {
  const gameStateKey = PERSISTED_GAME_KEYS[gameSlug];
  if (!gameStateKey) return;
  const bindingKey = `${BINDING_STORAGE_PREFIX}${gameSlug}`;
  const binding = `${teamCode}:${attemptId}`;
  if (window.localStorage.getItem(bindingKey) !== binding) {
    window.localStorage.removeItem(gameStateKey);
    window.localStorage.setItem(bindingKey, binding);
  }
}

async function request(path, session, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Game scoring request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function submitNormalizedResult(gameSlug, attempt, session, result) {
  const outboxKey = `${session.code}:${gameSlug}:${attempt.attemptId}`;
  setOutboxEntry(outboxKey, { result, queuedAt: Date.now() });
  try {
    const data = await request(`/api/mystery-box/games/${gameSlug}/complete`, session, {
      method: 'POST',
      body: JSON.stringify({ code: session.code, attemptId: attempt.attemptId, result }),
    });
    removeOutboxEntry(outboxKey);
    window.dispatchEvent(new CustomEvent('aws-team-score:updated', { detail: { gameSlug, ...data } }));
    return { submitted: true, ...data };
  } catch (error) {
    return { submitted: false, queued: true, error: error.message };
  }
}

export async function startTeamGame(gameSlug) {
  if (!SCORED_TEAM_GAMES.includes(gameSlug)) return { enabled: false };
  const session = getSession();
  if (!session) return { enabled: false, reason: 'team-session-required' };
  try {
    const data = await request(`/api/mystery-box/games/${gameSlug}/start`, session, {
      method: 'POST',
      body: JSON.stringify({ code: session.code }),
    });
    const attempt = { enabled: true, teamCode: session.code, attemptId: data.attemptId, resumed: data.resumed };
    preparePersistedGame(gameSlug, session.code, data.attemptId);
    const attemptPending = readOutbox()[`${session.code}:${gameSlug}:${data.attemptId}`];
    if (attemptPending?.result) {
      const retried = await submitNormalizedResult(gameSlug, attempt, session, attemptPending.result);
      if (retried.submitted) return { enabled: false, locked: true, completed: true, reason: 'game-already-played', receipt: retried };
      return {
        ...attempt,
        enabled: false,
        pendingSubmission: true,
        receipt: retried,
        retrySubmission: () => submitNormalizedResult(gameSlug, attempt, session, attemptPending.result),
      };
    }
    const pendingKey = `${session.code}:${gameSlug}:pending`;
    const pending = readOutbox()[pendingKey];
    if (pending?.payload) {
      removeOutboxEntry(pendingKey);
      const retried = await completeTeamGame(gameSlug, attempt, pending.payload);
      if (retried.submitted) return { enabled: false, locked: true, completed: true, reason: 'game-already-played', receipt: retried };
      return {
        ...attempt,
        enabled: false,
        pendingSubmission: true,
        receipt: retried,
        retrySubmission: () => completeTeamGame(gameSlug, attempt, pending.payload),
      };
    }
    return attempt;
  } catch (error) {
    if (error.status === 409 && error.data?.reason === 'game-already-played' && error.data?.attempt) {
      removeOutboxEntry(`${session.code}:${gameSlug}:pending`);
      return {
        enabled: false,
        locked: true,
        completed: true,
        reason: error.data.reason,
        result: error.data.attempt,
        receipt: {
          submitted: true,
          duplicate: true,
          points: Number(error.data.attempt.points || 0),
          balance: Number(error.data.balance || 0),
          usage: error.data.usage,
          attempt: error.data.attempt,
        },
      };
    }
    return {
      enabled: false,
      error: error.message,
      reason: error.data?.reason,
      attempt: error.data?.attempt,
      usage: error.data?.usage,
      balance: error.data?.balance,
    };
  }
}

export async function completeTeamGame(gameSlug, attempt, payload) {
  const result = normalizeGameCompletion(gameSlug, payload);
  const session = getSession();
  if (!result || !session) return { submitted: false };
  if (!attempt?.enabled || !attempt.attemptId) {
    setOutboxEntry(`${session.code}:${gameSlug}:pending`, { payload, queuedAt: Date.now() });
    return { submitted: false, queued: true };
  }
  return submitNormalizedResult(gameSlug, attempt, session, result);
}
