/**
 * Hook-free components. They render on the server (Next.js server components) and in the
 * browser alike, so they can take non-serialisable props such as a Link component.
 */
import { digits } from '@ghotok/shared';
import { uiText } from './i18n.js';

export function Alert({ kind = 'info', children }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export const Spinner = ({ label = 'Loading' }) => <span className="spinner" role="status" aria-label={label} />;

export const Empty = ({ children }) => <p className="card empty">{children}</p>;

const PILL = {
  approved: 'sage',
  verified: 'sage',
  accepted: 'sage',
  resolved: 'sage',
  answered: 'sage',
  active: 'sage',
  replied: 'sage',
  pending: 'amber',
  submitted: 'amber',
  initiated: 'amber',
  reviewing: 'amber',
  open: 'amber',
  new: 'amber',
  urgent: 'danger',
  rejected: 'danger',
  declined: 'danger',
  failed: 'danger',
  changes_requested: 'danger',
  suspended: 'danger',
  draft: 'line',
  cancelled: 'line',
  withdrawn: 'line',
  closed: 'line',
  dismissed: 'line',
  none: 'line',
  deleted: 'line',
};

export const StatusPill = ({ status, children }) => (
  <span className={`pill pill-${PILL[status] || 'rose'}`}>{children || status}</span>
);

/** Previous / next pager for { page, pages } results. Use `href` for links or `onChange` for buttons. */
export function Pager({ page, pages, lang, onChange, href, LinkComponent = 'a' }) {
  if (!pages || pages <= 1) return null;
  const t = uiText(lang);
  const Btn = ({ to, children }) =>
    href ? (
      <LinkComponent className="btn btn-outline btn-sm" href={href(to)}>
        {children}
      </LinkComponent>
    ) : (
      <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange(to)}>
        {children}
      </button>
    );
  return (
    <nav aria-label="Pagination" className="row gap-8 wrap" style={{ justifyContent: 'center', paddingTop: 12 }}>
      {page > 1 && <Btn to={page - 1}>{t.prev}</Btn>}
      <span className="small muted" style={{ padding: '0 10px' }}>
        {t.page} {digits(page, lang)} / {digits(pages, lang)}
      </span>
      {page < pages && <Btn to={page + 1}>{t.next}</Btn>}
    </nav>
  );
}

/** Segmented tabs. items: [[value, label, count?]] */
export function Tabs({ value, onChange, items, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map(([v, l, count]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)}>
          {l}
          {count ? <span className="tab-count">{count}</span> : null}
        </button>
      ))}
    </div>
  );
}
