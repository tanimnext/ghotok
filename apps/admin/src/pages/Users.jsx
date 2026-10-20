import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useLoad } from '../lib/app.jsx';
import { digits, date, statusLabel, statusOptions } from '@ghotok/shared';
import { Alert, PageHead, Pager, Pill, Spinner, Tabs } from '../components/ui.jsx';

export default function Users() {
  const { t, lang } = useApp();
  const a = t.users;
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const params = new URLSearchParams({ page, ...(role && { role }), ...(query && { q: query }) });
  const { data, error, loading } = useLoad(`/admin/users?${params}`);

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
      </PageHead>
      <Tabs
        value={role}
        onChange={(v) => {
          setRole(v);
          setPage(1);
        }}
        items={[['', t.bio.all], ...statusOptions('role', lang)]}
      />
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
                  <th>{a.name}</th>
                  <th>{a.contact}</th>
                  <th>{a.role}</th>
                  <th>{a.balance}</th>
                  <th>{a.status}</th>
                  <th>{a.joined}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <Link to={`/users/${u._id}`}>
                        <b>{u.name}</b>
                      </Link>
                    </td>
                    <td className="small">
                      {u.email}
                      <div className="muted">{u.phone}</div>
                    </td>
                    <td>{statusLabel('role', u.role, lang)}</td>
                    <td>{digits(u.connections, lang)}</td>
                    <td>
                      <Pill status={u.status}>{statusLabel('user', u.status, lang)}</Pill>
                    </td>
                    <td className="small">{date(u.createdAt, lang)}</td>
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
