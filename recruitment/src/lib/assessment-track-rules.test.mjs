import test from 'node:test';
import assert from 'node:assert/strict';
import { technicalAssessmentTracks } from './assessment-track-rules.mjs';

test('filters non-Technical choices from scored assessment', () => {
  const choices = [
    { id: 'web', domainSlug: 'technical' },
    { id: 'design', domainSlug: 'design' },
    { id: 'finance', domainSlug: 'finance' },
  ];

  assert.deepEqual(technicalAssessmentTracks(choices).map((item) => item.id), ['web']);
});

test('preserves the selected order of two Technical tracks', () => {
  const choices = [
    { id: 'events', domainSlug: 'events' },
    { id: 'ai-ml', domainSlug: 'technical' },
    { id: 'web', domainSlug: 'technical' },
  ];

  assert.deepEqual(technicalAssessmentTracks(choices).map((item) => item.id), ['ai-ml', 'web']);
});
