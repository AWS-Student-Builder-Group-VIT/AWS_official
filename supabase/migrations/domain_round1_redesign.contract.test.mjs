import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('./202609150001_domain_round1_redesign.sql', import.meta.url),
  'utf8',
);

test('migration contains the authoritative taxonomy', () => {
  for (const slug of ['technical', 'events', 'design', 'publicity', 'outreach', 'finance']) {
    assert.match(sql, new RegExp(`'${slug}'`));
  }

  for (const name of [
    'Operations & Execution',
    'Logistics and Participant Management',
    'Event Ideation and Planning',
    'Digital Graphic Design',
    'Art & Craft / Physical Design',
    'UI/UX Design',
    'Social Media Management',
    'Content & Video Editing',
    'Event Promotion',
  ]) {
    assert.ok(sql.includes(name));
  }
});

test('migration enforces the Technical-only maximum and written-answer RLS', () => {
  assert.match(sql, /TECHNICAL_SELECTION_LIMIT/);
  assert.match(sql, /candidate_written_answers ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /candidate_id = auth\.uid\(\)/);
});
