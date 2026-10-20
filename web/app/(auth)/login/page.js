'use client';

import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useApp } from '@/components/Providers';
import { api } from '@/lib/api';
import { Alert, Field } from '@/components/ui';
import AuthShell from '../AuthShell';

function safeNext(n) {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard';
}

function LoginForm() {
  const { t, login } = useApp();
  const router = useRouter();
  const sp = useSearchParams();
  const [identifier, setId] = useState('');
  const [password, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const d = await api('/auth/login', { method: 'POST', body: { identifier, password } });
      login(d.token, d.user);
      router.push(safeNext(sp.get('next')));
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <AuthShell title={t.auth.loginTitle} sub={t.auth.loginSub}>
      <form onSubmit={submit} className="stack gap-16">
        <Field id="identifier" label={t.auth.identifier} required>
          <input id="identifier" className="input" autoComplete="username" value={identifier} onChange={(e) => setId(e.target.value)} required />
        </Field>
        <Field id="password" label={t.auth.password} required>
          <input id="password" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPw(e.target.value)} required />
        </Field>
        <NextLink href="/forgot-password" className="small" style={{ color: 'var(--rose-text)', fontWeight: 700, alignSelf: 'flex-end' }}>{t.auth.forgot}</NextLink>
        <Alert kind="error">{err}</Alert>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{t.nav.login}</button>
        <p className="small muted" style={{ textAlign: 'center' }}>{t.auth.noAccount} <NextLink href={`/register${sp.get('next') ? `?next=${encodeURIComponent(sp.get('next'))}` : ''}`} className="link">{t.nav.register}</NextLink></p>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
