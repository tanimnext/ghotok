import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useLoad } from '../lib/app.jsx';
import { api } from '../lib/api.js';
import { label, dateTime, statusLabel } from '@ghotok/shared';
import { Alert, PageHead, Pill, Spinner, Tabs, NoteModal } from '../components/ui.jsx';

export default function Refunds() {
  const { t, lang } = useApp();
  const a = t.refund;
  const [status, setStatus] = useState('pending');
  const [modal, setModal] = useState(null);
  const [msg, setMsg] = useState(null);
  const { data, error, loading, reload } = useLoad(`/admin/refunds?status=${status}`);

  async function decide(id, decision, resolution) {
    setMsg(null);
    try {
      await api(`/admin/refunds/${id}`, { method: 'POST', body: { decision, resolution } });
      setModal(null);
      reload();
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <>
      <PageHead title={a.title} />
      <Tabs
        value={status}
        onChange={setStatus}
        items={['pending', 'approved', 'rejected'].map((s) => [s, statusLabel('refund', s, lang)])}
      />
      <Alert kind="error">{msg}</Alert>
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <Alert kind="error">{error.message}</Alert>
      ) : !data.items.length ? (
        <p className="card empty">{t.common.none}</p>
      ) : (
        <div className="stack gap-12">
          {data.items.map((r) => (
            <article key={r._id} className="card row wrap between gap-16" style={{ alignItems: 'flex-start' }}>
              <div className="stack gap-4" style={{ flex: '1 1 380px' }}>
                <div className="row wrap gap-8">
                  <b>{r.biodata ? `GH-${r.biodata.biodataNo}` : '—'}</b>
                  <Pill status={r.status}>{statusLabel('refund', r.status, lang)}</Pill>
                  {r.report && <span className="pill pill-line">{a.report}</span>}
                </div>
                <span className="small">
                  <b>{a.reason}:</b> {label('report', r.reason, lang) || r.reason}
                </span>
                {r.details && (
                  <span className="small muted" style={{ whiteSpace: 'pre-line' }}>
                    {r.details}
                  </span>
                )}
                {r.resolution && (
                  <span className="small">
                    <b>{a.resolution}:</b> {r.resolution}
                  </span>
                )}
                <span className="tiny muted">
                  {r.user && <Link to={`/users/${r.user._id}`}>{r.user.name}</Link>} · {dateTime(r.createdAt, lang)}
                </span>
              </div>
              {r.status === 'pending' && (
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setModal({ r, decision: 'approved' })}
                  >
                    {a.approve}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setModal({ r, decision: 'rejected' })}
                  >
                    {a.reject}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {modal && (
        <NoteModal
          title={modal.decision === 'approved' ? a.approve : a.reject}
          label={a.resolution}
          required={modal.decision === 'rejected'}
          danger={modal.decision === 'rejected'}
          onClose={() => setModal(null)}
          onSubmit={(fd) => decide(modal.r._id, modal.decision, fd.get('note') || undefined)}
        />
      )}
    </>
  );
}
