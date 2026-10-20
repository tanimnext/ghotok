import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp, useLoad } from '../lib/app.jsx';
import { api } from '../lib/api.js';
import { dateTime, statusLabel, label } from '@ghotok/shared';
import { Alert, Pill, Spinner } from '../components/ui.jsx';

export default function TicketView() {
  const { id } = useParams();
  const { t, lang } = useApp();
  const a = t.ticket;
  const { data, error, loading, reload } = useLoad(`/admin/tickets/${id}`);
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');

  async function reply(close) {
    if (!body.trim()) return;
    setErr('');
    try {
      await api(`/admin/tickets/${id}/messages`, { method: 'POST', body: { body, close } });
      setBody('');
      reload();
    } catch (e) {
      setErr(e.message);
    }
  }
  async function setStatus(status) {
    try {
      await api(`/admin/tickets/${id}/status`, { method: 'POST', body: { status } });
      reload();
    } catch (e) {
      setErr(e.message);
    }
  }

  if (loading && !data) return <Spinner />;
  if (error) return <Alert kind="error">{error.message}</Alert>;
  const tk = data.ticket;
  return (
    <>
      <Link to="/tickets" className="small muted">
        ← {a.title}
      </Link>
      <div className="row between wrap gap-12">
        <div className="stack gap-4">
          <h1 className="display" style={{ fontSize: 'clamp(26px, 3.4vw, 36px)' }}>
            {tk.subject}
          </h1>
          <span className="small muted">
            <Link to={`/users/${tk.user?._id}`}>{tk.user?.name}</Link> · {tk.user?.email || tk.user?.phone} ·{' '}
            {label('ticketCategory', tk.category, lang)}
          </span>
        </div>
        <div className="row gap-8">
          <Pill status={tk.status}>{statusLabel('ticket', tk.status, lang)}</Pill>
          {tk.status === 'closed' ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus('open')}>
              {a.reopen}
            </button>
          ) : (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus('closed')}>
              {a.close}
            </button>
          )}
        </div>
      </div>
      <div className="stack gap-12">
        {tk.messages.map((m) => (
          <div
            key={m._id}
            className="card card-tight stack gap-4"
            style={
              m.staff
                ? { background: 'var(--surface2)', borderColor: 'var(--gold)', marginLeft: 'clamp(0px, 6vw, 80px)' }
                : undefined
            }
          >
            <span className="tiny muted">
              <b>{m.author?.name || (m.staff ? t.ticket.team : tk.user?.name)}</b> · {dateTime(m.createdAt, lang)}
            </span>
            <p style={{ whiteSpace: 'pre-line' }}>{m.body}</p>
          </div>
        ))}
      </div>
      <section className="card stack gap-12">
        <label className="field">
          <span className="label">{a.reply}</span>
          <textarea className="textarea" maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <Alert kind="error">{err}</Alert>
        <div className="row gap-8 wrap">
          <button type="button" className="btn btn-primary" onClick={() => reply(false)}>
            {a.reply}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => reply(true)}>
            {a.replyClose}
          </button>
        </div>
      </section>
    </>
  );
}
