import 'server-only';
import { cookies } from 'next/headers';
import { getDict, DEFAULT_LANG } from './dict.js';

const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function getPrefs() {
  const c = await cookies();
  const lang = c.get('lang')?.value === 'en' ? 'en' : c.get('lang')?.value === 'bn' ? 'bn' : DEFAULT_LANG;
  const theme = c.get('theme')?.value === 'dark' ? 'dark' : 'light';
  return { lang, theme, t: getDict(lang) };
}

/** Server-side GET against the public API. Returns null on any failure. */
export async function apiGet(path, { revalidate = 60 } = {}) {
  try {
    const res = await fetch(`${API}/api${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
