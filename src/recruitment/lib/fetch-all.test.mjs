import assert from 'node:assert/strict';
import test from 'node:test';

import { chunk, fetchAll } from './fetch-all.js';

/** A stand-in for a Supabase query that honours .range() like PostgREST. */
function fakeTable(total, { cap = 1000, failAt } = {}) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls = [];
  const build = () => ({
    range(from, to) {
      calls.push([from, to]);
      if (failAt === from) return Promise.resolve({ data: null, error: { message: 'boom' } });
      const size = Math.min(to - from + 1, cap);
      return Promise.resolve({ data: rows.slice(from, from + size), error: null });
    },
  });
  return { build, calls };
}

test('returns every row past the 1,000-row cap', async () => {
  const { build, calls } = fakeTable(2400);
  const rows = await fetchAll(build);
  assert.equal(rows.length, 2400);
  assert.deepEqual(rows.map((r) => r.id), Array.from({ length: 2400 }, (_, i) => i), 'no gaps or duplicates');
  assert.equal(calls.length, 3);
});

test('stops after one request when the table is small', async () => {
  const { build, calls } = fakeTable(13);
  assert.equal((await fetchAll(build)).length, 13);
  assert.equal(calls.length, 1);
});

test('handles an exact multiple of the page size', async () => {
  const { build, calls } = fakeTable(2000);
  assert.equal((await fetchAll(build)).length, 2000);
  assert.equal(calls.length, 3, 'one extra empty page confirms the end');
});

test('handles an empty table', async () => {
  const { build } = fakeTable(0);
  assert.deepEqual(await fetchAll(build), []);
});

test('surfaces a failed page instead of returning partial data', async () => {
  const { build } = fakeTable(2400, { failAt: 1000 });
  await assert.rejects(fetchAll(build), /boom/);
});

test('chunk splits evenly and keeps the remainder', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
});
