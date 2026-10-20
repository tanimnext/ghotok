import { NavLink, Outlet } from 'react-router-dom';
import { useApp, can, useLoad } from '../lib/app.jsx';
import { WEB_URL } from '../lib/api.js';
import { digits, statusLabel } from '@ghotok/shared';

const Rings = () => (
  <svg width="38" height="30" viewBox="0 0 38 30" fill="none" aria-hidden="true">
    <circle cx="13" cy="15" r="10" style={{ stroke: 'var(--panel-gold)', strokeWidth: 2.4 }} />
    <circle cx="25" cy="15" r="10" style={{ stroke: '#F0A3B8', strokeWidth: 2.4 }} />
  </svg>
);

export function Toggles() {
  const { lang, setLang, theme, setTheme, t } = useApp();
  return (
    <div className="row gap-8">
      <div className="seg" role="group" aria-label={t.nav.language}>
        <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
          EN
        </button>
        <button type="button" aria-pressed={lang === 'bn'} onClick={() => setLang('bn')}>
          বাং
        </button>
      </div>
      <div className="seg" role="group" aria-label={t.nav.theme}>
        <button
          type="button"
          aria-pressed={theme === 'light'}
          aria-label={t.nav.light}
          onClick={() => setTheme('light')}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </button>
        <button type="button" aria-pressed={theme === 'dark'} aria-label={t.nav.dark} onClick={() => setTheme('dark')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const { t, lang, user, logout } = useApp();
  const n = t.nav;
  const { data } = useLoad('/admin/overview');
  const q = data?.queues || {};
  const items = [
    ['/', n.overview, null, 'support'],
    ['/biodatas', n.biodatas, q.biodatasPending, 'support'],
    ['/nid', n.nid, q.nidPending, 'support'],
    ['/payments', n.payments, q.paymentsPending, 'admin'],
    ['/refunds', n.refunds, q.refundsPending, 'admin'],
    ['/reports', n.reports, q.reportsOpen, 'support', q.reportsUrgent],
    ['/recovery', n.recovery, q.recoveryPending, 'admin'],
    ['/tickets', n.tickets, q.ticketsOpen, 'support'],
    ['/users', n.users, null, 'support'],
    ['/contact', n.contact, q.contactNew, 'support'],
    ['/packages', n.packages, null, 'admin'],
    ['/resources', n.resources, null, 'admin'],
    ['/settings', n.settings, null, 'admin'],
    ['/audit', n.audit, null, 'admin'],
  ].filter((i) => can(user, i[3]));

  return (
    <div className="admin-shell">
      <nav className="admin-nav" aria-label="Admin">
        <div className="row gap-12" style={{ padding: '0 12px 22px' }}>
          <Rings />
          <span className="display" style={{ fontSize: 24, fontWeight: 600 }}>
            Ghotok
          </span>
          <span className="pill" style={{ border: '1px solid var(--panel-line)', color: 'var(--panel-gold)' }}>
            ADMIN
          </span>
        </div>
        {items.map(([to, label, badge, , urgent]) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <span>{label}</span>
            {badge ? (
              <span className={`pill nav-badge${urgent ? ' nav-badge-urgent' : ''}`}>{digits(badge, lang)}</span>
            ) : null}
          </NavLink>
        ))}
        <div className="stack gap-8" style={{ marginTop: 'auto', paddingTop: 24 }}>
          <a href={WEB_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--panel-muted)' }}>
            {n.site} ↗
          </a>
          <button type="button" className="btn btn-gold btn-sm" onClick={logout}>
            {n.logout}
          </button>
        </div>
      </nav>
      <div className="admin-main">
        <header className="row between wrap gap-12" style={{ marginBottom: 8 }}>
          <span className="small muted">
            {user.name} · <b>{statusLabel('role', user.role, lang)}</b>
          </span>
          <Toggles />
        </header>
        <Outlet />
      </div>
    </div>
  );
}
