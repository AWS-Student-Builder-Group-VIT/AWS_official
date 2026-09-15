import test from 'node:test';
import assert from 'node:assert/strict';
import { roundOneCards } from './round-one-hub-rules.mjs';

test('creates one written card per non-Technical domain and one card per Technical track', () => {
  const cards = roundOneCards([
    {
      id: 'finance',
      name: 'Finance',
      slug: 'finance',
      tracks: [{ id: 'finance-whole', name: 'Finance' }],
    },
    {
      id: 'technical',
      name: 'Technical',
      slug: 'technical',
      tracks: [
        { id: 'web', name: 'Web Development' },
        { id: 'ai', name: 'AI / ML' },
      ],
    },
  ], { finance: { status: 'draft' } }, { complete: false });

  assert.deepEqual(cards.map(({ kind, title, status }) => ({ kind, title, status })), [
    { kind: 'written', title: 'Finance', status: 'draft' },
    { kind: 'technical', title: 'Web Development', status: 'not_started' },
    { kind: 'technical', title: 'AI / ML', status: 'not_started' },
  ]);
});

test('shares submitted Technical status across its subdomain entry cards', () => {
  const cards = roundOneCards([
    {
      id: 'technical',
      name: 'Technical',
      slug: 'technical',
      tracks: [{ id: 'web', name: 'Web Development' }],
    },
  ], {}, { complete: true });

  assert.equal(cards[0].status, 'submitted');
});

test('shows a combined in-progress Technical attempt as draft on every track card', () => {
  const cards = roundOneCards([
    {
      id: 'technical',
      name: 'Technical',
      slug: 'technical',
      tracks: [{ id: 'web', name: 'Web Development' }, { id: 'ai', name: 'AI / ML' }],
    },
  ], {}, { complete: false, status: 'in_progress' });

  assert.deepEqual(cards.map((card) => card.status), ['draft', 'draft']);
});
