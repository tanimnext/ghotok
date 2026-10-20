'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useApp } from '@/components/Providers';
import { api } from '@/lib/api';
import { Alert, Field } from '@/components/ui';
import AuthShell from '../AuthShell';

function ResetForm() {
  const { t, login } = useApp();
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [password, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const d = await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      login(d.token, d.user);
      router.push('/dashboard');
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <AuthShell title={t.auth.resetTitle}>
      <form onSubmit={submit} className="stack gap-16">
        <Field id="pw" label={t.auth.newPassword} required hint={t.auth.passwordHint}>
          <input id="pw" type="password" className="input" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPw(e.target.value)} required />
        </Field>
        <Alert kind="error">{err}</Alert>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !token}>{t.common.save}</button>
      </form>
    </AuthShell>
  );
}

export default function ResetPage() {
  return <Suspense><ResetForm /></Suspense>;
}
