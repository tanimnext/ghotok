// Browser-side API client. The JWT lives in localStorage; the response language follows <html lang>.
import { createApiClient } from '@ghotok/ui/api';

export { ApiError } from '@ghotok/ui/api';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const client = createApiClient({
  baseUrl: API_URL,
  tokenKey: 'ghotok_token',
  getLang: () => (typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'bn'),
  onUnauthorized: () => typeof window !== 'undefined' && window.dispatchEvent(new Event('ghotok:logout')),
});

export const { getToken, setToken, download } = client;
export const api = client.request;

/** Object URL for a private file (e.g. a photo), or null when not allowed. */
export const fileUrl = async (path) => (await client.fileUrl(path))?.url || null;
