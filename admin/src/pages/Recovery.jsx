import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useLoad } from '../lib/app.jsx';
import { api } from '../lib/api.js';
import { label, dateTime } from '../lib/format.js';
import { Alert, PageHead, Spinner, Tabs, NoteModal } from '../components/ui.jsx';

export default function Recovery() {
  const { t, lang } = useApp();
  const a = t.a.recovery;
  const [status, setStatus] = useState('pending');
  const [decline, setDecline] = useState(null);
  const [msg, setMsg] = useState(null);
  const { data, error, loading, reload } = useLoad(`/admin/recovery?status=${status}`);

  async function decide(id, decision, note) {
    setMsg(null);
    try { await api(`/admin/recovery/${id}`, { method: 'POST', body: { decision, note } }); setDecline(null); reload(); } catch (e) { setMsg(e.message); }
  }

  return (
    <>
      <PageHead title={a.title} sub={a.help} />
      <Tabs value={status} onChange={setStatus} items={[['pending', t.conn.refundStatus.pending], ['approved', t.conn.refundStatus.approved], ['declined', t.conn.refundStatus.rejected]]} />
      <Alert kind="error">{msg}</Alert>
      {loading && !data ? <Spinner /> : error ? <Alert kind="error">{error.message}</Alert> : !data.items.length ? <p className="card empty">{t.a.common.none}</p> : (
        <div className="stack gap-12">
          {data.items.map((b) => (
            <article key={b._id} className="card row wrap between gap-16" style={{ alignItems: 'flex-start' }}>
              <div className="stack gap-4" style={{ flex: '1 1 380px' }}>
                <Link to={`/biodatas/${b._id}`}><b>{b.code || '—'}</b> · {label('type', b.type, lang)} · {b.candidateName || b.owner?.name}</Link>
                <span className="small"><b>{a.deletedAt}:</b> {dateTime(b.deletedAt, lang)} · {label('delete', b.deleteReason, lang)}</span>
                {b.deleteNote && <span className="small muted">{b.deleteNote}</span>}
                {b.recovery?.note && <span className="small"><b>{a.note}:</b> {b.recovery.note}</span>}
                <span className="tiny muted">{b.recovery?.requestedAt && dateTime(b.recovery.requestedAt, lang)}</span>
              </div>
              {b.recovery?.status === 'pending' && (
                <div className="row-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => decide(b._id, 'approve')}>{a.approve}</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setDecline(b)}>{a.decline}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {decline && <NoteModal title={a.decline} label={t.a.bio.note} danger onClose={() => setDecline(null)} onSubmit={(fd) => decide(decline._id, 'decline', fd.get('note') || undefined)} />}
    </>
  );
}
