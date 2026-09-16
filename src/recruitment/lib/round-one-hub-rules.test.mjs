import assert from 'node:assert/strict';
import test from 'node:test';

import { roundOneCards } from './round-one-hub-rules.js';

const domains = [{ id: 'd1', name: 'Publicity', slug: 'publicity', tracks: [{ id: 's1', name: 'Social Media Management' }] }];
const states = { d1: { status: 'not_started' } };

test('renders a card for every selected technical track alongside written domains', () => {
  const cards = roundOneCards(domains, states, {
    required: true,
    complete: false,
    tracks: [{ subdomainId: 's9', name: 'Web Development', status: 'not_started' }],
  });
  assert.equal(cards.length, 2, 'one technical card + one written card');
  const technical = cards.find((card) => card.kind === 'technical');
  assert.equal(technical.title, 'Web Development');
  assert.equal(technical.subdomainId, 's9');
  assert.equal(technical.status, 'not_started');
});

test('each technical track carries its own status', () => {
  const cards = roundOneCards([], {}, {
    required: true,
    complete: false,
    tracks: [
      { subdomainId: 'web', name: 'Web Development', status: 'submitted' },
      { subdomainId: 'app', name: 'App Development', status: 'not_started' },
    ],
  });
  assert.deepEqual(
    cards.map((card) => [card.title, card.status]),
    [['Web Development', 'submitted'], ['App Development', 'not_started']],
    'submitting one track must not mark the other submitted',
  );
});

test('an in-progress track reads as a draft', () => {
  const [card] = roundOneCards([], {}, {
    required: true, complete: false,
    tracks: [{ subdomainId: 'web', name: 'Web Development', status: 'in_progress' }],
  });
  assert.equal(card.status, 'draft');
});

test('marks unassessed technical tracks as not_assessed even when assessment is complete', () => {
  const cards = roundOneCards([], {}, {
    required: true,
    complete: false,
    status: 'submitted',
    tracks: [
      { subdomainId: 's9', name: 'Web Development', status: 'submitted', assessed: true },
      { subdomainId: 's10', name: 'App Development', status: 'not_assessed', assessed: false },
    ],
  });
  assert.equal(cards[0].status, 'submitted');
  assert.equal(cards[1].status, 'not_assessed');
  assert.equal(cards[1].subtitle, 'Not included in your submitted assessment');
});

test('omits technical cards when no technical track is selected', () => {
  const cards = roundOneCards(domains, states, { required: false, complete: true, tracks: [] });
  assert.deepEqual(cards.map((card) => card.kind), ['written']);
});
