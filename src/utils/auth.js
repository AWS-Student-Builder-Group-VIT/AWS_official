import { readApiResponse } from './apiResponse.js';

const API_URL = import.meta.env.VITE_API_URL || '';

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

// ── Cloud Intelligence Admin API Helpers ──────────────────────

/** Fetch all Cloud Intelligence questions */
export async function fetchCloudIntelligenceQuestions(adminToken) {
  try {
    const res = await fetch(`${API_URL}/api/admin/cloud-intelligence/questions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return res.ok ? { ok: true, questions: data } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to fetch questions' };
  }
}

/** Create a new Cloud Intelligence question */
export async function createCloudIntelligenceQuestion(adminToken, questionData) {
  try {
    const res = await fetch(`${API_URL}/api/admin/cloud-intelligence/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(questionData),
    });
    const data = await res.json();
    return res.ok ? { ok: true, question: data } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to create question' };
  }
}

/** Update an existing Cloud Intelligence question */
export async function updateCloudIntelligenceQuestion(adminToken, id, questionData) {
  try {
    const res = await fetch(`${API_URL}/api/admin/cloud-intelligence/questions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(questionData),
    });
    const data = await res.json();
    return res.ok ? { ok: true, question: data } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to update question' };
  }
}

/** Delete a Cloud Intelligence question */
export async function deleteCloudIntelligenceQuestion(adminToken, id) {
  try {
    const res = await fetch(`${API_URL}/api/admin/cloud-intelligence/questions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to delete question' };
  }
}

/** Fetch Cloud Intelligence quiz settings */
export async function fetchCloudIntelligenceSettings(adminToken) {
  try {
    const res = await fetch(`${API_URL}/api/admin/cloud-intelligence/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return res.ok ? { ok: true, settings: data } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to fetch settings' };
  }
}

/** Update Cloud Intelligence quiz settings */
export async function updateCloudIntelligenceSettings(adminToken, settings) {
  try {
    const res = await fetch(`${API_URL}/api/admin/cloud-intelligence/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    return res.ok ? { ok: true, settings: data.settings } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to update settings' };
  }
}

/** Toggle Cloud Intelligence Freeze status */
export async function toggleCloudIntelligenceFreeze(adminToken, status) {
  try {
    const res = await fetch(`${API_URL}/api/admin/cloud-intelligence/freeze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    return res.ok ? { ok: true, status: data.status } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to toggle status' };
  }
}

/** Fetch Cloud Intelligence results & statistics */
export async function fetchCloudIntelligenceResults(adminToken) {
  try {
    const res = await fetch(`${API_URL}/api/admin/cloud-intelligence/results`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return res.ok ? { ok: true, submissions: data.submissions, stats: data.stats } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to fetch results' };
  }
}

/** Delete a Cloud Intelligence submission */
export async function deleteCloudIntelligenceResult(adminToken, id) {
  try {
    const res = await fetch(`${API_URL}/api/admin/cloud-intelligence/results/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to delete submission' };
  }
}

/** Reset all Cloud Intelligence submissions */
export async function resetCloudIntelligenceResults(adminToken) {
  try {
    const res = await fetch(`${API_URL}/api/admin/cloud-intelligence/results/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to reset results' };
  }
}

// ── Public Participant Quiz API Helpers ───────────────────────

/** Fetch public quiz information & freeze state */
export async function fetchPublicQuizInfo() {
  try {
    const res = await fetch(`${API_URL}/api/cloud-intelligence/quiz-info`);
    const data = await res.json();
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to retrieve quiz status' };
  }
}

/** Fetch randomized quiz questions for participant */
export async function fetchPublicQuizQuestions() {
  try {
    const res = await fetch(`${API_URL}/api/cloud-intelligence/questions`);
    const data = await res.json();
    return res.ok ? { ok: true, questions: data.questions, totalCount: data.totalCount } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to load questions' };
  }
}

/** Check if participant has existing submission */
export async function fetchParticipantSubmission(email) {
  try {
    const res = await fetch(`${API_URL}/api/cloud-intelligence/submission/${encodeURIComponent(email)}`);
    const data = await res.json();
    return res.ok ? { ok: true, hasSubmitted: data.hasSubmitted, submission: data.submission } : { ok: false, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to check submission history' };
  }
}

/** Submit participant assessment responses */
export async function submitPublicQuizAssessment(payload) {
  try {
    const res = await fetch(`${API_URL}/api/cloud-intelligence/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return res.ok ? { ok: true, submission: data.submission } : { ok: false, error: data.error, submission: data.submission };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to submit quiz responses' };
  }
}
