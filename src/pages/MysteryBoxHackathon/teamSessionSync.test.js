import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HACKATHON_TOKEN_KEY,
  MEMBER_EMAIL_KEY,
  OWNED_ITEMS_KEY,
  TEAM_STORAGE_KEY,
  consumeTeamRefreshResponse,
} from './teamSessionSync.js';
import * as teamSessionSync from './teamSessionSync.js';

function createStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function createSession() {
  const localStorage = createStorage({
    [TEAM_STORAGE_KEY]: '{"code":"TEAM01"}',
    [OWNED_ITEMS_KEY]: '["hint"]',
    'mystery-box-chaos-simulated': 'true',
  });
  const sessionStorage = createStorage({
    [MEMBER_EMAIL_KEY]: 'member@example.com',
    [HACKATHON_TOKEN_KEY]: 'verified-google-session',
  });
  return { localStorage, sessionStorage };
}

test('404 team refresh removes stale membership but preserves verified login', async () => {
  const storage = createSession();
  const result = await consumeTeamRefreshResponse({ ok: false, status: 404 }, storage);

  assert.deepEqual(result, { kind: 'invalidated', reason: 'team-deleted' });
  assert.equal(storage.localStorage.getItem(TEAM_STORAGE_KEY), null);
  assert.equal(storage.localStorage.getItem(OWNED_ITEMS_KEY), null);
  assert.equal(storage.localStorage.getItem('mystery-box-chaos-simulated'), null);
  assert.equal(storage.sessionStorage.getItem(MEMBER_EMAIL_KEY), null);
  assert.equal(storage.sessionStorage.getItem(HACKATHON_TOKEN_KEY), 'verified-google-session');
});

test('403 team refresh invalidates a member removed by an administrator', async () => {
  const storage = createSession();
  const result = await consumeTeamRefreshResponse({ ok: false, status: 403 }, storage);

  assert.deepEqual(result, { kind: 'invalidated', reason: 'membership-revoked' });
  assert.equal(storage.localStorage.getItem(TEAM_STORAGE_KEY), null);
  assert.equal(storage.sessionStorage.getItem(MEMBER_EMAIL_KEY), null);
  assert.equal(storage.sessionStorage.getItem(HACKATHON_TOKEN_KEY), 'verified-google-session');
});

test('temporary server failures do not remove a valid local team session', async () => {
  const storage = createSession();
  const result = await consumeTeamRefreshResponse({ ok: false, status: 500 }, storage);

  assert.deepEqual(result, { kind: 'unavailable' });
  assert.equal(storage.localStorage.getItem(TEAM_STORAGE_KEY), '{"code":"TEAM01"}');
  assert.equal(storage.sessionStorage.getItem(MEMBER_EMAIL_KEY), 'member@example.com');
});

test('successful refresh stores the authoritative team and inventory', async () => {
  const storage = createSession();
  const freshTeam = { code: 'TEAM01', points: 175, ownedItems: ['wildcard'] };
  const result = await consumeTeamRefreshResponse({
    ok: true,
    status: 200,
    async json() {
      return freshTeam;
    },
  }, storage);

  assert.deepEqual(result, { kind: 'updated', team: freshTeam, ownedItems: ['wildcard'] });
  assert.equal(storage.localStorage.getItem(TEAM_STORAGE_KEY), JSON.stringify(freshTeam));
  assert.equal(storage.localStorage.getItem(OWNED_ITEMS_KEY), '["wildcard"]');
});

test('verified session resumes one existing team without registration details', () => {
  assert.equal(typeof teamSessionSync.consumeVerifiedHackathonSession, 'function');
  const storage = createSession();
  const team = { code: 'TEAM01', members: [{ email: 'member@example.com' }], ownedItems: ['hint'] };

  const result = teamSessionSync.consumeVerifiedHackathonSession({
    token: 'renewed-token',
    user: { email: 'MEMBER@EXAMPLE.COM' },
    teams: [team],
  }, storage);

  assert.deepEqual(result, { kind: 'resume', team });
  assert.equal(storage.sessionStorage.getItem(HACKATHON_TOKEN_KEY), 'renewed-token');
  assert.equal(storage.sessionStorage.getItem(MEMBER_EMAIL_KEY), 'member@example.com');
  assert.equal(storage.localStorage.getItem(TEAM_STORAGE_KEY), JSON.stringify(team));
  assert.equal(storage.localStorage.getItem(OWNED_ITEMS_KEY), '["hint"]');
});

test('verified session with no membership continues registration or joining', () => {
  assert.equal(typeof teamSessionSync.consumeVerifiedHackathonSession, 'function');
  const storage = createSession();

  const result = teamSessionSync.consumeVerifiedHackathonSession({
    token: 'renewed-token',
    user: { email: 'new@example.com' },
    teams: [],
  }, storage);

  assert.deepEqual(result, { kind: 'new-member', teams: [] });
  assert.equal(storage.sessionStorage.getItem(HACKATHON_TOKEN_KEY), 'renewed-token');
  assert.equal(storage.localStorage.getItem(TEAM_STORAGE_KEY), null);
});

test('verified session exposes multiple authorized teams for an explicit choice', () => {
  assert.equal(typeof teamSessionSync.consumeVerifiedHackathonSession, 'function');
  const storage = createSession();
  const teams = [{ code: 'FIRST1' }, { code: 'SECOND' }];

  const result = teamSessionSync.consumeVerifiedHackathonSession({
    token: 'renewed-token',
    user: { email: 'member@example.com' },
    teams,
  }, storage);

  assert.deepEqual(result, { kind: 'choose-team', teams });
  assert.equal(storage.localStorage.getItem(TEAM_STORAGE_KEY), null);
});

test('sign out clears browser credentials without changing server membership', () => {
  assert.equal(typeof teamSessionSync.clearHackathonBrowserSession, 'function');
  const storage = createSession();

  teamSessionSync.clearHackathonBrowserSession(storage);

  assert.equal(storage.sessionStorage.getItem(HACKATHON_TOKEN_KEY), null);
  assert.equal(storage.sessionStorage.getItem(MEMBER_EMAIL_KEY), null);
  assert.equal(storage.localStorage.getItem(TEAM_STORAGE_KEY), null);
  assert.equal(storage.localStorage.getItem(OWNED_ITEMS_KEY), null);
});
