import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTrackSelection } from './selection-rules.mjs';

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
