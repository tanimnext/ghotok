import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useLoad } from '../lib/app.jsx';
import { api } from '../lib/api.js';
import { label, dateTime } from '../lib/format.js';
import { Alert, PageHead, Pager, Pill, Spinner, Tabs, NoteModal } from '../components/ui.jsx';

export default function Reports() {
  const { t, lang } = useApp();
  const a = t.a.report;
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [msg, setMsg] = useState(null);
  const { data, error, loading, reload } = useLoad(`/admin/reports?status=${status}&page=${page}`);

  async function update(id, body) {
    setMsg(null);
    try { await api(`/admin/reports/${id}`, { method: 'POST', body }); setModal(null); reload(); } catch (e) { setMsg(e.message); }
  }

  return (
    <>
      <PageHead title={a.title} />
      <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} items={[['active', a.active], ['resolved', t.support.reportStatus.resolved], ['dismissed', t.support.reportStatus.dismissed]]} />
      <Alert kind="error">{msg}</Alert>
      {loading && !data ? <Spinner /> : error ? <Alert kind="error">{error.message}</Alert> : !data.items.length ? <p className="card empty">{t.a.common.none}</p> : (
        <div className="stack gap-12">
          {data.items.map((r) => (
            <article key={r._id} className="card row wrap between gap-16" style={{ alignItems: 'flex-start' }}>
              <div className="stack gap-4" style={{ flex: '1 1 420px' }}>
                <div className="row wrap gap-8">
                  {r.biodata ? <Link to={`/biodatas/${r.biodata._id}`}><b>GH-{r.biodata.biodataNo}</b></Link> : <b>—</b>}
                  <Pill status={r.status}>{t.support.reportStatus[r.status]}</Pill>
                  {r.requestRefund && <span className="pill pill-amber">{a.refund}</span>}
                  {r.biodata?.hidden && <span className="pill pill-line">hidden</span>}
                </div>
                <span className="small"><b>{a.reason}:</b> {label('report', r.reason, lang)}</span>
                {r.details && <span className="small muted" style={{ whiteSpace: 'pre-line' }}>{r.details}</span>}
                {r.action && <span className="small"><b>{a.action}:</b> {r.action}{r.resolvedBy ? ` — ${r.resolvedBy.name}` : ''}</span>}
                <span className="tiny muted">{a.reporter}: {r.reporter && <Link to={`/users/${r.reporter._id}`}>{r.reporter.name}</Link>} · {dateTime(r.createdAt, lang)}</span>
              </div>
              {['open', 'reviewing'].includes(r.status) && (
                <div className="row-actions">
                  {r.status === 'open' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => update(r._id, { status: 'reviewing' })}>{a.reviewing}</button>}
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ r, status: 'resolved' })}>{a.resolve}</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ r, status: 'dismissed' })}>{a.dismiss}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <Pager data={data} page={page} setPage={setPage} />
      {modal && (
        <NoteModal title={modal.status === 'resolved' ? a.resolve : a.dismiss} label={a.action} required
          extra={modal.status === 'resolved' ? <label className="check"><input type="checkbox" name="hide" value="1" />{a.hideBio}</label> : null}
          onClose={() => setModal(null)} onSubmit={(fd) => update(modal.r._id, { status: modal.status, action: fd.get('note'), hideBiodata: fd.get('hide') === '1' })} />
      )}
    </>
  );
}
