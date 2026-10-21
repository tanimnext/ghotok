import 'server-only';
import { cookies } from 'next/headers';
import { getDict, DEFAULT_LANG } from './dict.js';

const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:5173';

export async function getPrefs() {
  const c = await cookies();
  const raw = c.get('lang')?.value;
  const lang = raw === 'en' || raw === 'bn' ? raw : DEFAULT_LANG;
  const theme = c.get('theme')?.value === 'dark' ? 'dark' : 'light';
  return { lang, theme, t: getDict(lang) };
}

/** Server-side GET against the public API. Returns null on any failure (the page still renders). */
export async function apiGet(path, { revalidate = 60, lang } = {}) {
  // The API is not running while `next build` pre-renders static shells; skip the request.
  if (process.env.NEXT_PHASE === 'phase-production-build') return null;
  try {
    const res = await fetch(`${API}/api${path}`, { next: { revalidate }, headers: lang ? { 'X-Lang': lang } : {} });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Public site settings (contact details, social links, announcement). */
export async function getSettings() {
  return (await apiGet('/settings', { revalidate: 30 }))?.settings || null;
}
