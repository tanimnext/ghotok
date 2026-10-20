'use client';
/** Components that need React hooks (client-only). */
import { useEffect, useId, useRef } from 'react';

/** Dialog with focus handling, Escape to close and a click-outside backdrop. */
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector('input, select, textarea, button')?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h2 className="h3">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Label + control + hint/error, wired up for screen readers. Pass a render function to get the ids. */
export function Field({ id: givenId, label, hint, error, required, children, className = '' }) {
  const autoId = useId();
  const id = givenId || autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control =
    typeof children === 'function'
      ? children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })
      : children;
  return (
    <div className={`field ${className}`.trim()}>
      <label className={`label${required ? ' req' : ''}`} htmlFor={id}>
        {label}
      </label>
      {control}
      {hint && !error && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
