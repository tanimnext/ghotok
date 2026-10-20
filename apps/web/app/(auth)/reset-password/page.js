'use client';
/** Set a new password with the token from the email link, or with the SMS code. */
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { digits } from '@ghotok/shared';
import { useApp } from '@/components/Providers';
import { api } from '@/lib/api';
import { Alert, Field } from '@/components/ui';
import AuthShell from '../AuthShell';

function ResetForm() {
  const { t, lang, login } = useApp();
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get('token') || '';
  const phone = sp.get('phone') || '';
  const [code, setCode] = useState('');
  const [password, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const body = token ? { token, password } : { phone, code, password };
      const d = await api('/auth/reset-password', { method: 'POST', body });
      login(d.token, d.user);
      router.push('/dashboard');
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t.auth.resetTitle} sub={phone ? t.otp.sentTo.replace('{phone}', digits(phone, lang)) : null}>
      <form onSubmit={submit} className="stack gap-16">
        {!token && phone && (
          <Field id="code" label={t.otp.code} required>
            <input
              id="code"
              className="input otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        )}
        <Field id="pw" label={t.auth.newPassword} required hint={t.auth.passwordHint}>
          <input
            id="pw"
            type="password"
            className="input"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPw(e.target.value)}
            required
          />
        </Field>
        <Alert kind="error">{err || (!token && !phone ? t.auth.resetInvalid : null)}</Alert>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy || (!token && !phone)}>
          {t.common.save}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
