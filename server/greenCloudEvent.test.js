import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { initializeCloudIntelligence, registerCloudIntelligenceRoutes, evaluateQuizSubmission } from './cloudIntelligence.js';
import { QUIZ_EVENT_TITLE, QUIZ_DURATION_SECONDS, QUIZ_SECONDS_PER_QUESTION } from '../shared/quizEvent.js';

const paper = JSON.parse(await readFile(new URL('./green_cloud_seed.json', import.meta.url), 'utf8'));

test('Green Cloud paper contains all twenty supplied answer keys and a fifteen-minute window', () => {
  assert.equal(paper.length, 20);
  assert.equal(new Set(paper.map(q => q.id)).size, 20);
  assert.deepEqual(paper.map(q => q.options.indexOf(q.correct_answer)), [3, 0, 1, 2, 1, 0, 3, 1, 1, 0, 1, 2, 1, 0, 1, 0, 1, 0, 1, 1]);
  assert.ok(paper.every(q => q.options.length === 4 && q.question_type === 'mcq'));
  assert.equal(QUIZ_DURATION_SECONDS, 900);
  assert.equal(paper.length * QUIZ_SECONDS_PER_QUESTION, 900);
});

test('Green Cloud scoring uses 900 seconds and preserves the existing correctness/speed weights', () => {
  const answers = Object.fromEntries(paper.map(q => [q.id, q.correct_answer]));
  const result = evaluateQuizSubmission({ questions: paper, userAnswers: answers, timeTakenSeconds: 450 });
  assert.equal(result.correctCount, 20);
  assert.equal(result.totalMarks, 20);
  assert.equal(result.score, 16);
  assert.equal(evaluateQuizSubmission({ questions: paper, userAnswers: answers, timeTakenSeconds: 900 }).score, 12);
  assert.equal(evaluateQuizSubmission({ questions: paper, userAnswers: {}, timeTakenSeconds: 0 }).score, 0);
});

test('new event is isolated, seeded once, frozen by default, and hides answers until result release', async () => {
  const db = new PGlite();
  const pool = { query: (...args) => db.query(...args), connect: async () => ({ query: (...args) => db.query(...args), release() {} }) };
  try {
    await db.exec('CREATE TABLE users (id SERIAL PRIMARY KEY); CREATE TABLE cloud_intelligence_submissions (participant_email TEXT); INSERT INTO cloud_intelligence_submissions VALUES (\'returning@example.com\');');
    await initializeCloudIntelligence(pool);
    await initializeCloudIntelligence(pool);
    assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM green_cloud_questions')).rows[0].count, 20);
    assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM cloud_intelligence_submissions')).rows[0].count, 1);

    const routes = new Map();
    const app = Object.fromEntries(['get', 'post', 'put', 'delete'].map(method => [method, (url, ...handlers) => routes.set(`${method} ${url}`, handlers)]));
    const adminMiddleware = () => {};
    registerCloudIntelligenceRoutes(app, { pool, adminMiddleware });
    const request = async (method, url, req = {}) => {
      let status = 200;
      let body;
      const res = { status(value) { status = value; return this; }, json(value) { body = value; return this; } };
      await routes.get(`${method} ${url}`).at(-1)(req, res);
      return { status, body };
    };
    const info = await request('get', '/api/cloud-intelligence/quiz-info');
    assert.equal(info.body.title, QUIZ_EVENT_TITLE);
    assert.equal(info.body.totalQuestions, 20);
    assert.equal(info.body.durationMinutes, 15);
    assert.equal(info.body.allottedSeconds, 900);
    assert.equal(info.body.isFrozen, true);
    assert.equal((await request('get', '/api/cloud-intelligence/questions', { query: {} })).status, 403);
    assert.equal(routes.get('post /api/admin/cloud-intelligence/freeze')[0], adminMiddleware);
    await request('post', '/api/admin/cloud-intelligence/freeze', { body: { status: 'unfrozen' } });
    const questions = await request('get', '/api/cloud-intelligence/questions', { query: { email: 'returning@example.com' } });
    assert.equal(questions.body.questions.length, 20);
    assert.equal(questions.body.secondsPerQuestion, 45);
    assert.equal(questions.body.allottedSeconds, 900);
    assert.ok(questions.body.questions.every(q => !Object.hasOwn(q, 'correct_answer')));
    const submitted = await request('post', '/api/cloud-intelligence/submit', { body: {
      participantName: 'Test Participant', participantEmail: 'returning@example.com', answers: Object.fromEntries(paper.map(q => [q.id, q.correct_answer])),
    } });
    assert.equal(submitted.status, 201);
    assert.equal(submitted.body.submission.resultsReleased, false);
    assert.equal(submitted.body.submission.score, undefined);
    assert.deepEqual(submitted.body.review, []);
    assert.equal((await db.query('SELECT total_allotted_seconds FROM green_cloud_submissions')).rows[0].total_allotted_seconds, 900);
    assert.equal((await request('get', '/api/cloud-intelligence/submission/:email', { params: { email: 'returning@example.com' } })).body.hasSubmitted, true);
  } finally {
    await db.close();
  }
});
