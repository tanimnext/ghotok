'use client';
/**
 * App-wide state: language, theme, the signed-in user and their unread notification count.
 * Language and theme are cookies so the server renders the right version on first paint.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getDict } from '@/lib/dict';
import { api, getToken, setToken } from '@/lib/api';

const Ctx = createContext(null);

function setCookie(name, value) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function Providers({ initialLang, initialTheme, children }) {
  const router = useRouter();
  const path = usePathname();
  const [lang, setLangState] = useState(initialLang);
  const [theme, setThemeState] = useState(initialTheme);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [unread, setUnread] = useState(0);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setAuthReady(true);
      return null;
    }
    try {
      const { user: u } = await api('/auth/me');
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    const out = () => setUser(null); // a request came back 401 (token revoked or expired)
    window.addEventListener('ghotok:logout', out);
    return () => window.removeEventListener('ghotok:logout', out);
  }, [refreshUser]);

  const refreshUnread = useCallback(() => {
    if (!getToken()) return setUnread(0);
    api('/me/notifications?limit=1')
      .then((d) => setUnread(d.unread))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (user) refreshUnread();
  }, [user, path, refreshUnread]);

  const setLang = useCallback(
    (l) => {
      setLangState(l);
      setCookie('lang', l);
      document.documentElement.lang = l;
      router.refresh();
      if (getToken()) api('/auth/me', { method: 'PATCH', body: { preferredLang: l } }).catch(() => {});
    },
    [router]
  );

  const setTheme = useCallback((th) => {
    setThemeState(th);
    setCookie('theme', th);
    document.documentElement.dataset.theme = th;
  }, []);

  const login = useCallback((token, u) => {
    setToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setUnread(0);
    router.push('/');
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({
      lang,
      t: getDict(lang),
      setLang,
      theme,
      setTheme,
      user,
      setUser,
      authReady,
      refreshUser,
      login,
      logout,
      unread,
      refreshUnread,
    }),
    [lang, setLang, theme, setTheme, user, authReady, refreshUser, login, logout, unread, refreshUnread]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
