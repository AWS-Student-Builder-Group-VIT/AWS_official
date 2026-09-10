import assert from 'node:assert/strict';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

import { applySingleTeamMembershipMigration } from './hackathonScoring.js';

test('single-team migration keeps the oldest identity membership and repairs affected teams', async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE hackathon_teams (
      id SERIAL PRIMARY KEY, code TEXT UNIQUE, team_name TEXT,
      members JSONB DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE hackathon_team_members (
      id BIGSERIAL PRIMARY KEY, team_id INTEGER NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
      email TEXT NOT NULL, google_sub TEXT, reg_no TEXT, is_leader BOOLEAN NOT NULL DEFAULT FALSE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(team_id,email)
    );
    CREATE TABLE hackathon_scoring_migrations (key TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE hackathon_activity_logs (
      id SERIAL PRIMARY KEY, team_code TEXT, team_name TEXT, event_type TEXT, message TEXT,
      details JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO hackathon_teams(code,team_name,members) VALUES
      ('OLDEST','Oldest','[{"email":"Member@Example.com","googleSub":"google-1","regNo":"A","isLeader":true}]'),
      ('SECOND','Second','[{"email":"member@example.com","googleSub":"google-1","regNo":"B","isLeader":true},{"email":"next@example.com","googleSub":"google-2","regNo":"C","isLeader":false}]'),
      ('EMPTY1','Empty','[{"email":"MEMBER@example.com","googleSub":"google-1","regNo":"D","isLeader":true}]');
    INSERT INTO hackathon_team_members(team_id,email,google_sub,reg_no,is_leader,joined_at) VALUES
      (1,'member@example.com','google-1','A',TRUE,'2026-01-01'),
      (2,'MEMBER@example.com','google-1','B',TRUE,'2026-02-01'),
      (2,'next@example.com','google-2','C',FALSE,'2026-02-02'),
      (3,'member@example.com','google-1','D',TRUE,'2026-03-01');
  `);
  let tail=Promise.resolve();
  const pool={
    query:(sql,args)=>db.query(sql,args),
    async connect(){const previous=tail;let release;tail=new Promise(resolve=>{release=resolve;});await previous;return {query:(sql,args)=>db.query(sql,args),release};},
  };

  const first = await applySingleTeamMembershipMigration(pool);
  assert.deepEqual(first, { applied: true, removedMemberships: 2, deletedTeams: 1 });
  assert.deepEqual((await db.query('SELECT code FROM hackathon_teams ORDER BY code')).rows.map(row=>row.code), ['OLDEST','SECOND']);
  assert.equal((await db.query("SELECT is_leader FROM hackathon_team_members WHERE email='next@example.com'")).rows[0].is_leader,true);
  const secondMembers=(await db.query("SELECT members FROM hackathon_teams WHERE code='SECOND'")).rows[0].members;
  assert.deepEqual(secondMembers,[{email:'next@example.com',googleSub:'google-2',regNo:'C',isLeader:true}]);
  const auditEvents=(await db.query('SELECT event_type FROM hackathon_activity_logs ORDER BY id')).rows.map(row=>row.event_type);
  assert.ok(auditEvents.includes('DUPLICATE_MEMBERSHIP_REMOVED'));
  assert.ok(auditEvents.includes('LEADERSHIP_TRANSFERRED'));
  assert.ok(auditEvents.includes('EMPTY_TEAM_REMOVED'));
  await assert.rejects(
    db.query("INSERT INTO hackathon_team_members(team_id,email,google_sub,is_leader) VALUES(2,'MEMBER@example.com','google-3',FALSE)"),
  );
  await assert.rejects(
    db.query("INSERT INTO hackathon_team_members(team_id,email,google_sub,is_leader) VALUES(2,'another@example.com','google-1',FALSE)"),
  );
  assert.equal((await applySingleTeamMembershipMigration(pool)).applied,false);
  await db.close();
});
