import assert from 'node:assert/strict';
import test from 'node:test';

import { registerHackathonScoringRoutes } from './hackathonScoring.js';

function captureRoutes() {
  const routes = new Map();
  const app = {
    get(path, ...handlers) { routes.set(`GET ${path}`, handlers.at(-1)); },
    post(path, ...handlers) { routes.set(`POST ${path}`, handlers.at(-1)); },
  };
  return { app, routes };
}

function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test('participant topic API returns forty public challenges and no chaos details', async () => {
  const { app, routes } = captureRoutes();
  const client = {
    async query() { return { rows: [{ value: null }] }; },
    release() {},
  };
  registerHackathonScoringRoutes(app, {
    pool: { connect: async () => client },
    hackathonAuth() {},
    adminMiddleware() {},
  });
  const res = responseRecorder();

  await routes.get('GET /api/mystery-box/topics')({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.topics.length, 40);
  assert.equal(res.payload.topicSwapCost, 100);
  assert.equal(res.payload.chaosRevealed, false);
  assert.ok(res.payload.topics.every((challenge) => !('chaosTwist' in challenge) && !('difficulty' in challenge)));
});
