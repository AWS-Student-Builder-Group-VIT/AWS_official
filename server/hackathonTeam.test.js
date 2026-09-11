import assert from 'node:assert/strict';
import test from 'node:test';

import * as hackathonTeam from './hackathonTeam.js';

const { formatHackathonTeam } = hackathonTeam;

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

test('team payload exposes the event-wide primary box unlock state', () => {
  const locked = formatHackathonTeam(row, [], { primaryBoxesUnlockedAt: null });
  assert.equal(locked.primaryBoxesUnlocked, false);
  assert.equal(locked.primaryBoxesUnlockedAt, null);

  const unlockedAt = '2026-09-12T08:30:00.000Z';
  const unlocked = formatHackathonTeam(row, [], { primaryBoxesUnlockedAt: unlockedAt });
  assert.equal(unlocked.primaryBoxesUnlocked, true);
  assert.equal(unlocked.primaryBoxesUnlockedAt, unlockedAt);
});

test('an explicit current lock overrides a stale unlock timestamp on the team row', () => {
  const locked = formatHackathonTeam(
    { ...row, primary_boxes_unlocked_at: '2026-09-12T08:30:00.000Z' },
    [],
    { primaryBoxesUnlockedAt: null },
  );
  assert.equal(locked.primaryBoxesUnlocked, false);
  assert.equal(locked.mysteryQuestion, null);
});

test('returning-team lookup uses verified Google identity and backfills legacy email membership', async () => {
  assert.equal(typeof hackathonTeam.findReturningHackathonTeamRows, 'function');

  const calls = [];
  const legacyTeam = { ...row, id: 12, actor_member_id: 44, actor_google_sub: null };
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('FROM hackathon_team_members m')) return { rows: [legacyTeam] };
      if (sql.includes('UPDATE hackathon_team_members')) return { rowCount: 1, rows: [] };
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  const result = await hackathonTeam.findReturningHackathonTeamRows(db, {
    sub: 'google-sub-123',
    email: 'MEMBER@EXAMPLE.COM',
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].actor_google_sub, 'google-sub-123');
  assert.deepEqual(calls[0].params, ['google-sub-123', 'member@example.com']);
  assert.match(calls[0].sql, /m\.google_sub = \$1/);
  assert.match(calls[0].sql, /LOWER\(m\.email\) = \$2/);
  assert.deepEqual(calls[1].params, ['google-sub-123', 44]);
});

test('returning-team lookup keeps only the oldest authorized membership defensively', async () => {
  assert.equal(typeof hackathonTeam.findReturningHackathonTeamRows, 'function');

  const db = {
    async query(sql) {
      if (sql.includes('FROM hackathon_team_members m')) {
        return {
          rows: [
            { ...row, id: 1, code: 'FIRST1', actor_google_sub: 'google-sub-123' },
            { ...row, id: 2, code: 'SECOND', actor_google_sub: 'google-sub-123' },
          ],
        };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  const result = await hackathonTeam.findReturningHackathonTeamRows(db, {
    sub: 'google-sub-123',
    email: 'member@example.com',
  });

  assert.deepEqual(result.map((team) => team.code), ['FIRST1']);
});

test('global membership uniqueness violations are recognized for a friendly conflict response', () => {
  assert.equal(hackathonTeam.isSingleTeamMembershipConflict({ code: '23505', constraint: 'uq_hackathon_member_email_global' }), true);
  assert.equal(hackathonTeam.isSingleTeamMembershipConflict({ code: '23505', constraint: 'uq_hackathon_member_google_sub_global' }), true);
  assert.equal(hackathonTeam.isSingleTeamMembershipConflict({ code: '23505', constraint: 'hackathon_teams_code_key' }), false);
  assert.equal(hackathonTeam.isSingleTeamMembershipConflict({ code: '22001', constraint: 'uq_hackathon_member_email_global' }), false);
});

test('existing membership blocks creating another team', () => {
  assert.equal(typeof hackathonTeam.getTeamRegistrationConflict, 'function');
  assert.deepEqual(
    hackathonTeam.getTeamRegistrationConflict([{ code: 'TEAM01' }], { action: 'create' }),
    { status: 409, error: 'You already belong to a HackQuest team', teamCode: 'TEAM01' },
  );
});

test('joining the same team is idempotent but joining another team is blocked', () => {
  assert.equal(typeof hackathonTeam.getTeamRegistrationConflict, 'function');
  const memberships = [{ code: 'TEAM01' }];

  assert.equal(hackathonTeam.getTeamRegistrationConflict(memberships, { action: 'join', teamCode: 'TEAM01' }), null);
  assert.deepEqual(
    hackathonTeam.getTeamRegistrationConflict(memberships, { action: 'join', teamCode: 'OTHER1' }),
    { status: 409, error: 'You already belong to a different HackQuest team', teamCode: 'TEAM01' },
  );
});

test('session payload returns every server-authorized team with the renewed token', async () => {
  assert.equal(typeof hackathonTeam.createReturningHackathonSession, 'function');
  const teamRow = { ...row, id: 12, actor_google_sub: 'google-sub-123' };
  const db = {
    async query(sql) {
      if (sql.includes('FROM hackathon_team_members m')) return { rows: [teamRow] };
      if (sql.includes('FROM hackathon_team_members')) {
        return { rows: [{ email: 'member@example.com', googleSub: 'google-sub-123', regNo: '22ABC', isLeader: false }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  const user = { email: 'member@example.com', sub: 'google-sub-123', name: 'Member' };

  const session = await hackathonTeam.createReturningHackathonSession(db, user, {
    signToken: (claims) => `signed:${claims.sub}`,
    primaryBoxesUnlockedAt: '2026-09-12T08:30:00.000Z',
  });

  assert.equal(session.token, 'signed:google-sub-123');
  assert.deepEqual(session.user, user);
  assert.equal(session.teams.length, 1);
  assert.equal(session.teams[0].code, 'ABC123');
  assert.equal(session.teams[0].chaosEvent, null);
  assert.equal(session.teams[0].members[0].email, 'member@example.com');
  assert.equal(session.teams[0].primaryBoxesUnlocked, true);
});
