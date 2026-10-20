/**
 * Browser API client used by the website and the admin panel.
 *
 *   const client = createApiClient({ baseUrl, tokenKey: 'ghotok_token', getLang: () => lang });
 *   const { items } = await client.request('/biodatas?type=bride');
 *
 * Errors are thrown as ApiError with the server's stable `code`, a localised `message`
 * and per-field messages in `fields` (see @ghotok/shared ERRORS / FIELD_ERRORS).
 */
export class ApiError extends Error {
  constructor(status, body = {}) {
    super(body.error || 'Request failed');
    this.status = status;
    this.code = body.code || (status === 0 ? 'NETWORK' : 'INTERNAL');
    this.fields = body.fields || null;
    this.fieldCodes = body.fieldCodes || null;
  }
}

const NETWORK_MESSAGE = {
  en: 'Cannot reach the server. Check your internet connection.',
  bn: 'সার্ভারে পৌঁছানো যাচ্ছে না। ইন্টারনেট সংযোগ দেখুন।',
};

export function createApiClient({ baseUrl, tokenKey, getLang = () => 'bn', onUnauthorized } = {}) {
  const getToken = () => {
    try {
      return localStorage.getItem(tokenKey);
    } catch {
      return null;
    }
  };
  const setToken = (token) => {
    try {
      if (token) localStorage.setItem(tokenKey, token);
      else localStorage.removeItem(tokenKey);
    } catch {
      /* storage blocked (private mode): the session lasts until the tab closes */
    }
  };

  async function request(path, { method = 'GET', body, form, signal, headers: extra } = {}) {
    const headers = { 'X-Lang': getLang(), ...extra };
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
      res = await fetch(`${baseUrl}/api${path}`, { method, headers, body: payload, signal });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      throw new ApiError(0, { error: NETWORK_MESSAGE[getLang()] || NETWORK_MESSAGE.en });
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && token) {
        setToken(null);
        onUnauthorized?.();
      }
      throw new ApiError(res.status, data);
    }
    return data;
  }

  /** Fetch a private file with the auth header. Returns { url, type } (an object URL) or null. */
  async function fileUrl(path) {
    const token = getToken();
    const res = await fetch(`${baseUrl}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return null;
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), type: blob.type };
  }

  /** Download a file (e.g. a CSV export) with the auth header. */
  async function download(path, fallbackName = 'download') {
    const token = getToken();
    const res = await fetch(`${baseUrl}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
    const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return { request, fileUrl, download, getToken, setToken };
}
