import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHALLENGE_CATALOG,
  assignBalancedChallengeForNewTeam,
  chooseBalancedChallenge,
  createTeamChallengeSnapshot,
  getChallengeById,
  listPublicChallenges,
} from './challengeCatalog.js';
import { applyChallengeCatalogV2Migration } from './hackathonScoring.js';

test('catalog contains forty equally weighted tracked challenges without difficulty tiers', () => {
  assert.equal(CHALLENGE_CATALOG.length, 40);
  assert.equal(new Set(CHALLENGE_CATALOG.map((challenge) => challenge.id)).size, 40);
  const counts = Object.values(Object.groupBy(CHALLENGE_CATALOG, (challenge) => challenge.track)).map((entries) => entries.length);
  assert.equal(counts.length, 10);
  assert.ok(counts.every((count) => count === 4));
  assert.ok(CHALLENGE_CATALOG.every((challenge) => challenge.points === 100 && !('difficulty' in challenge)));
});

test('public challenge listings never disclose the private chaos twist', () => {
  const publicChallenge = listPublicChallenges().find((challenge) => challenge.id === 'ai-adaptive-campus-concierge');

  assert.deepEqual(publicChallenge, {
    id: 'ai-adaptive-campus-concierge',
    track: 'AI & Automation',
    title: 'Adaptive Campus Services Concierge',
    desc: 'Personalize campus notices, services, and next actions for distinct student needs.',
    tags: ['Lambda', 'DynamoDB', 'S3'],
    points: 100,
  });
  assert.equal('chaosTwist' in publicChallenge, false);
});

test('balanced assignment chooses only an unassigned challenge before repeating one', () => {
  const assigned = CHALLENGE_CATALOG.slice(0, 39).map((challenge) => ({ mystery_question: { id: challenge.id } }));
  const picked = chooseBalancedChallenge(assigned, () => 0);

  assert.equal(picked.id, CHALLENGE_CATALOG[39].id);
});

test('team snapshots retain a private matching chaos twist for later reveal', () => {
  const challenge = getChallengeById('fintech-fraud-network-explorer');
  const snapshot = createTeamChallengeSnapshot(challenge);

  assert.equal(snapshot.challenge.id, 'fintech-fraud-network-explorer');
  assert.equal(snapshot.chaosEvent.title, 'Evidence Trail Required');
  assert.equal(snapshot.challenge.points, 100);
});

test('catalog migration is guarded by the requested global settings key', async () => {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      queries.push({ sql: normalized, params });
      if (normalized.includes('INSERT INTO global_settings')) return { rows: [{ key: 'challenge_catalog_v2_migrated' }] };
      if (normalized.includes("SELECT value FROM hackathon_event_settings")) return { rows: [{ value: null }] };
      if (normalized.includes('SELECT id FROM hackathon_teams')) return { rows: [] };
      return { rows: [] };
    },
    release() {},
  };

  const result = await applyChallengeCatalogV2Migration({ connect: async () => client });

  assert.deepEqual(result, { applied: true, reassigned: 0 });
  assert.ok(queries.some(({ sql, params }) => sql.includes('INSERT INTO global_settings') && params.includes('challenge_catalog_v2_migrated')));
  assert.ok(queries.some(({ sql }) => sql === 'COMMIT'));
});

test('new-team assignment serializes concurrent balanced selections', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      calls.push(normalized);
      return normalized.includes('SELECT mystery_question')
        ? { rows: [{ mystery_question: { id: 'ai-adaptive-campus-concierge' } }] }
        : { rows: [] };
    },
  };

  const snapshot = await assignBalancedChallengeForNewTeam(client, () => 0);

  assert.match(calls[0], /pg_advisory_xact_lock/);
  assert.match(calls[1], /SELECT mystery_question FROM hackathon_teams/);
  assert.notEqual(snapshot.challenge.id, 'ai-adaptive-campus-concierge');
});
