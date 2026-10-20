'use client';

import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useApp } from '@/components/Providers';
import { digits } from '@ghotok/shared';
import { Spinner } from '@/components/ui';

export default function DashboardLayout({ children }) {
  const { t, lang, user, authReady, logout, unread } = useApp();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (authReady && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [authReady, user, router, path]);

  if (!authReady || !user)
    return (
      <div className="container empty">
        <Spinner />
      </div>
    );

  const n = t.dash.nav;
  const links = [
    ['/dashboard', n.overview],
    ['/dashboard/biodata', n.biodata],
    ['/dashboard/favorites', n.favorites],
    ['/dashboard/dislikes', n.dislikes],
    ['/dashboard/favorited-me', n.favoritedMe],
    ['/dashboard/proposals', n.proposals],
    ['/dashboard/unlocked', n.unlocked],
    ['/dashboard/connections', n.connections],
    ['/dashboard/notifications', n.notifications, unread],
    ['/dashboard/support', n.support],
    ['/dashboard/settings', n.settings],
  ];
  const cur = (href) => ((href === '/dashboard' ? path === href : path.startsWith(href)) ? 'page' : undefined);

  return (
    <div className="container">
      <div className="dash">
        <nav className="dash-nav" aria-label="Dashboard">
          {links.map(([href, l, badge]) => (
            <NextLink key={href} href={href} aria-current={cur(href)}>
              <span>{l}</span>
              {badge ? <span className="pill pill-rose">{digits(badge, lang)}</span> : null}
            </NextLink>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ justifyContent: 'flex-start', paddingLeft: 18 }}
            onClick={logout}
          >
            {t.nav.logout}
          </button>
        </nav>
        <div className="dash-main">{children}</div>
      </div>
    </div>
  );
}
