import assert from 'node:assert/strict';
import test from 'node:test';

import { roundOneCards } from './round-one-hub-rules.js';

const domains = [{ id: 'd1', name: 'Publicity', slug: 'publicity', tracks: [{ id: 's1', name: 'Social Media Management' }] }];
const states = { d1: { status: 'not_started' } };

test('renders a card for every selected technical track alongside written domains', () => {
  const cards = roundOneCards(domains, states, {
    required: true,
    complete: false,
    status: 'not_started',
    tracks: [{ subdomainId: 's9', name: 'Web Development' }],
  });
  assert.equal(cards.length, 2, 'one technical card + one written card');
  const technical = cards.find((card) => card.kind === 'technical');
  assert.equal(technical.title, 'Web Development');
  assert.equal(technical.subdomainId, 's9');
  assert.equal(technical.status, 'not_started');
});

test('marks technical cards submitted once the assessment is complete', () => {
  const [card] = roundOneCards([], {}, {
    required: true, complete: true, status: 'submitted',
    tracks: [{ subdomainId: 's9', name: 'Web Development' }],
  });
  assert.equal(card.status, 'submitted');
});

test('omits technical cards when no technical track is selected', () => {
  const cards = roundOneCards(domains, states, { required: false, complete: true, status: 'not_required', tracks: [] });
  assert.deepEqual(cards.map((card) => card.kind), ['written']);
});
