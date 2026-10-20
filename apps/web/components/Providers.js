'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDict } from '@/lib/dict';
import { api, getToken, setToken } from '@/lib/api';

const Ctx = createContext(null);

function setCookie(name, value) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function Providers({ initialLang, initialTheme, children }) {
  const router = useRouter();
  const [lang, setLangState] = useState(initialLang);
  const [theme, setThemeState] = useState(initialTheme);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

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

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const setLang = useCallback((l) => {
    setLangState(l);
    setCookie('lang', l);
    document.documentElement.lang = l;
    router.refresh();
    if (getToken()) api('/auth/me', { method: 'PATCH', body: { preferredLang: l } }).catch(() => {});
  }, [router]);

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
    router.push('/');
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ lang, t: getDict(lang), setLang, theme, setTheme, user, setUser, authReady, refreshUser, login, logout }),
    [lang, setLang, theme, setTheme, user, authReady, refreshUser, login, logout]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
