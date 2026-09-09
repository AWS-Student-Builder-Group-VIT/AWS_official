import { readApiResponse } from './apiResponse';
export async function eventRequest(path, { method = 'GET', body, adminToken } = {}) {
  const token = adminToken || sessionStorage.getItem('mystery-box-hackathon-token');
  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/${path}`, {
    method, cache: 'no-store', headers: { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const { data, error } = await readApiResponse(response, 'Could not contact event server');
  if (!response.ok) throw Object.assign(new Error(error || 'Event request failed'), { status: response.status });
  return data;
}
export function pendingRequest(key) {
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID(); localStorage.setItem(key, id); return id;
}
