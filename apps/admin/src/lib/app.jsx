import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getDict } from './dict.js';
import { ADMIN } from './adminDict.js';
import { api, getToken, setToken } from './api.js';

const Ctx = createContext(null);
const RANK = { user: 0, support: 1, admin: 2, superadmin: 3 };
export const can = (user, min) => (RANK[user?.role] ?? 0) >= RANK[min];

const read = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } };

export function AppProvider({ children }) {
  const [lang, setLangS] = useState(read('ghotok_admin_lang', 'bn'));
  const [theme, setThemeS] = useState(read('ghotok_admin_theme', 'light'));
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { document.documentElement.lang = lang; write('ghotok_admin_lang', lang); }, [lang]);
  useEffect(() => { document.documentElement.dataset.theme = theme; write('ghotok_admin_theme', theme); }, [theme]);

  const load = useCallback(async () => {
    if (!getToken()) { setUser(null); setReady(true); return; }
    try {
      const { user: u } = await api('/auth/me');
      if (!can(u, 'support')) { setToken(null); setUser(null); } else setUser(u);
    } catch { setUser(null); } finally { setReady(true); }
  }, []);

  useEffect(() => {
    load();
    const out = () => setUser(null);
    window.addEventListener('ghotok:logout', out);
    return () => window.removeEventListener('ghotok:logout', out);
  }, [load]);

  const value = useMemo(() => {
    const base = getDict(lang);
    return {
      lang, setLang: setLangS, theme, setTheme: setThemeS, user, setUser, ready,
      t: { ...base, a: ADMIN[lang] },
      logout: () => { setToken(null); setUser(null); },
    };
  }, [lang, theme, user, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);

/** Load JSON and expose { data, error, loading, reload, setData }. */
export function useLoad(path) {
  const [s, setS] = useState({ data: null, error: null, loading: true });
  const reload = useCallback(async () => {
    setS((x) => ({ ...x, loading: true }));
    try { setS({ data: await api(path), error: null, loading: false }); } catch (error) { setS({ data: null, error, loading: false }); }
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return { ...s, reload, setData: (fn) => setS((x) => ({ ...x, data: typeof fn === 'function' ? fn(x.data) : fn })) };
}
