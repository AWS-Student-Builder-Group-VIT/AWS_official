export const TEAM_STORAGE_KEY = 'mystery-box-hackathon-team';
export const OWNED_ITEMS_KEY = 'mystery-box-owned-items';
export const MEMBER_EMAIL_KEY = 'mystery-box-hackathon-my-email';
export const HACKATHON_TOKEN_KEY = 'mystery-box-hackathon-token';
export const CHAOS_STORAGE_KEY = 'mystery-box-chaos-simulated';

export async function consumeTeamRefreshResponse(response, { localStorage, sessionStorage }) {
  if (response.status === 403 || response.status === 404) {
    localStorage.removeItem(TEAM_STORAGE_KEY);
    localStorage.removeItem(OWNED_ITEMS_KEY);
    localStorage.removeItem(CHAOS_STORAGE_KEY);
    sessionStorage.removeItem(MEMBER_EMAIL_KEY);

    return {
      kind: 'invalidated',
      reason: response.status === 404 ? 'team-deleted' : 'membership-revoked',
    };
  }

  if (!response.ok) return { kind: 'unavailable' };

  const team = await response.json();
  if (!team?.code) return { kind: 'unavailable' };

  const ownedItems = Array.isArray(team.ownedItems) ? team.ownedItems : [];
  localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
  localStorage.setItem(OWNED_ITEMS_KEY, JSON.stringify(ownedItems));
  return { kind: 'updated', team, ownedItems };
}
