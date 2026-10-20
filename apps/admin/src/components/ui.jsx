/* Admin building blocks. Generic components come from @ghotok/ui. */
import { Modal, Pager as SharedPager } from '@ghotok/ui';
import { useApp } from '../lib/app.jsx';

export { Alert, Spinner, Empty, Tabs, Modal, Field, StatusPill as Pill } from '@ghotok/ui';

export function PageHead({ title, sub, children }) {
  const { t } = useApp();
  return (
    <div className="row between wrap gap-16">
      <div className="stack gap-4">
        <span className="eyebrow">{t.kicker}</span>
        <h1 className="display" style={{ fontSize: 'clamp(30px, 3.6vw, 42px)' }}>
          {title}
        </h1>
        {sub && <span className="muted">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

/** Pager for `{ page, pages }` API results. */
export function Pager({ data, page, setPage }) {
  const { lang } = useApp();
  if (!data) return null;
  return <SharedPager page={page} pages={data.pages} lang={lang} onChange={setPage} />;
}

/** Asks for a note, then calls onSubmit(formData). */
export function NoteModal({ title, label, required, confirmLabel, danger, extra, onClose, onSubmit }) {
  const { t } = useApp();
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="stack gap-16"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
      >
        <label className="field">
          <span className={`label${required ? ' req' : ''}`}>{label}</span>
          <textarea
            name="note"
            className="textarea"
            required={required}
            minLength={required ? 3 : undefined}
            maxLength={1000}
          />
        </label>
        {extra}
        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}>
            {confirmLabel || t.common.confirm}
          </button>
        </div>
      </form>
    </Modal>
  );
}
