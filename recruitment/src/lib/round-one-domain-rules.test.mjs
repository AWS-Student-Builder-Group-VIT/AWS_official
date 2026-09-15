import test from 'node:test';
import assert from 'node:assert/strict';
import {
  domainSubmissionState,
  overallRoundOneComplete,
  validateDomainWriteTarget,
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

const domains = [
  { id: 'finance', slug: 'finance' },
  { id: 'design', slug: 'design' },
  { id: 'technical', slug: 'technical' },
];

test('accepts answers only for the selected non-Technical target domain', () => {
  assert.deepEqual(validateDomainWriteTarget({
    domainId: 'finance',
    domains,
    questions,
    answers: [{ domainId: 'finance', questionId: 'q1' }],
    domainFinal: false,
  }), { valid: true });
});

test('rejects a cross-domain answer', () => {
  assert.equal(validateDomainWriteTarget({
    domainId: 'finance',
    domains,
    questions,
    answers: [{ domainId: 'design', questionId: 'q3' }],
    domainFinal: false,
  }).code, 'CROSS_DOMAIN_ANSWER');
});

test('rejects an answer whose question is outside the target domain', () => {
  assert.equal(validateDomainWriteTarget({
    domainId: 'finance',
    domains,
    questions,
    answers: [{ domainId: 'finance', questionId: 'q3' }],
    domainFinal: false,
  }).code, 'QUESTION_NOT_APPLICABLE');
});

test('rejects Technical, unselected, and already-final targets', () => {
  assert.equal(validateDomainWriteTarget({
    domainId: 'technical', domains, questions, answers: [], domainFinal: false,
  }).code, 'TECHNICAL_DOMAIN_NOT_WRITABLE');
  assert.equal(validateDomainWriteTarget({
    domainId: 'outreach', domains, questions, answers: [], domainFinal: false,
  }).code, 'DOMAIN_NOT_SELECTED');
  assert.equal(validateDomainWriteTarget({
    domainId: 'finance', domains, questions, answers: [], domainFinal: true,
  }).code, 'DOMAIN_ALREADY_SUBMITTED');
});
