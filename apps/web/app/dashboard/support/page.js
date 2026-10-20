'use client';

import NextLink from 'next/link';
import { useState } from 'react';
import { useApp } from '@/components/Providers';
import { useLoad } from '@/components/useLoad';
import { api } from '@/lib/api';
import { date, label } from '@ghotok/shared';
import { Alert, Field, Spinner, StatusPill } from '@/components/ui';

export default function Support() {
  const { t, lang } = useApp();
  const tickets = useLoad('/me/tickets');
  const reports = useLoad('/me/reports');
  const [f, setF] = useState({ subject: '', category: 'other', body: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const s = t.support;

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api('/me/tickets', { method: 'POST', body: f });
      setF({ subject: '', category: 'other', body: '' });
      tickets.reload();
    } catch (ex) {
      setErr(ex);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="stack gap-8">
        <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>
          {s.title}
        </h1>
        <p className="muted">{s.sub}</p>
      </div>

      <form onSubmit={create} className="card stack gap-16">
        <h2 className="h3">{s.newTicket}</h2>
        <div className="grid grid-2" style={{ gap: 16 }}>
          <Field id="subj" label={s.subject} required error={err?.fields?.subject}>
            <input
              id="subj"
              className="input"
              required
              minLength={3}
              maxLength={160}
              value={f.subject}
              onChange={(e) => setF({ ...f, subject: e.target.value })}
            />
          </Field>
          <Field id="cat" label={s.category}>
            <select
              id="cat"
              className="select"
              value={f.category}
              onChange={(e) => setF({ ...f, category: e.target.value })}
            >
              {Object.entries(s.cats).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="body" label={s.message} required error={err?.fields?.body}>
          <textarea
            id="body"
            className="textarea"
            required
            minLength={5}
            maxLength={4000}
            value={f.body}
            onChange={(e) => setF({ ...f, body: e.target.value })}
          />
        </Field>
        <Alert kind="error">{err && !err.fields ? err.message : null}</Alert>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy}>
          {t.common.send}
        </button>
      </form>

      <section className="card stack gap-8">
        <h2 className="h3">{s.title}</h2>
        {tickets.loading && !tickets.data ? (
          <Spinner />
        ) : !tickets.data?.items.length ? (
          <p className="muted">{s.empty}</p>
        ) : (
          tickets.data.items.map((tk) => (
            <NextLink key={tk._id} href={`/dashboard/support/${tk._id}`} className="list-row">
              <span className="stack">
                <b>{tk.subject}</b>
                <span className="tiny muted">
                  {s.cats[tk.category]} · {date(tk.lastActivityAt, lang)}
                </span>
              </span>
              <StatusPill status={tk.status}>{s.status[tk.status]}</StatusPill>
            </NextLink>
          ))
        )}
      </section>

      <section className="card stack gap-8">
        <h2 className="h3">{s.reports}</h2>
        {reports.loading && !reports.data ? (
          <Spinner />
        ) : !reports.data?.items.length ? (
          <p className="muted">{t.conn.empty}</p>
        ) : (
          reports.data.items.map((r) => (
            <div key={r._id} className="list-row">
              <span className="stack">
                <b className="small">
                  {r.biodata ? `GH-${r.biodata.biodataNo}` : '—'} · {label('report', r.reason, lang)}
                </b>
                <span className="tiny muted">
                  {date(r.createdAt, lang)}
                  {r.action ? ` · ${r.action}` : ''}
                </span>
              </span>
              <StatusPill status={r.status}>{s.reportStatus[r.status]}</StatusPill>
            </div>
          ))
        )}
      </section>
    </>
  );
}
