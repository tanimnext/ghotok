'use client';

import { useState } from 'react';
import { useApp } from '@/components/Providers';
import { api } from '@/lib/api';
import { Alert, Field } from '@/components/ui';
import AuthShell from '../AuthShell';

export default function ForgotPage() {
  const { t } = useApp();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await api('/auth/forgot-password', { method: 'POST', body: { email } }); setDone(true); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  return (
    <AuthShell title={t.auth.forgotTitle} sub={t.auth.forgotSub}>
      <form onSubmit={submit} className="stack gap-16">
        <Field id="email" label={t.auth.email} required>
          <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Alert kind="error">{err}</Alert>
        {done && <Alert kind="ok">{t.auth.linkSent}</Alert>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{t.auth.sendLink}</button>
        <p className="small muted" style={{ textAlign: 'center' }}>{t.auth.phoneOnlyForgot}</p>
      </form>
    </AuthShell>
  );
}
