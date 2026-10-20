'use client';
/** App-style tab bar on phones: Home, Search, Shortlist, Dashboard. */
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from './Providers';
import { Home, Search, Heart, User } from './Icons';

export default function BottomTabs() {
  const { t, user } = useApp();
  const path = usePathname();
  const tabs = [
    ['/', t.nav.home, Home],
    ['/biodatas', t.nav.search, Search],
    [user ? '/dashboard/favorites' : '/login?next=/dashboard/favorites', t.dash.nav.favorites, Heart],
    [user ? '/dashboard' : '/login', user ? t.nav.account : t.nav.login, User],
  ];
  const active = (href) => {
    const h = href.split('?')[0];
    return h === '/'
      ? path === '/'
      : path === h || (h === '/dashboard' && path.startsWith('/dashboard') && !path.startsWith('/dashboard/favorites'));
  };
  return (
    <nav className="bottom-tabs" aria-label={t.nav.quick}>
      {tabs.map(([href, l, Icon]) => (
        <NextLink key={l} href={href} aria-current={active(href) ? 'page' : undefined}>
          <Icon size={22} />
          <span>{l}</span>
        </NextLink>
      ))}
    </nav>
  );
}
