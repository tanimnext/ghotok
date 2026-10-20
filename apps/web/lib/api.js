// Browser-side API client. The JWT lives in localStorage.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'ghotok_token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || 'Request failed');
    this.status = status;
    this.fields = body?.fields || null;
    this.code = body?.code || null;
  }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, { error: 'Cannot reach the server. Check your internet connection.' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) setToken(null);
    throw new ApiError(res.status, data);
  }
  return data;
}

/** Fetch a private file (photo) with the auth header and return an object URL. */
export async function fileUrl(path) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}
