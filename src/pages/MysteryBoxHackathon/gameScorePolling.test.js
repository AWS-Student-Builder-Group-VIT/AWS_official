import assert from 'node:assert/strict';
import test from 'node:test';
import { startGameScorePolling } from './gameScorePolling.js';

function createEventTarget(initial = {}) {
  const listeners = new Map();
  return {
    ...initial,
    addEventListener(type, listener) {
      const handlers = listeners.get(type) || new Set();
      handlers.add(listener);
      listeners.set(type, handlers);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type) {
      for (const listener of listeners.get(type) || []) listener();
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    },
  };
}

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

test('polling refreshes immediately, periodically, on focus, and when the page becomes visible', async () => {
  assert.equal(typeof startGameScorePolling, 'function');

  const browser = createEventTarget();
  const page = createEventTarget({ visibilityState: 'hidden' });
  let intervalCallback;
  let requestedInterval;
  let requestCount = 0;
  const received = [];

  const stop = startGameScorePolling({
    loadScores: async () => ({ ok: true, gamesEnabled: requestCount++ > 0 }),
    onSuccess: (response) => received.push(response.gamesEnabled),
    windowTarget: browser,
    documentTarget: page,
    setIntervalFn: (callback, milliseconds) => {
      intervalCallback = callback;
      requestedInterval = milliseconds;
      return 41;
    },
    clearIntervalFn: () => {},
  });

  await flushPromises();
  assert.deepEqual(received, [false]);
  assert.equal(requestedInterval, 3000);

  intervalCallback();
  await flushPromises();
  browser.dispatch('focus');
  await flushPromises();
  page.dispatch('visibilitychange');
  await flushPromises();
  page.visibilityState = 'visible';
  page.dispatch('visibilitychange');
  await flushPromises();

  assert.deepEqual(received, [false, true, true, true]);
  stop();
});

test('polling retains the last successful state on failure and removes every listener on cleanup', async () => {
  assert.equal(typeof startGameScorePolling, 'function');

  const browser = createEventTarget();
  const page = createEventTarget({ visibilityState: 'visible' });
  let intervalCallback;
  let clearedInterval;
  let shouldFail = false;
  const received = [];

  const stop = startGameScorePolling({
    loadScores: async () => shouldFail ? { ok: false, error: 'temporary failure' } : { ok: true, gamesEnabled: true },
    onSuccess: (response) => received.push(response.gamesEnabled),
    windowTarget: browser,
    documentTarget: page,
    setIntervalFn: (callback) => {
      intervalCallback = callback;
      return 77;
    },
    clearIntervalFn: (id) => { clearedInterval = id; },
  });

  await flushPromises();
  shouldFail = true;
  intervalCallback();
  await flushPromises();
  assert.deepEqual(received, [true]);

  stop();
  assert.equal(clearedInterval, 77);
  assert.equal(browser.listenerCount('focus'), 0);
  assert.equal(browser.listenerCount('aws-team-score:updated'), 0);
  assert.equal(page.listenerCount('visibilitychange'), 0);

  browser.dispatch('focus');
  page.dispatch('visibilitychange');
  await flushPromises();
  assert.deepEqual(received, [true]);
});
