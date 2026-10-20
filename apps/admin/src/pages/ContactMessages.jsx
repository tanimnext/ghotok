import { useState } from 'react';
import { dateTime, statusLabel, statusOptions } from '@ghotok/shared';
import { useApp, useLoad } from '../lib/app.jsx';
import { api } from '../lib/api.js';
import { Alert, PageHead, Pager, Pill, Spinner, Tabs, NoteModal } from '../components/ui.jsx';

/** Messages sent from the public contact form; staff reply by email from here. */
export default function ContactMessages() {
  const { t, lang } = useApp();
  const c = t.contact;
  const [status, setStatus] = useState('new');
  const [page, setPage] = useState(1);
  const [reply, setReply] = useState(null);
  const [msg, setMsg] = useState(null);
  const params = new URLSearchParams({ page, ...(status && { status }) });
  const { data, error, loading, reload } = useLoad(`/admin/contact-messages?${params}`);

  async function send(m, text) {
    setMsg(null);
    try {
      await api(`/admin/contact-messages/${m._id}/reply`, { method: 'POST', body: { reply: text } });
      setReply(null);
      setMsg({ kind: 'ok', text: c.replied });
      reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e.message });
    }
  }
  async function setState(m, next) {
    try {
      await api(`/admin/contact-messages/${m._id}/status`, { method: 'POST', body: { status: next } });
      reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e.message });
    }
  }

  return (
    <>
      <PageHead title={c.title} />
      <Tabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        items={[...statusOptions('contact', lang), ['', t.common.all]]}
      />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <Alert kind="error">{error.message}</Alert>
      ) : !data.items.length ? (
        <p className="card empty">{t.common.none}</p>
      ) : (
        <div className="stack gap-12">
          {data.items.map((m) => (
            <article key={m._id} className="card stack gap-8">
              <div className="row between wrap gap-8">
                <span className="stack">
                  <b>{m.subject}</b>
                  <span className="tiny muted">
                    {m.name} · <a href={`mailto:${m.email}`}>{m.email}</a>
                    {m.phone ? ` · ${m.phone}` : ''} · {dateTime(m.createdAt, lang)}
                  </span>
                </span>
                <Pill status={m.status}>{statusLabel('contact', m.status, lang)}</Pill>
              </div>
              <p style={{ whiteSpace: 'pre-line' }}>{m.message}</p>
              {m.reply && (
                <Alert kind="info">
                  <b>{c.yourReply}</b>
                  {m.repliedBy?.name ? ` (${m.repliedBy.name})` : ''}: {m.reply}
                </Alert>
              )}
              <div className="row-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setReply(m)}>
                  {c.reply}
                </button>
                {m.status === 'closed' ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState(m, 'new')}>
                    {c.reopen}
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState(m, 'closed')}>
                    {c.close}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <Pager data={data} page={page} setPage={setPage} />
      {reply && (
        <NoteModal
          title={`${c.reply} · ${reply.email}`}
          label={c.replyLabel}
          required
          confirmLabel={c.send}
          onClose={() => setReply(null)}
          onSubmit={(fd) => send(reply, fd.get('note'))}
        />
      )}
    </>
  );
}
