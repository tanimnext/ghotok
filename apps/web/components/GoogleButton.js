'use client';
/**
 * "Continue with Google" using Google Identity Services. Rendered only when the API reports
 * a Google client id (GET /auth/config). New users pick their gender once, then sign in.
 */
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useApp } from './Providers';
import { api } from '@/lib/api';
import { Alert } from './ui';

export default function GoogleButton({ onSignedIn }) {
  const { t, lang } = useApp();
  const [clientId, setClientId] = useState(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(null); // credential waiting for a gender choice
  const [err, setErr] = useState('');
  const box = useRef(null);
  const onSignedInRef = useRef(onSignedIn);
  useEffect(() => {
    onSignedInRef.current = onSignedIn;
  });
  const submitRef = useRef(null);

  useEffect(() => {
    api('/auth/config')
      .then((d) => setClientId(d.google?.clientId || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId || !ready || !box.current || !window.google?.accounts?.id) return;
    const submit = async (credential, gender) => {
      setErr('');
      try {
        const d = await api('/auth/google', { method: 'POST', body: { credential, gender, preferredLang: lang } });
        if (d.needsGender) setPending(credential);
        else onSignedInRef.current(d);
      } catch (ex) {
        setErr(ex.message);
      }
    };
    window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => submit(r.credential) });
    window.google.accounts.id.renderButton(box.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      width: 320,
      locale: lang,
    });
    submitRef.current = submit;
  }, [clientId, ready, lang]);

  if (!clientId) return null;
  return (
    <div className="stack gap-12" style={{ alignItems: 'center' }}>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={box} />
      {pending && (
        <div className="stack gap-8" style={{ alignItems: 'center' }}>
          <span className="label">{t.auth.gender}</span>
          <div className="choice-grid">
            {[
              ['male', t.auth.male],
              ['female', t.auth.female],
            ].map(([v, l]) => (
              <button
                key={v}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => submitRef.current(pending, v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
      <Alert kind="error">{err}</Alert>
      <div className="divider-text" style={{ alignSelf: 'stretch' }}>
        {t.common.or}
      </div>
    </div>
  );
}
