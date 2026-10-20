import { useEffect, useRef } from 'react';
import { useApp } from '../lib/app.jsx';
import { digits } from '../lib/format.js';

export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector('input, select, textarea, button')?.focus();
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h2 className="h3">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export const Alert = ({ kind = 'info', children }) => (children ? <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div> : null);
export const Spinner = () => <span className="spinner" role="status" aria-label="Loading" />;

const PILL = {
  approved: 'sage', verified: 'sage', accepted: 'sage', resolved: 'sage', answered: 'sage', active: 'sage',
  pending: 'amber', submitted: 'amber', initiated: 'amber', reviewing: 'amber', open: 'amber', draft: 'line',
  rejected: 'danger', declined: 'danger', failed: 'danger', changes_requested: 'danger', suspended: 'danger', cancelled: 'line', closed: 'line', dismissed: 'line', none: 'line',
};
export const Pill = ({ status, children }) => <span className={`pill pill-${PILL[status] || 'rose'}`}>{children || status}</span>;

export function PageHead({ title, sub, children }) {
  return (
    <div className="row between wrap gap-16">
      <div className="stack gap-4">
        <span className="eyebrow">{useApp().t.a.kicker}</span>
        <h1 className="display" style={{ fontSize: 'clamp(30px, 3.6vw, 42px)' }}>{title}</h1>
        {sub && <span className="muted">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

export function Pager({ data, page, setPage }) {
  const { t, lang } = useApp();
  if (!data || data.pages <= 1) return null;
  return (
    <nav className="row gap-8" style={{ justifyContent: 'center' }} aria-label="Pagination">
      <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t.a.common.prev}</button>
      <span className="small muted">{t.a.common.page} {digits(page, lang)} {t.a.common.of} {digits(data.pages, lang)}</span>
      <button type="button" className="btn btn-outline btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>{t.a.common.next}</button>
    </nav>
  );
}

export function Tabs({ value, onChange, items }) {
  return (
    <div className="tabs" role="tablist">
      {items.map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

/** Asks for a note, then calls onSubmit(note). */
export function NoteModal({ title, label, required, confirmLabel, danger, extra, onClose, onSubmit }) {
  const { t } = useApp();
  let note = '';
  return (
    <Modal title={title} onClose={onClose}>
      <form className="stack gap-16" onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}>
        <label className="field"><span className={`label${required ? ' req' : ''}`}>{label}</span>
          <textarea name="note" className="textarea" required={required} minLength={required ? 3 : undefined} maxLength={1000} defaultValue={note} />
        </label>
        {extra}
        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t.a.common.cancel}</button>
          <button type="submit" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}>{confirmLabel || t.a.common.confirm}</button>
        </div>
      </form>
    </Modal>
  );
}
