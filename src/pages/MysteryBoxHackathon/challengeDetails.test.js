import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChallengeDetails } from './challengeDetails.js';

test('normalizes a detailed challenge for dashboard rendering', () => {
  const result = normalizeChallengeDetails({
    title: 'Emergency Green-Corridor Planner',
    desc: 'Detailed participant brief.',
    technicalScope: ['Use simulated traffic data.', 'Explain route choice.'],
    deliverables: ['Route map', 'Incident controls'],
    tags: ['Lambda', 'DynamoDB', 'API Gateway'],
  });

  assert.deepEqual(result, {
    description: 'Detailed participant brief.',
    technicalScope: ['Use simulated traffic data.', 'Explain route choice.'],
    deliverables: ['Route map', 'Incident controls'],
    awsServices: ['Lambda', 'DynamoDB', 'API Gateway'],
  });
});

test('keeps legacy challenge snapshots readable while Neon is being enriched', () => {
  assert.deepEqual(normalizeChallengeDetails({ desc: 'Legacy summary.' }), {
    description: 'Legacy summary.',
    technicalScope: [],
    deliverables: [],
    awsServices: [],
  });
});
