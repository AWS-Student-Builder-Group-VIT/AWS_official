export const TEAM_STORAGE_KEY = 'mystery-box-hackathon-team';
export const OWNED_ITEMS_KEY = 'mystery-box-owned-items';
export const MEMBER_EMAIL_KEY = 'mystery-box-hackathon-my-email';
export const HACKATHON_TOKEN_KEY = 'mystery-box-hackathon-token';
export const CHAOS_STORAGE_KEY = 'mystery-box-chaos-simulated';

function clearTeamCache({ localStorage, sessionStorage }, { clearToken = false } = {}) {
  if (localStorage) {
    localStorage.removeItem(TEAM_STORAGE_KEY);
    localStorage.removeItem(OWNED_ITEMS_KEY);
    localStorage.removeItem(CHAOS_STORAGE_KEY);
  }
  if (sessionStorage) {
    sessionStorage.removeItem(TEAM_STORAGE_KEY);
    sessionStorage.removeItem(OWNED_ITEMS_KEY);
    sessionStorage.removeItem(CHAOS_STORAGE_KEY);
    sessionStorage.removeItem(MEMBER_EMAIL_KEY);
    if (clearToken) sessionStorage.removeItem(HACKATHON_TOKEN_KEY);
  }
}

export function persistVerifiedHackathonTeam(team, user, { localStorage, sessionStorage }) {
  const email = String(user?.email || (typeof user === 'string' ? user : '') || '').trim().toLowerCase();
  const ownedItems = Array.isArray(team?.ownedItems) ? team.ownedItems : [];
  if (localStorage) {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
    localStorage.setItem(OWNED_ITEMS_KEY, JSON.stringify(ownedItems));
  }
  if (sessionStorage) {
    sessionStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
    sessionStorage.setItem(OWNED_ITEMS_KEY, JSON.stringify(ownedItems));
    if (email) sessionStorage.setItem(MEMBER_EMAIL_KEY, email);
  }
}

export function getStoredTeam({ localStorage, sessionStorage } = {}) {
  try {
    if (sessionStorage) {
      const sessionVal = sessionStorage.getItem(TEAM_STORAGE_KEY);
      if (sessionVal) return JSON.parse(sessionVal);
    }
    if (localStorage) {
      const localVal = localStorage.getItem(TEAM_STORAGE_KEY);
      if (localVal) return JSON.parse(localVal);
    }
  } catch {
    return null;
  }
  return null;
}

export function consumeVerifiedHackathonSession(session, storage) {
  const teams = Array.isArray(session?.teams) ? session.teams.filter((team) => team?.code) : [];
  if (storage.sessionStorage) {
    storage.sessionStorage.setItem(HACKATHON_TOKEN_KEY, session?.token || '');
  }
  clearTeamCache(storage);

  if (teams.length >= 1) {
    persistVerifiedHackathonTeam(teams[0], session.user, storage);
    return { kind: 'resume', team: teams[0] };
  }
  return { kind: 'new-member', teams: [] };
}

export function clearHackathonBrowserSession(storage) {
  clearTeamCache(storage, { clearToken: true });
}

export async function consumeTeamRefreshResponse(response, { localStorage, sessionStorage }) {
  if (response.status === 403 || response.status === 404) {
    clearTeamCache({ localStorage, sessionStorage });

    return {
      kind: 'invalidated',
      reason: response.status === 404 ? 'team-deleted' : 'membership-revoked',
    };
  }

  if (!response.ok) return { kind: 'unavailable' };

  const team = await response.json();
  if (!team?.code) return { kind: 'unavailable' };

  const ownedItems = Array.isArray(team.ownedItems) ? team.ownedItems : [];
  if (localStorage) {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
    localStorage.setItem(OWNED_ITEMS_KEY, JSON.stringify(ownedItems));
  }
  if (sessionStorage) {
    sessionStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
    sessionStorage.setItem(OWNED_ITEMS_KEY, JSON.stringify(ownedItems));
  }
  return { kind: 'updated', team, ownedItems };
}

