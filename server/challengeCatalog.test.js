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
import { applyChallengeCatalogDetailsMigration, applyChallengeCatalogV2Migration } from './hackathonScoring.js';

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

  assert.equal(publicChallenge.id, 'ai-adaptive-campus-concierge');
  assert.equal(publicChallenge.track, 'AI & Automation');
  assert.equal(publicChallenge.title, 'Adaptive Campus Services Concierge');
  assert.ok(publicChallenge.desc.length >= 180);
  assert.ok(publicChallenge.technicalScope.length >= 3);
  assert.ok(publicChallenge.deliverables.length >= 3);
  assert.deepEqual(publicChallenge.tags, ['Lambda', 'DynamoDB', 'S3']);
  assert.equal(publicChallenge.points, 100);
  assert.equal('chaosTwist' in publicChallenge, false);
});

test('all forty challenges include participant-ready detail and an implementation-ready chaos card', () => {
  for (const entry of CHALLENGE_CATALOG) {
    assert.ok(entry.desc.length >= 180, `${entry.id} needs a detailed description`);
    assert.ok(entry.technicalScope.length >= 3, `${entry.id} needs technical guardrails`);
    assert.ok(entry.deliverables.length >= 3, `${entry.id} needs core deliverables`);
    assert.ok(entry.tags.length >= 3, `${entry.id} needs suggested AWS services`);
    assert.ok(entry.chaosTwist.desc.length >= 100, `${entry.id} needs a detailed chaos scenario`);
  }
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
  assert.ok(snapshot.challenge.technicalScope.length >= 3);
  assert.ok(snapshot.challenge.deliverables.length >= 3);
});

test('detail migration enriches existing assignments without changing their challenge ids or reveal state', async () => {
  const calls = [];
  const oldQuestion = { id: 'cities-green-corridor-planner', title: 'Emergency Green-Corridor Planner', points: 100 };
  const client = {
    async query(sql, params = []) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (normalized.startsWith('INSERT INTO global_settings')) return { rows: [{ key: 'challenge_catalog_v3_details_migrated' }] };
      if (normalized.includes('SELECT id, mystery_question')) {
        return { rows: [{ id: 77, mystery_question: oldQuestion, is_opened: true, is_chaos_opened: false, is_chaos_resolved: true }] };
      }
      return { rows: [] };
    },
    release() {},
  };

  const result = await applyChallengeCatalogDetailsMigration({ connect: async () => client });

  assert.deepEqual(result, { applied: true, enriched: 1 });
  const update = calls.find(({ sql }) => sql.startsWith('UPDATE hackathon_teams SET mystery_question'));
  const enrichedQuestion = JSON.parse(update.params[0]);
  const enrichedChaos = JSON.parse(update.params[1]);
  assert.equal(enrichedQuestion.id, oldQuestion.id);
  assert.ok(enrichedQuestion.technicalScope.length >= 3);
  assert.ok(enrichedQuestion.deliverables.length >= 3);
  assert.equal(enrichedChaos.id, 'cities-road-closure');
  assert.ok(!update.sql.includes('is_opened='));
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
