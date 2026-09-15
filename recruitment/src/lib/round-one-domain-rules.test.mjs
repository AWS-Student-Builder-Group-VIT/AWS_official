import test from 'node:test';
import assert from 'node:assert/strict';
import {
  domainSubmissionState,
  overallRoundOneComplete,
} from './round-one-domain-rules.mjs';

const questions = [
  { id: 'q1', domainId: 'finance', answerKey: 'finance:q1', group: 'common', required: true },
  { id: 'q2', domainId: 'finance', answerKey: 'finance:q2', group: 'common', required: true },
  { id: 'q3', domainId: 'design', answerKey: 'design:q3', group: 'design_tasks', required: false },
  { id: 'q4', domainId: 'design', answerKey: 'design:q4', group: 'design_tasks', required: false },
  { id: 'q5', domainId: 'design', answerKey: 'design:q5', group: 'design_tasks', required: false },
];

const rules = [{ domainId: 'design', group: 'design_tasks', minimumAnswers: 2 }];

test('reports not_started when a domain has no response content', () => {
  assert.equal(domainSubmissionState('finance', questions, rules, []).status, 'not_started');
});

test('reports draft when a domain has content but is not final', () => {
  const state = domainSubmissionState('finance', questions, rules, [
    { domain_id: 'finance', question_id: 'q1', answer_text: 'AWS', submission_links: [], is_final: false },
  ]);
  assert.equal(state.status, 'draft');
  assert.equal(state.valid, false);
});

test('reports submitted only when the target domain is valid and all applicable answers are final', () => {
  const state = domainSubmissionState('finance', questions, rules, [
    { domain_id: 'finance', question_id: 'q1', answer_text: 'AWS', submission_links: [], is_final: true },
    { domain_id: 'finance', question_id: 'q2', answer_text: 'Work', submission_links: [], is_final: true },
  ]);
  assert.deepEqual(state, {
    status: 'submitted',
    hasContent: true,
    valid: true,
    final: true,
    missing: [],
  });
});

test('applies grouped minimum-answer rules within one domain', () => {
  const state = domainSubmissionState('design', questions, rules, [
    { domain_id: 'design', question_id: 'q3', answer_text: 'One', submission_links: [], is_final: false },
  ]);
  assert.equal(state.valid, false);
  assert.deepEqual(state.missing, ['design:design_tasks']);
});

test('requires every written domain and the combined technical attempt', () => {
  assert.equal(overallRoundOneComplete([{ final: true }, { final: true }], true), true);
  assert.equal(overallRoundOneComplete([{ final: true }, { final: false }], true), false);
  assert.equal(overallRoundOneComplete([{ final: true }], false), false);
});
