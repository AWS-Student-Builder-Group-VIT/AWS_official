import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfilePayload } from './profile-schema.mjs';

const validProfile = {
  registration_number: '22BCE1234',
  phone: '9876543210',
  year: 3,
  branch: 'CSE',
};

test('accepts the academic-only profile payload', () => {
  assert.equal(validateProfilePayload(validProfile).success, true);
});

test('does not require or retain online-presence fields', () => {
  const result = validateProfilePayload({
    ...validProfile,
    github_url: 'https://github.com/example',
    linkedin_url: 'https://linkedin.com/in/example',
    portfolio_url: 'https://example.com',
  });

  assert.equal(result.success, true);
  assert.equal('github_url' in result.data, false);
  assert.equal('linkedin_url' in result.data, false);
  assert.equal('portfolio_url' in result.data, false);
});

test('rejects an incomplete academic profile', () => {
  const result = validateProfilePayload({
    registration_number: '123',
    phone: '555',
    year: 6,
    branch: '',
  });

  assert.equal(result.success, false);
});
