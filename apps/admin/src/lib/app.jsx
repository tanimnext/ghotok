import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hasRole } from '@ghotok/shared';
import { getDict } from '../i18n/index.js';
import { api, getToken, setToken } from './api.js';

const Ctx = createContext(null);

/** Can this staff user use a feature that needs at least `min` (support < admin < superadmin)? */
export const can = (user, min) => Boolean(user) && hasRole(user.role, min);

const read = (k, d) => {
  try {
    return localStorage.getItem(k) || d;
  } catch {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage blocked */
  }
};

export function AppProvider({ children }) {
  const [lang, setLang] = useState(() => read('ghotok_admin_lang', 'bn'));
  const [theme, setTheme] = useState(() => read('ghotok_admin_theme', 'light'));
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
    write('ghotok_admin_lang', lang);
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    write('ghotok_admin_theme', theme);
  }, [theme]);

  const load = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const { user: u } = await api('/auth/me');
      if (!can(u, 'support')) {
        setToken(null);
        setUser(null);
      } else setUser(u);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
    const out = () => setUser(null);
    window.addEventListener('ghotok:logout', out);
    return () => window.removeEventListener('ghotok:logout', out);
  }, [load]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      theme,
      setTheme,
      user,
      setUser,
      ready,
      t: getDict(lang),
      logout: () => {
        setToken(null);
        setUser(null);
      },
    }),
    [lang, theme, user, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);

/** Load JSON and expose { data, error, loading, reload, setData }. Pass null to skip. */
export function useLoad(path) {
  const [s, setS] = useState({ data: null, error: null, loading: Boolean(path) });
  const reload = useCallback(async () => {
    if (!path) return;
    setS((x) => ({ ...x, loading: true }));
    try {
      setS({ data: await api(path), error: null, loading: false });
    } catch (error) {
      setS({ data: null, error, loading: false });
    }
  }, [path]);
  useEffect(() => {
    reload();
  }, [reload]);
  const setData = useCallback((fn) => setS((x) => ({ ...x, data: typeof fn === 'function' ? fn(x.data) : fn })), []);
  return { ...s, reload, setData };
}
