'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useApp } from './Providers';
import { Rings, Sun, Moon, Menu, X } from './Icons';

export function Toggles() {
  const { lang, setLang, theme, setTheme, t } = useApp();
  return (
    <>
      <div className="seg" role="group" aria-label={t.nav.language}>
        <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
        <button type="button" aria-pressed={lang === 'bn'} onClick={() => setLang('bn')}>বাং</button>
      </div>
      <div className="seg" role="group" aria-label={t.nav.theme}>
        <button type="button" aria-pressed={theme === 'light'} aria-label={t.nav.light} onClick={() => setTheme('light')}><Sun size={18} /></button>
        <button type="button" aria-pressed={theme === 'dark'} aria-label={t.nav.dark} onClick={() => setTheme('dark')}><Moon size={18} /></button>
      </div>
    </>
  );
}

export function Brand() {
  return (
    <NextLink href="/" className="brand" aria-label="Ghotok home">
      <Rings />
      <span className="brand-name">Ghotok</span>
      <span className="brand-bn">ঘটক</span>
    </NextLink>
  );
}

export default function Header() {
  const { t, user, authReady, logout } = useApp();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const links = [
    ['/', t.nav.home],
    ['/biodatas', t.nav.browse],
    ['/packages', t.nav.packages],
    ['/guide', t.nav.guide],
    ['/faq', t.nav.faq],
    ['/contact', t.nav.contact],
  ];
  const cur = (href) => (href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined;

  return (
    <header className="site-header">
      <div className="container">
        <div className="bar">
          <Brand />
          <nav className="nav" aria-label="Primary">
            {links.map(([href, l]) => <NextLink key={href} href={href} aria-current={cur(href)}>{l}</NextLink>)}
          </nav>
          <div className="header-tools">
            <span className="hide-sm row gap-8"><Toggles /></span>
            {authReady && user ? (
              <>
                {user.role !== 'user' && <a className="btn btn-ghost btn-sm hide-sm" href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:5173'}>Admin</a>}
                <NextLink href="/dashboard" className="btn btn-primary btn-sm hide-sm">{t.nav.dashboard}</NextLink>
              </>
            ) : (
              <>
                <NextLink href="/login" className="btn btn-ghost btn-sm hide-sm">{t.nav.login}</NextLink>
                <NextLink href="/register" className="btn btn-primary btn-sm hide-sm">{t.nav.create}</NextLink>
              </>
            )}
            <button type="button" className="menu-btn" aria-label={t.nav.menu} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <nav className="mobile-nav" data-open={open} aria-label="Mobile">
          {links.map(([href, l]) => <NextLink key={href} href={href} aria-current={cur(href)}>{l}</NextLink>)}
          {user ? (
            <>
              <NextLink href="/dashboard">{t.nav.dashboard}</NextLink>
              <button type="button" className="btn btn-ghost" style={{ justifyContent: 'flex-start', paddingLeft: 4 }} onClick={logout}>{t.nav.logout}</button>
            </>
          ) : (
            <>
              <NextLink href="/login">{t.nav.login}</NextLink>
              <NextLink href="/register">{t.nav.create}</NextLink>
            </>
          )}
          <div className="row gap-8" style={{ paddingTop: 14 }}><Toggles /></div>
        </nav>
      </div>
    </header>
  );
}
