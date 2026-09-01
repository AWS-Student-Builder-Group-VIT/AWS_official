import assert from 'node:assert/strict';
import test from 'node:test';

import { initializeVersionedSchema } from './databaseInitialization.js';

test('database cold starts skip migrations after the schema version is marked ready', async () => {
  let migrations = 0;
  const pool = { query: async () => ({ rows: [{ key: 'v3-runtime-schema-ready' }] }) };

  const result = await initializeVersionedSchema({
    pool,
    version: 'v3-runtime-schema-ready',
    migrate: async () => { migrations += 1; },
  });

  assert.deepEqual(result, { migrated: false });
  assert.equal(migrations, 0);
});

test('a new database runs migrations and records the ready version', async () => {
  const calls = [];
  const pool = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (calls.length === 1) {
        const error = new Error('relation does not exist');
        error.code = '42P01';
        throw error;
      }
      return { rows: [] };
    },
  };
  let migrations = 0;

  const result = await initializeVersionedSchema({
    pool,
    version: 'v3-runtime-schema-ready',
    migrate: async () => { migrations += 1; },
  });

  assert.deepEqual(result, { migrated: true });
  assert.equal(migrations, 1);
  assert.deepEqual(calls.at(-1).values, ['v3-runtime-schema-ready']);
});

