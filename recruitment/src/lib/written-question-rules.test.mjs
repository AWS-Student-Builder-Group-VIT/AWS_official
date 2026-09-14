import test from 'node:test';
import assert from 'node:assert/strict';
import {
  questionsForSelections,
  validateWrittenCompletion,
} from './written-question-rules.mjs';

test('applies common prompts once to every selected non-Technical domain', () => {
  const questions = [
    { id: 'why', scope: 'common_non_technical' },
    { id: 'work', scope: 'common_non_technical' },
    { id: 'design-task-1', scope: 'domain', domainId: 'design' },
  ];

  const applied = questionsForSelections(questions, ['events', 'design']);

  assert.deepEqual(
    applied.map((item) => `${item.domainId}:${item.id}`),
    [
      'events:why',
      'events:work',
      'design:why',
      'design:work',
      'design:design-task-1',
    ],
  );
});

test('requires both common answers and any two Design tasks', () => {
  const questions = [
    { id: 'why', domainId: 'design', group: 'common', required: true },
    { id: 'work', domainId: 'design', group: 'common', required: true },
    { id: 'd1', domainId: 'design', group: 'design_tasks', required: false },
    { id: 'd2', domainId: 'design', group: 'design_tasks', required: false },
    { id: 'd3', domainId: 'design', group: 'design_tasks', required: false },
  ];
  const rules = [{ domainId: 'design', group: 'design_tasks', minimumAnswers: 2 }];

  const result = validateWrittenCompletion(questions, rules, {
    why: 'Because',
    work: 'Details',
    d1: 'Link',
    d2: 'Link',
  });

  assert.deepEqual(result, { valid: true, missing: [] });
});

test('reports blank required answers and an incomplete minimum-answer group', () => {
  const questions = [
    { id: 'why', domainId: 'design', group: 'common', required: true },
    { id: 'd1', domainId: 'design', group: 'design_tasks', required: false },
    { id: 'd2', domainId: 'design', group: 'design_tasks', required: false },
  ];
  const rules = [{ domainId: 'design', group: 'design_tasks', minimumAnswers: 2 }];

  assert.deepEqual(
    validateWrittenCompletion(questions, rules, { why: '  ', d1: 'Done' }),
    { valid: false, missing: ['why', 'design:design_tasks'] },
  );
});

test('deduplicates mixed selections, excludes Technical, and scopes repeated prompts by domain', () => {
  const questions = [
    { id: 'why', scope: 'common_non_technical' },
    { id: 'work', scope: 'common_non_technical' },
    { id: 'design-task-1', scope: 'domain', domainId: 'design' },
  ];

  const applied = questionsForSelections(questions, [
    'events',
    'design',
    'design',
    'finance',
    'technical',
  ]);

  assert.deepEqual(
    applied.map((item) => item.answerKey),
    [
      'events:why',
      'events:work',
      'design:why',
      'design:work',
      'design:design-task-1',
      'finance:why',
      'finance:work',
    ],
  );
});
