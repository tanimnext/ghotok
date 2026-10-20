'use client';

import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useApp } from '@/components/Providers';
import { api } from '@/lib/api';
import { Alert, Field } from '@/components/ui';
import AuthShell from '../AuthShell';

function RegisterForm() {
  const { t, lang, login } = useApp();
  const router = useRouter();
  const sp = useSearchParams();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', gender: '' });
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const a = t.auth;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const d = await api('/auth/register', { method: 'POST', body: { ...f, preferredLang: lang } });
      login(d.token, d.user);
      const next = sp.get('next');
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard/biodata');
    } catch (ex) { setErr(ex); setBusy(false); }
  }
  const fe = (k) => err?.fields?.[k];

  return (
    <AuthShell title={a.registerTitle} sub={a.registerSub}>
      <form onSubmit={submit} className="stack gap-16">
        <Field id="name" label={a.name} required error={fe('name')}>
          <input id="name" className="input" autoComplete="name" value={f.name} onChange={set('name')} required minLength={2} />
        </Field>
        <fieldset className="stack gap-8" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label req" style={{ marginBottom: 8 }}>{a.gender}</legend>
          <div className="choice-grid">
            {[['male', a.male], ['female', a.female]].map(([v, l]) => (
              <label key={v} className="choice" style={{ padding: '12px 22px' }}><input type="radio" name="gender" value={v} checked={f.gender === v} onChange={set('gender')} required />{l}</label>
            ))}
          </div>
          {fe('gender') && <span className="field-error">{fe('gender')}</span>}
        </fieldset>
        <Field id="email" label={a.email} error={fe('email')}>
          <input id="email" type="email" className="input" autoComplete="email" value={f.email} onChange={set('email')} />
        </Field>
        <Field id="phone" label={a.phone} hint={a.emailOrPhone} error={fe('phone')}>
          <input id="phone" type="tel" inputMode="tel" className="input" autoComplete="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={set('phone')} />
        </Field>
        <Field id="password" label={a.password} required hint={a.passwordHint} error={fe('password')}>
          <input id="password" type="password" className="input" autoComplete="new-password" value={f.password} onChange={set('password')} required minLength={8} />
        </Field>
        <label className="check small"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
          <span>{a.agree} <NextLink href="/terms" className="link">{t.pages.termsT}</NextLink> · <NextLink href="/privacy-policy" className="link">{t.pages.privacyT}</NextLink></span>
        </label>
        <Alert kind="error">{err && (!err.fields || err.status === 409) ? err.message : null}</Alert>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !agree}>{t.nav.register}</button>
        <p className="small muted" style={{ textAlign: 'center' }}>{a.haveAccount} <NextLink href="/login" className="link">{t.nav.login}</NextLink></p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
