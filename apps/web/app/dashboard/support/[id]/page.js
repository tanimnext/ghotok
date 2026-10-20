'use client';

import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useApp } from '@/components/Providers';
import { useLoad } from '@/components/useLoad';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { Alert, Spinner, StatusPill } from '@/components/ui';

export default function Ticket() {
  const { id } = useParams();
  const { t, lang } = useApp();
  const { data, error, loading, setData } = useLoad(`/me/tickets/${id}`);
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');
  const s = t.support;

  async function reply(e) {
    e.preventDefault();
    setErr('');
    try {
      const d = await api(`/me/tickets/${id}/messages`, { method: 'POST', body: { body } });
      setData({ ticket: d.ticket });
      setBody('');
    } catch (ex) { setErr(ex.message); }
  }

  if (loading && !data) return <Spinner />;
  if (error) return <Alert kind="error">{error.message}</Alert>;
  const tk = data.ticket;

  return (
    <>
      <NextLink href="/dashboard/support" className="small muted">← {s.title}</NextLink>
      <div className="row between wrap gap-12">
        <h1 className="display" style={{ fontSize: 'clamp(26px, 3.4vw, 36px)' }}>{tk.subject}</h1>
        <StatusPill status={tk.status}>{s.status[tk.status]}</StatusPill>
      </div>
      <div className="stack gap-12">
        {tk.messages.map((m) => (
          <div key={m._id} className="card card-tight stack gap-4" style={m.staff ? { background: 'var(--surface2)', borderColor: 'var(--gold)' } : { marginLeft: 'clamp(0px, 6vw, 80px)' }}>
            <span className="tiny muted"><b>{m.staff ? s.team : s.you}</b> · {dateTime(m.createdAt, lang)}</span>
            <p style={{ whiteSpace: 'pre-line' }}>{m.body}</p>
          </div>
        ))}
      </div>
      {tk.status === 'closed' ? <Alert kind="info">{s.closed}</Alert> : (
        <form onSubmit={reply} className="card stack gap-12">
          <label className="field"><span className="label">{t.common.reply}</span><textarea className="textarea" required maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} /></label>
          <Alert kind="error">{err}</Alert>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>{t.common.send}</button>
        </form>
      )}
    </>
  );
}
