'use client';

import { useState } from 'react';
import { useApp } from '@/components/Providers';
import { api } from '@/lib/api';
import { Alert, Field } from '@/components/ui';

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '', website: '' };

export default function ContactForm() {
  const { t, user } = useApp();
  const c = t.contact;
  const [f, setF] = useState(() => ({ ...EMPTY, name: user?.name || '', email: user?.email || '' }));
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api('/contact', { method: 'POST', body: { ...f, phone: f.phone || undefined } });
      setDone(true);
      setF(EMPTY);
    } catch (ex) {
      setErr(ex);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Alert kind="ok">{c.sent}</Alert>;
  const fe = (k) => err?.fields?.[k];
  return (
    <form onSubmit={submit} className="stack gap-16">
      <div className="grid grid-2" style={{ gap: 16 }}>
        <Field id="c-name" label={t.auth.name} required error={fe('name')}>
          <input
            id="c-name"
            className="input"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            value={f.name}
            onChange={set('name')}
          />
        </Field>
        <Field id="c-email" label={t.auth.email} required error={fe('email')}>
          <input
            id="c-email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={f.email}
            onChange={set('email')}
          />
        </Field>
        <Field id="c-phone" label={`${t.auth.phone} (${t.common.optional})`} error={fe('phone')}>
          <input
            id="c-phone"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={f.phone}
            onChange={set('phone')}
          />
        </Field>
        <Field id="c-subject" label={c.subject} required error={fe('subject')}>
          <input
            id="c-subject"
            className="input"
            required
            minLength={3}
            maxLength={160}
            value={f.subject}
            onChange={set('subject')}
          />
        </Field>
      </div>
      <Field id="c-message" label={c.message} required error={fe('message')}>
        <textarea
          id="c-message"
          className="textarea"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          value={f.message}
          onChange={set('message')}
        />
      </Field>
      {/* Honeypot: hidden from people, bots fill it in. */}
      <input
        type="text"
        name="website"
        value={f.website}
        onChange={set('website')}
        tabIndex={-1}
        autoComplete="off"
        className="hp"
        aria-hidden="true"
      />
      <Alert kind="error">{err && !err.fields ? err.message : null}</Alert>
      <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy}>
        {busy ? t.common.saving : t.common.send}
      </button>
    </form>
  );
}
