import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useLoad } from '../lib/app.jsx';
import { dateTime, statusLabel, label } from '@ghotok/shared';
import { Alert, PageHead, Pager, Pill, Spinner, Tabs } from '../components/ui.jsx';

export default function Tickets() {
  const { t, lang } = useApp();
  const a = t.ticket;
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const { data, error, loading } = useLoad(`/admin/tickets?page=${page}${status ? `&status=${status}` : ''}`);
  return (
    <>
      <PageHead title={a.title} />
      <Tabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        items={[
          ['open', statusLabel('ticket', 'open', lang)],
          ['answered', statusLabel('ticket', 'answered', lang)],
          ['closed', statusLabel('ticket', 'closed', lang)],
          ['', t.bio.all],
        ]}
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
                  <th>{a.subject}</th>
                  <th>{a.user}</th>
                  <th>{a.category}</th>
                  <th>{a.last}</th>
                  <th>{t.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((tk) => (
                  <tr key={tk._id}>
                    <td>
                      <Link to={`/tickets/${tk._id}`}>
                        <b>{tk.subject}</b>
                      </Link>
                    </td>
                    <td>
                      {tk.user?.name}
                      <div className="tiny muted">{tk.user?.email || tk.user?.phone}</div>
                    </td>
                    <td>{label('ticketCategory', tk.category, lang)}</td>
                    <td className="small">{dateTime(tk.lastActivityAt, lang)}</td>
                    <td>
                      <Pill status={tk.status}>{statusLabel('ticket', tk.status, lang)}</Pill>
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
