import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useLoad } from '../lib/app.jsx';
import { api, download } from '../lib/api.js';
import { label, digits, taka, dateTime, statusLabel } from '@ghotok/shared';
import { Alert, PageHead, Pager, Pill, Spinner, Tabs, NoteModal } from '../components/ui.jsx';

export default function Payments() {
  const { t, lang } = useApp();
  const a = t.pay;
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [reject, setReject] = useState(null);
  const [msg, setMsg] = useState(null);
  const [range, setRange] = useState({ from: '', to: '' });
  const [exporting, setExporting] = useState(false);
  const filters = {
    ...(status && { status }),
    ...(query && { q: query }),
    ...(range.from && { from: range.from }),
    ...(range.to && { to: range.to }),
  };
  const params = new URLSearchParams({ page, ...filters });

  async function exportCsv() {
    setExporting(true);
    try {
      await download(`/admin/payments/export?${new URLSearchParams(filters)}`, 'ghotok-payments.csv');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setExporting(false);
    }
  }
  const { data, error, loading, reload } = useLoad(`/admin/payments?${params}`);

  async function act(id, path, body) {
    setMsg(null);
    try {
      await api(`/admin/payments/${id}/${path}`, { method: 'POST', body });
      setReject(null);
      reload();
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <>
      <PageHead title={a.title}>
        <form
          className="row gap-8"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q);
            setPage(1);
          }}
        >
          <input
            className="input"
            style={{ width: 260 }}
            placeholder={a.searchPh}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t.search}
          />
          <button className="btn btn-outline btn-sm" type="submit">
            {t.search}
          </button>
        </form>
        <div className="row gap-8 wrap">
          <label className="row gap-4 small">
            {t.common.from}
            <input
              type="date"
              className="input input-sm"
              value={range.from}
              onChange={(e) => {
                setRange((r) => ({ ...r, from: e.target.value }));
                setPage(1);
              }}
            />
          </label>
          <label className="row gap-4 small">
            {t.common.to}
            <input
              type="date"
              className="input input-sm"
              value={range.to}
              onChange={(e) => {
                setRange((r) => ({ ...r, to: e.target.value }));
                setPage(1);
              }}
            />
          </label>
          <button type="button" className="btn btn-gold btn-sm" onClick={exportCsv} disabled={exporting}>
            {exporting ? a.exporting : a.export}
          </button>
        </div>
      </PageHead>
      <Tabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        items={['pending', 'approved', 'rejected', 'initiated', 'failed', ''].map((s) => [
          s,
          s ? statusLabel('payment', s, lang) : t.bio.all,
        ])}
      />
      <Alert kind="error">{msg}</Alert>
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <Alert kind="error">{error.message}</Alert>
      ) : !data.items.length ? (
        <p className="card empty">{t.common.none}</p>
      ) : (
        <section className="card" style={{ padding: 8 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{a.user}</th>
                  <th>{a.method}</th>
                  <th>{a.sender}</th>
                  <th>{a.trx}</th>
                  <th>{a.pkg}</th>
                  <th>{a.amount}</th>
                  <th>{a.when}</th>
                  <th>{t.common.status}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {p.user ? (
                        <Link to={`/users/${p.user._id}`} className="stack">
                          <b>{p.user.name}</b>
                          <span className="tiny muted">{p.user.phone || p.user.email}</span>
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {label('method', p.method, lang)}
                      {p.gateway === 'bkash_api' && <span className="tiny muted"> · API</span>}
                    </td>
                    <td>{p.senderNumber || '—'}</td>
                    <td>
                      <code style={{ fontWeight: 700 }}>{p.trxId || '—'}</code>
                    </td>
                    <td>
                      {p.package?.name?.[lang]} · {digits(p.connections, lang)}
                    </td>
                    <td>
                      <b>{taka(p.amount, lang)}</b>
                    </td>
                    <td className="small">{dateTime(p.createdAt, lang)}</td>
                    <td>
                      <Pill status={p.status}>{statusLabel('payment', p.status, lang)}</Pill>
                      {p.reviewedBy && <div className="tiny muted">{p.reviewedBy.name}</div>}
                      {p.note && <div className="tiny muted">{p.note}</div>}
                    </td>
                    <td>
                      {['pending', 'initiated'].includes(p.status) && (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => act(p._id, 'approve', {})}
                          >
                            {a.approve}
                          </button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setReject(p)}>
                            {a.reject}
                          </button>
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
      {reject && (
        <NoteModal
          title={`${a.reject} · ${reject.trxId || ''}`}
          label={a.reason}
          required
          danger
          onClose={() => setReject(null)}
          onSubmit={(fd) => act(reject._id, 'reject', { note: fd.get('note') })}
        />
      )}
    </>
  );
}
