import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { label, digits, date, statusLabel, statusOptions } from '@ghotok/shared';
import { useApp, useLoad } from '../lib/app.jsx';
import { Alert, PageHead, Pager, Pill, Spinner, Tabs } from '../components/ui.jsx';

export default function Biodatas({ nidMode = false }) {
  const { t, lang } = useApp();
  const a = t.bio;
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') ?? (nidMode ? '' : 'pending');
  const nid = nidMode ? sp.get('nid') || 'submitted' : '';
  const deleted = sp.get('deleted') === '1';
  const hidden = sp.get('hidden') === '1';
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const params = new URLSearchParams({
    page,
    ...(status && { status }),
    ...(nid && { nid }),
    ...(deleted && { deleted: '1' }),
    ...(hidden && { hidden: '1' }),
    ...(query && { q: query }),
  });
  const { data, error, loading } = useLoad(`/admin/biodatas?${params}`);
  const setFilter = (k, v) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    setSp(n);
    setPage(1);
  };

  const statusTabs = [
    ...['pending', 'approved', 'changes_requested', 'rejected', 'draft'].map((s) => [
      s,
      statusLabel('biodata', s, lang),
    ]),
    ['', a.all],
    ['__hidden', a.hiddenFilter],
    ['__deleted', a.deleted],
  ];
  const current = deleted ? '__deleted' : hidden ? '__hidden' : status;

  return (
    <>
      <PageHead title={nidMode ? t.nav.nid : a.title}>
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
            placeholder="GH-1001 / name / phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t.search}
          />
          <button className="btn btn-outline btn-sm" type="submit">
            {t.search}
          </button>
        </form>
      </PageHead>
      {nidMode ? (
        <Tabs value={nid} onChange={(v) => setFilter('nid', v)} items={statusOptions('nid', lang)} />
      ) : (
        <Tabs
          value={current}
          onChange={(v) => {
            const n = new URLSearchParams();
            if (v === '__deleted') n.set('deleted', '1');
            else if (v === '__hidden') {
              n.set('hidden', '1');
              n.set('status', '');
            } else n.set('status', v);
            setSp(n);
            setPage(1);
          }}
          items={statusTabs}
        />
      )}
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <Alert kind="error">{error.message}</Alert>
      ) : !data.items.length ? (
        <p className="card empty">{a.queueEmpty}</p>
      ) : (
        <section className="card" style={{ padding: 8 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{a.type}</th>
                  <th>{a.owner}</th>
                  <th>{t.list.age}</th>
                  <th>{t.list.religion}</th>
                  <th>{t.list.district}</th>
                  <th>{a.status}</th>
                  <th>NID</th>
                  <th>{a.submitted}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <b>{b.code || '—'}</b>
                    </td>
                    <td>{label('type', b.type, lang)}</td>
                    <td>
                      <span className="stack">
                        <span>{b.candidateName || b.owner?.name}</span>
                        <span className="tiny muted">{b.owner?.email || b.owner?.phone}</span>
                      </span>
                    </td>
                    <td>{b.age ? digits(b.age, lang) : '—'}</td>
                    <td>{label('religion', b.religion, lang)}</td>
                    <td>
                      {b.livesAbroad
                        ? label('country', b.presentCountry, lang)
                        : label('district', b.permanentDistrict, lang)}
                    </td>
                    <td>
                      <Pill status={b.status}>{statusLabel('biodata', b.status, lang)}</Pill>
                      {b.hidden && (
                        <span className="pill pill-line" style={{ marginLeft: 4 }}>
                          {t.common.hidden}
                        </span>
                      )}
                    </td>
                    <td>
                      <Pill status={b.nidStatus}>{statusLabel('nid', b.nidStatus, lang)}</Pill>
                    </td>
                    <td className="small">{date(b.submittedAt || b.updatedAt, lang)}</td>
                    <td>
                      <Link to={`/biodatas/${b._id}`} className="btn btn-primary btn-sm">
                        {a.open}
                      </Link>
                    </td>
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
