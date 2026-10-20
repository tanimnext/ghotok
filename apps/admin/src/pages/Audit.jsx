import { useState } from 'react';
import { useApp, useLoad } from '../lib/app.jsx';
import { dateTime, statusLabel } from '@ghotok/shared';
import { Alert, PageHead, Pager, Spinner } from '../components/ui.jsx';

export default function Audit() {
  const { t, lang } = useApp();
  const a = t.audit;
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { data, error, loading } = useLoad(`/admin/audit?page=${page}${action ? `&action=${action}` : ''}`);
  return (
    <>
      <PageHead title={a.title}>
        <select
          className="select"
          style={{ width: 220 }}
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          aria-label={a.action}
        >
          <option value="">{t.bio.all}</option>
          {['biodata', 'nid', 'payment', 'refund', 'connections', 'report', 'recovery', 'user', 'package'].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </PageHead>
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
                  <th>{t.common.date}</th>
                  <th>{a.actor}</th>
                  <th>{a.action}</th>
                  <th>{a.target}</th>
                  <th>{a.details}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((x) => (
                  <tr key={x._id}>
                    <td className="small">{dateTime(x.createdAt, lang)}</td>
                    <td>
                      {x.actor?.name}
                      <div className="tiny muted">{x.actor && statusLabel('role', x.actor.role, lang)}</div>
                    </td>
                    <td>
                      <code>{x.action}</code>
                    </td>
                    <td className="small">
                      {x.targetType} <span className="muted">{String(x.targetId || '').slice(-6)}</span>
                    </td>
                    <td className="small muted" style={{ maxWidth: 360, wordBreak: 'break-word' }}>
                      {x.meta
                        ? Object.entries(x.meta)
                            .filter(([, v]) => v !== undefined && v !== null && v !== '')
                            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                            .join(' · ')
                        : ''}
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
