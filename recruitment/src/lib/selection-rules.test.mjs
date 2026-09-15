import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleTrackSelection, validateTrackSelection } from './selection-rules.mjs';

const track = (id, domainSlug) => ({ id, domainId: domainSlug, domainSlug });

test('accepts unlimited non-Technical selections', () => {
  const result = validateTrackSelection([
    track('events-1', 'events'),
    track('events-2', 'events'),
    track('design-1', 'design'),
    track('publicity-1', 'publicity'),
    track('outreach', 'outreach'),
    track('finance', 'finance'),
  ]);

  assert.deepEqual(result, { valid: true });
});

test('accepts two Technical selections and rejects the third', () => {
  assert.equal(
    validateTrackSelection([track('web', 'technical'), track('app', 'technical')]).valid,
    true,
  );
  assert.deepEqual(
    validateTrackSelection([
      track('web', 'technical'),
      track('app', 'technical'),
      track('ai-ml', 'technical'),
    ]),
    { valid: false, code: 'TECHNICAL_SELECTION_LIMIT' },
  );
});

test('requires at least one selection and rejects duplicate ids', () => {
  assert.equal(validateTrackSelection([]).code, 'SELECTION_REQUIRED');
  assert.equal(
    validateTrackSelection([track('web', 'technical'), track('web', 'technical')]).code,
    'DUPLICATE_SELECTION',
  );
});

test('toggles a whole-domain choice and preserves remaining order on removal', () => {
  const tracks = [
    track('web', 'technical'),
    track('finance-whole', 'finance'),
    track('events-ops', 'events'),
  ];

  assert.deepEqual(toggleTrackSelection(['web'], tracks[1], tracks), {
    ids: ['web', 'finance-whole'],
  });
  assert.deepEqual(toggleTrackSelection(['web', 'finance-whole', 'events-ops'], tracks[1], tracks), {
    ids: ['web', 'events-ops'],
  });
});

test('rejects a third Technical choice without discarding current choices', () => {
  const tracks = [
    track('web', 'technical'),
    track('app', 'technical'),
    track('ai-ml', 'technical'),
  ];

  assert.deepEqual(toggleTrackSelection(['web', 'app'], tracks[2], tracks), {
    ids: ['web', 'app'],
    error: 'TECHNICAL_SELECTION_LIMIT',
  });
});
