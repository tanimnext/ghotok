'use client';
/** Forgot password: an email gets a reset link, a mobile number gets a 6-digit SMS code. */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { isBdPhone, normalizeBdPhone } from '@ghotok/shared';
import { useApp } from '@/components/Providers';
import { api } from '@/lib/api';
import { Alert, Field } from '@/components/ui';
import AuthShell from '../AuthShell';

export default function ForgotPage() {
  const { t } = useApp();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { identifier } });
      if (isBdPhone(identifier)) router.push(`/reset-password?phone=${normalizeBdPhone(identifier)}`);
      else setDone(true);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t.auth.forgotTitle} sub={t.auth.forgotSub}>
      <form onSubmit={submit} className="stack gap-16">
        <Field id="identifier" label={t.auth.identifier} required>
          <input
            id="identifier"
            className="input"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </Field>
        <Alert kind="error">{err}</Alert>
        {done && <Alert kind="ok">{t.auth.linkSent}</Alert>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {t.auth.sendReset}
        </button>
      </form>
    </AuthShell>
  );
}
