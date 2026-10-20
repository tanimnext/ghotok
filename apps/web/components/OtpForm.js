'use client';
/**
 * Two-step SMS verification: send a 6-digit code, then confirm it.
 * With `askPhone` the user first types the (new) number to verify.
 */
import { useEffect, useState } from 'react';
import { digits } from '@ghotok/shared';
import { useApp } from './Providers';
import { api } from '@/lib/api';
import { Alert, Field } from './ui';

const RESEND_SECONDS = 60;

export default function OtpForm({ phone: givenPhone, askPhone = false, onDone }) {
  const { t, lang } = useApp();
  const o = t.otp;
  const [phone, setPhone] = useState(givenPhone || '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!wait) return undefined;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function send(e) {
    e?.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const d = await api('/auth/phone/send-code', { method: 'POST', body: askPhone ? { phone } : {} });
      setPhone(d.phone);
      setSent(true);
      setWait(RESEND_SECONDS);
    } catch (ex) {
      setErr(ex.fields?.phone || ex.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const d = await api('/auth/phone/verify', { method: 'POST', body: { phone, code } });
      onDone(d.user);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  if (!sent) {
    return (
      <form onSubmit={send} className="stack gap-16">
        {askPhone ? (
          <Field id="otp-phone" label={t.auth.phone} required>
            <input
              id="otp-phone"
              className="input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
        ) : (
          <p className="muted">{o.willSend.replace('{phone}', digits(phone, lang))}</p>
        )}
        <Alert kind="error">{err}</Alert>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {o.send}
        </button>
      </form>
    );
  }
  return (
    <form onSubmit={verify} className="stack gap-16">
      <p className="muted">{o.sentTo.replace('{phone}', digits(phone, lang))}</p>
      <Field id="otp-code" label={o.code} required>
        <input
          id="otp-code"
          className="input otp-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      </Field>
      <Alert kind="error">{err}</Alert>
      <div className="row between wrap gap-8">
        <button type="button" className="btn btn-ghost btn-sm" disabled={wait > 0 || busy} onClick={send}>
          {wait > 0 ? o.resendIn.replace('{s}', digits(wait, lang)) : o.resend}
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>
          {o.verify}
        </button>
      </div>
    </form>
  );
}
