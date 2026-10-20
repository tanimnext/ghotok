'use client';

import { useEffect, useRef } from 'react';

export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector('input, select, textarea, button')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
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

export function Alert({ kind = 'info', children }) {
  if (!children) return null;
  return <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Field({ label, hint, error, required, children, id }) {
  return (
    <div className="field">
      <label className={`label${required ? ' req' : ''}`} htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" role="status" aria-label="Loading" />;
}

export function Empty({ children }) {
  return <p className="card empty">{children}</p>;
}

const PILL = {
  approved: 'sage', verified: 'sage', accepted: 'sage', resolved: 'sage', answered: 'sage',
  pending: 'amber', submitted: 'amber', initiated: 'amber', reviewing: 'amber', open: 'amber', draft: 'line',
  rejected: 'danger', declined: 'danger', failed: 'danger', changes_requested: 'danger', cancelled: 'line', withdrawn: 'line', closed: 'line', dismissed: 'line', none: 'line',
};
export function StatusPill({ status, children }) {
  return <span className={`pill pill-${PILL[status] || 'rose'}`}>{children || status}</span>;
}
