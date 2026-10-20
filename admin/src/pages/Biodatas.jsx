import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp, useLoad } from '../lib/app.jsx';
import { label, digits, date } from '../lib/format.js';
import { Alert, PageHead, Pager, Pill, Spinner, Tabs } from '../components/ui.jsx';

export default function Biodatas({ nidMode = false }) {
  const { t, lang } = useApp();
  const a = t.a.bio;
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') ?? (nidMode ? '' : 'pending');
  const nid = nidMode ? sp.get('nid') || 'submitted' : '';
  const deleted = sp.get('deleted') === '1';
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const params = new URLSearchParams({ page, ...(status && { status }), ...(nid && { nid }), ...(deleted && { deleted: '1' }), ...(query && { q: query }) });
  const { data, error, loading } = useLoad(`/admin/biodatas?${params}`);
  const setFilter = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); setPage(1); };

  const statusTabs = [['pending', t.dash.status.pending], ['approved', t.dash.status.approved], ['changes_requested', t.dash.status.changes_requested], ['rejected', t.dash.status.rejected], ['draft', t.dash.status.draft], ['', a.all]];
  const nidTabs = Object.entries(t.form.nidStatus).map(([k, v]) => [k, v]);

  return (
    <>
      <PageHead title={nidMode ? t.a.nav.nid : a.title}>
        <form className="row gap-8" onSubmit={(e) => { e.preventDefault(); setQuery(q); setPage(1); }}>
          <input className="input" style={{ width: 260 }} placeholder="GH-1001 / name / phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.a.search} />
          <button className="btn btn-outline btn-sm" type="submit">{t.a.search}</button>
        </form>
      </PageHead>
      {nidMode ? <Tabs value={nid} onChange={(v) => setFilter('nid', v)} items={nidTabs} />
        : (
          <div className="row wrap gap-12">
            <Tabs value={deleted ? '__deleted' : status} onChange={(v) => { const n = new URLSearchParams(); if (v === '__deleted') n.set('deleted', '1'); else n.set('status', v); setSp(n); setPage(1); }} items={[...statusTabs, ['__deleted', a.deleted]]} />
          </div>
        )}
      {loading && !data ? <Spinner /> : error ? <Alert kind="error">{error.message}</Alert> : !data.items.length ? <p className="card empty">{a.queueEmpty}</p> : (
        <section className="card" style={{ padding: 8 }}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>ID</th><th>{a.type}</th><th>{a.owner}</th><th>{t.bio.f.age}</th><th>{t.bio.f.religion}</th><th>{t.bio.f.permanentAddress}</th><th>{a.status}</th><th>NID</th><th>{a.submitted}</th><th /></tr></thead>
              <tbody>
                {data.items.map((b) => (
                  <tr key={b._id}>
                    <td><b>{b.code || '—'}</b></td>
                    <td>{label('type', b.type, lang)}</td>
                    <td><span className="stack"><span>{b.candidateName || b.owner?.name}</span><span className="tiny muted">{b.owner?.email || b.owner?.phone}</span></span></td>
                    <td>{b.age ? digits(b.age, lang) : '—'}</td>
                    <td>{label('religion', b.religion, lang)}</td>
                    <td>{label('district', b.permanentDistrict, lang)}</td>
                    <td><Pill status={b.status}>{t.dash.status[b.status]}</Pill>{b.hidden && <span className="pill pill-line" style={{ marginLeft: 4 }}>hidden</span>}</td>
                    <td><Pill status={b.nidStatus}>{t.form.nidStatus[b.nidStatus]}</Pill></td>
                    <td className="small">{date(b.submittedAt || b.updatedAt, lang)}</td>
                    <td><Link to={`/biodatas/${b._id}`} className="btn btn-primary btn-sm">{a.open}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <Pager data={data} page={page} setPage={setPage} />
    </>
  );
}
