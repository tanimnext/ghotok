'use client';
/** Landing page of the email verification link. */
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useApp } from '@/components/Providers';
import { api } from '@/lib/api';
import { Alert, Spinner } from '@/components/ui';
import AuthShell from '../AuthShell';

function Verify() {
  const { t, user, setUser } = useApp();
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState({ loading: true, ok: false, error: '' });

  useEffect(() => {
    if (!token) return setState({ loading: false, ok: false, error: t.auth.resetInvalid });
    api('/auth/email/verify', { method: 'POST', body: { token } })
      .then((d) => {
        setState({ loading: false, ok: true, error: '' });
        if (user && String(user.id) === String(d.user.id)) setUser(d.user);
      })
      .catch((e) => setState({ loading: false, ok: false, error: e.message }));
    // run once per token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthShell title={t.auth.verifyEmailTitle}>
      {state.loading ? (
        <Spinner />
      ) : state.ok ? (
        <Alert kind="ok">{t.auth.emailVerified}</Alert>
      ) : (
        <Alert kind="error">{state.error}</Alert>
      )}
      <NextLink href={user ? '/dashboard' : '/login'} className="btn btn-primary">
        {user ? t.nav.dashboard : t.nav.login}
      </NextLink>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
