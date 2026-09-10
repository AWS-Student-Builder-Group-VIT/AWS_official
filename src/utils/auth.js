// ── Auth helpers used across the app ──────────────────────────
import { readApiResponse } from './apiResponse.js';

const API_URL = import.meta.env.VITE_API_URL || '';

function adminReason(action = 'perform this organizer action') {
  if (!window.confirm(`Do you want to ${action}?`)) throw new Error('Organizer action cancelled');
  return `Organizer confirmed: ${action}`;
}

// Session duration: 24 hours in milliseconds
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Check if the stored session has expired.
 * Returns true if expired or no timestamp exists.
 */
function isSessionExpired() {
  const loginTime = localStorage.getItem('loginTimestamp');
  if (!loginTime) return true;
  return Date.now() - Number(loginTime) > SESSION_DURATION_MS;
}

/**
 * Save session data (token + user + timestamp) after login/register.
 */
export function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('loginTimestamp', String(Date.now()));
}

export function getToken() {
  if (isSessionExpired()) {
    logout();
    return null;
  }
  return localStorage.getItem('token');
}

export function getUser() {
  if (isSessionExpired()) {
    logout();
    return null;
  }
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('loginTimestamp');
}

/**
 * Run on app mount: if session is expired, auto-logout and fire auth-change.
 * Returns true if the session was expired and cleared.
 */
export function checkSessionValidity() {
  if (isSessionExpired() && localStorage.getItem('token')) {
    logout();
    window.dispatchEvent(new Event('auth-change'));
    return true; // session was expired
  }
  return false; // session still valid
}

/** Submit a quiz score. Returns { ok, error } */
export async function submitScore({ quizId, quizTitle, quizType, score, total, timeTaken }) {
  const token = getToken();
  if (!token) return { ok: false, error: 'Not logged in' };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${API_URL}/api/quiz-scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quizId, quizTitle, quizType, score, total, timeTaken }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const data = await res.json();
    return res.ok ? { ok: true, data } : { ok: false, error: data.error };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'Request timed out' : 'Network error' };
  }
}

/** Fetch my quiz scores */
export async function fetchMyScores() {
  const token = getToken();
  if (!token) return [];
  try {
    const res = await fetch(`${API_URL}/api/quiz-scores/me?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data;
  } catch { return []; }
}

/** Fetch qualification round status */
export async function fetchRoundStatus() {
  const token = getToken();
  if (!token) return {};
  try {
    const res = await fetch(`${API_URL}/api/quiz-scores/round-status?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data;
  } catch { return {}; }
}

/** Fetch admin token */
export async function adminLogin(adminId, password) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, password }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const { data, error } = await readApiResponse(res, 'Backend not reachable');
    if (res.ok && data.token) return { ok: true, token: data.token };
    return { ok: false, error };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'Backend not reachable (timeout)' : `Network error: ${e.message}` };
  }
}

/** Fetch all scores (admin) */
export async function fetchAdminScores(adminToken) {
  try {
    const res = await fetch(`${API_URL}/api/admin/scores`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

/** Fetch stats (admin) */
export async function fetchAdminStats(adminToken) {
  try {
    const res = await fetch(`${API_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return res.ok ? res.json() : {};
  } catch { return {}; }
}

/** Check backend health */
export async function checkHealth() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${API_URL}/api/health`, { signal: ctrl.signal });
    return res.ok ? res.json() : { status: 'error' };
  } catch {
    return { status: 'error', backend: 'unreachable' };
  }
}

/** Update user profile */
export async function updateProfile(firstName, lastName) {
  const token = getToken();
  if (!token) return { ok: false, error: 'Not logged in' };
  try {
    const res = await fetch(`${API_URL}/api/user/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ firstName, lastName }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('user', JSON.stringify(data.user));
      return { ok: true, user: data.user };
    }
    return { ok: false, error: data.error };
  } catch { return { ok: false, error: 'Network error' }; }
}

/** Update user password */
export async function updatePassword(oldPassword, newPassword) {
  const token = getToken();
  if (!token) return { ok: false, error: 'Not logged in' };
  try {
    const res = await fetch(`${API_URL}/api/user/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: data.error };
  } catch { return { ok: false, error: 'Network error' }; }
}

/** Get Global Quiz Status */
export async function fetchQuizStatus() {
  try {
    const res = await fetch(`${API_URL}/api/quiz-status`, { cache: 'no-store' });
    const data = await res.json();
    return res.ok ? data.status : 'inactive';
  } catch { return 'inactive'; }
}

/** Set Global Quiz Status (Admin) */
export async function updateQuizStatus(adminToken, action) {
  try {
    const res = await fetch(`${API_URL}/api/admin/quiz-control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    return res.ok ? { ok: true, status: data.status } : { ok: false, error: data.error };
  } catch { return { ok: false, error: 'Network error' }; }
}

// ── Mystery Box Hackathon (Admin) ─────────────────────────────

/** Fetch all registered hackathon teams */
export async function fetchAdminHackathonTeams(adminToken) {
  try {
    const res = await fetch(`${API_URL}/api/admin/mystery-box/teams`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    return res.ok ? data : [];
  } catch {
    return [];
  }
}

/** Update / Inject points for a team */
export async function updateAdminTeamPoints(adminToken, { code, delta }) {
  try {
    const reason = adminReason(`adjust points for team #${code}`);
    const res = await fetch(`${API_URL}/api/admin/mystery-box/teams/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ code, delta, reason })
    });
    const data = await res.json();
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Network error' };
  }
}

export async function fetchAdminGameMode(adminToken) {
  try {
    const res = await fetch(`${API_URL}/api/admin/mystery-box/games-mode`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    return res.ok ? { ok: true, enabled: data.enabled === true } : { ok: false, error: data.error };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function updateAdminGameMode(adminToken, enabled) {
  try {
    const reason = adminReason(`${enabled ? 'enable' : 'disable'} Game Mode`);
    const res = await fetch(`${API_URL}/api/admin/mystery-box/games-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ enabled, reason })
    });
    const data = await res.json();
    return res.ok ? { ok: true, enabled: data.enabled === true } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Network error' };
  }
}

export async function updateAdminTeamGameLimit(adminToken, { code, maxAttempts }) {
  try {
    const reason = adminReason(`set team #${code}'s official game limit to ${maxAttempts}`);
    const res = await fetch(`${API_URL}/api/admin/mystery-box/teams/${code}/games-limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ maxAttempts, reason })
    });
    const data = await res.json();
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Network error' };
  }
}

export async function resetAdminTeamGameAttempt(adminToken, { code, gameSlug, reason }) {
  try {
    const res = await fetch(`${API_URL}/api/admin/mystery-box/teams/${code}/games/${gameSlug}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function fetchMysteryTopics() {
  try {
    const token = window.sessionStorage.getItem('mystery-box-hackathon-token');
    const res = await fetch(`${API_URL}/api/mystery-box/topics`, {
      headers: { Authorization: `Bearer ${token || ''}` }
    });
    const data = await res.json();
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error, topics: [] };
  } catch {
    return { ok: false, error: 'Network error', topics: [] };
  }
}

export async function fetchTeamGameScores(code) {
  try {
    const token = window.sessionStorage.getItem('mystery-box-hackathon-token');
    const res = await fetch(`${API_URL}/api/mystery-box/teams/${code}/scores?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token || ''}` },
      cache: 'no-store'
    });
    const data = await res.json();
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function swapTeamTopic({ code, topicId }) {
  try {
    const token = window.sessionStorage.getItem('mystery-box-hackathon-token');
    const res = await fetch(`${API_URL}/api/mystery-box/teams/${code}/topic-swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify({ topicId })
    });
    const data = await res.json();
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function fetchAdminChallenges(adminToken) {
  try {
    const res = await fetch(`${API_URL}/api/admin/mystery-box/challenges`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return res.ok
      ? { ok: true, challenges: data.challenges || [], chaosRevealedAt: data.chaosRevealedAt || null, chaosEnabled: data.chaosEnabled === true }
      : { ok: false, error: data.error, challenges: [], chaosRevealedAt: null };
  } catch {
    return { ok: false, error: 'Network error', challenges: [] };
  }
}

export async function revealAdminChaosMode(adminToken) {
  try {
    const reason = adminReason('reveal Chaos Mode for every team');
    const res = await fetch(`${API_URL}/api/admin/mystery-box/chaos/reveal`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({reason}) });
    const data = await res.json();
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error };
  } catch (error) { return { ok: false, error: error.message || 'Network error' }; }
}

export async function resolveAdminTeamChaos(adminToken, code) {
  try {
    const reason = adminReason(`mark team #${code}'s Chaos adaptation as resolved`);
    const res = await fetch(`${API_URL}/api/admin/mystery-box/teams/${code}/chaos/resolve`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({reason}) });
    const data = await res.json();
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error };
  } catch (error) { return { ok: false, error: error.message || 'Network error' }; }
}

/** Reassign challenge question */
export async function reassignAdminTeamTopic(adminToken, { code, challengeId, resetSwapUsed }) {
  try {
    const reason = adminReason(`reassign team #${code}'s challenge`);
    const res = await fetch(`${API_URL}/api/admin/mystery-box/teams/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ code, challengeId, resetSwapUsed, reason })
    });
    const data = await res.json();
    return res.ok ? { ok: true, team: data.team } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Network error' };
  }
}

/** Delete / Disband hackathon team */
export async function deleteAdminHackathonTeam(adminToken, code) {
  try {
    const reason = adminReason(`permanently delete team #${code}`);
    const res = await fetch(`${API_URL}/api/admin/mystery-box/teams/${code}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({reason})
    });
    const data = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Network error' };
  }
}

export async function removeAdminHackathonMember(adminToken, { code, email }) {
  try {
    const reason = adminReason(`remove ${email} from team #${code}`);
    const res = await fetch(`${API_URL}/api/admin/mystery-box/teams/${code}/members/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ email, reason })
    });
    const data = await res.json();
    return res.ok ? { ok: true, team: data.team } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Network error' };
  }
}

/** Fetch Live Activity Logs for Admin */
export async function fetchAdminHackathonActivity(adminToken) {
  try {
    const res = await fetch(`${API_URL}/api/admin/mystery-box/activity`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    return res.ok ? data : [];
  } catch {
    return [];
  }
}

/** Post an activity log entry from team clients */
export async function logMysteryBoxActivity({ code, teamName, eventType, message, details }) {
  try {
    const res = await fetch(`${API_URL}/api/mystery-box/activity/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, teamName, eventType, message, details })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Upload or update team PPT presentation */
export async function uploadTeamPresentation({ code, fileName, fileSize, mimeType, fileData, link, uploaderName, uploaderEmail, token }) {
  try {
    const res = await fetch(`${API_URL}/api/mystery-box/teams/${code}/presentation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code, fileName, fileSize, mimeType, fileData, link, uploaderName, uploaderEmail }),
    });
    const data = await res.json();
    return res.ok ? { ok: true, presentation: data.presentation } : { ok: false, error: data.error || 'Failed to upload presentation' };
  } catch (error) {
    return { ok: false, error: error.message || 'Network error during presentation upload' };
  }
}

/** Get direct download URL for a team presentation */
export function getPresentationDownloadUrl(teamCode) {
  return `${API_URL}/api/mystery-box/teams/${teamCode}/presentation/download`;
}


