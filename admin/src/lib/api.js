export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const WEB_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:3000';
const KEY = 'ghotok_admin_token';

export const getToken = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* blocked */ } };

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || 'Request failed');
    this.status = status;
    this.fields = body?.fields || null;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, { error: 'Cannot reach the API server' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) { setToken(null); window.dispatchEvent(new Event('ghotok:logout')); }
    const err = new ApiError(res.status, data);
    if (err.fields) err.message = `${err.message}: ${Object.values(err.fields).join(', ')}`;
    throw err;
  }
  return data;
}

export async function fileUrl(path) {
  const res = await fetch(`${API_URL}/api${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) return null;
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), type: blob.type };
}
