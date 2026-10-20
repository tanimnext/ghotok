// API client for the admin panel. The staff token is kept separately from the website's token.
import { createApiClient } from '@ghotok/ui/api';

export { ApiError } from '@ghotok/ui/api';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const WEB_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:3000';

const client = createApiClient({
  baseUrl: API_URL,
  tokenKey: 'ghotok_admin_token',
  getLang: () => (document.documentElement.lang === 'en' ? 'en' : 'bn'),
  onUnauthorized: () => window.dispatchEvent(new Event('ghotok:logout')),
});

export const { getToken, setToken, fileUrl, download } = client;
export const api = client.request;
