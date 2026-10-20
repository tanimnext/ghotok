import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useLoad } from '../lib/app.jsx';
import { api } from '../lib/api.js';
import { label, digits, taka, dateTime } from '../lib/format.js';
import { Alert, PageHead, Pager, Pill, Spinner, Tabs, NoteModal } from '../components/ui.jsx';

export default function Payments() {
  const { t, lang } = useApp();
  const a = t.a.pay;
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [reject, setReject] = useState(null);
  const [msg, setMsg] = useState(null);
  const params = new URLSearchParams({ page, ...(status && { status }), ...(query && { q: query }) });
  const { data, error, loading, reload } = useLoad(`/admin/payments?${params}`);

  async function act(id, path, body) {
    setMsg(null);
    try { await api(`/admin/payments/${id}/${path}`, { method: 'POST', body }); setReject(null); reload(); }
    catch (e) { setMsg(e.message); }
  }

  return (
    <>
      <PageHead title={a.title}>
        <form className="row gap-8" onSubmit={(e) => { e.preventDefault(); setQuery(q); setPage(1); }}>
          <input className="input" style={{ width: 260 }} placeholder={a.searchPh} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.a.search} />
          <button className="btn btn-outline btn-sm" type="submit">{t.a.search}</button>
        </form>
      </PageHead>
      <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} items={['pending', 'approved', 'rejected', 'initiated', 'failed', ''].map((s) => [s, s ? t.conn.payStatus[s] : t.a.bio.all])} />
      <Alert kind="error">{msg}</Alert>
      {loading && !data ? <Spinner /> : error ? <Alert kind="error">{error.message}</Alert> : !data.items.length ? <p className="card empty">{t.a.common.none}</p> : (
        <section className="card" style={{ padding: 8 }}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{a.user}</th><th>{a.method}</th><th>{a.sender}</th><th>{a.trx}</th><th>{a.pkg}</th><th>{a.amount}</th><th>{a.when}</th><th>{t.a.common.status}</th><th /></tr></thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p._id}>
                    <td>{p.user ? <Link to={`/users/${p.user._id}`} className="stack"><b>{p.user.name}</b><span className="tiny muted">{p.user.phone || p.user.email}</span></Link> : '—'}</td>
                    <td>{label('method', p.method, lang)}{p.gateway === 'bkash_api' && <span className="tiny muted"> · API</span>}</td>
                    <td>{p.senderNumber || '—'}</td>
                    <td><code style={{ fontWeight: 700 }}>{p.trxId || '—'}</code></td>
                    <td>{p.package?.name?.[lang]} · {digits(p.connections, lang)}</td>
                    <td><b>{taka(p.amount, lang)}</b></td>
                    <td className="small">{dateTime(p.createdAt, lang)}</td>
                    <td><Pill status={p.status}>{t.conn.payStatus[p.status]}</Pill>{p.reviewedBy && <div className="tiny muted">{p.reviewedBy.name}</div>}{p.note && <div className="tiny muted">{p.note}</div>}</td>
                    <td>
                      {['pending', 'initiated'].includes(p.status) && (
                        <div className="row-actions">
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => act(p._id, 'approve', {})}>{a.approve}</button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setReject(p)}>{a.reject}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <Pager data={data} page={page} setPage={setPage} />
      {reject && <NoteModal title={`${a.reject} · ${reject.trxId || ''}`} label={a.reason} required danger onClose={() => setReject(null)} onSubmit={(fd) => act(reject._id, 'reject', { note: fd.get('note') })} />}
    </>
  );
}
