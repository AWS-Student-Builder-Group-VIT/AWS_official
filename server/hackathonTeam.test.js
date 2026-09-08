import assert from 'node:assert/strict';
import test from 'node:test';

import { formatHackathonTeam } from './hackathonTeam.js';

const row = {
  code: 'ABC123',
  team_name: 'Builders',
  mystery_question: { id: 'ai-adaptive-campus-concierge', title: 'Adaptive Campus Services Concierge', track: 'AI & Automation', points: 100 },
  is_opened: true,
  points: 100,
  chaos_event: { id: 'ai-manual-override', title: 'Manual Override Required', desc: 'Hidden adaptation' },
  is_chaos_opened: false,
  is_chaos_resolved: false,
  owned_items: [],
  has_changed_question: false,
  max_game_attempts: 5,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
};

test('participant team payload hides its assigned chaos twist before global reveal', () => {
  assert.equal(formatHackathonTeam(row).chaosEvent, null);
});

test('participant team payload reveals and retains its twist after global reveal', () => {
  const formatted = formatHackathonTeam({ ...row, is_chaos_opened: true, is_chaos_resolved: true });
  assert.deepEqual(formatted.chaosEvent, row.chaos_event);
  assert.equal(formatted.isChaosResolved, true);
});

test('admin formatting can explicitly inspect a sealed twist', () => {
  assert.deepEqual(formatHackathonTeam(row, [], { includePrivateChaos: true }).chaosEvent, row.chaos_event);
});
