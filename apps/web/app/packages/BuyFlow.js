'use client';

import NextLink from 'next/link';
import { useState } from 'react';
import { useApp } from '@/components/Providers';
import { api } from '@/lib/api';
import { digits, taka, label, fill } from '@ghotok/shared';
import { Alert, Field } from '@/components/ui';

export default function BuyFlow({ packages, payment, initialPackage }) {
  const { t, lang, user, authReady } = useApp();
  const p = t.pkg;
  const [pkgId, setPkgId] = useState(
    initialPackage && packages.some((x) => x._id === initialPackage)
      ? initialPackage
      : (packages.find((x) => x.highlight) || packages[0])?._id
  );
  const [method, setMethod] = useState(payment.manual[0]?.method || 'bkash');
  const [sender, setSender] = useState('');
  const [trx, setTrx] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  const pkg = packages.find((x) => x._id === pkgId);
  const manual = payment.manual.find((m) => m.method === method);

  async function submitManual(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api('/payments/manual', {
        method: 'POST',
        body: { packageId: pkgId, method, senderNumber: sender, trxId: trx },
      });
      setDone(true);
      setTrx('');
    } catch (ex) {
      setErr(ex);
    } finally {
      setBusy(false);
    }
  }

  async function payOnline() {
    setBusy(true);
    setErr(null);
    try {
      const { bkashURL } = await api('/payments/bkash/create', { method: 'POST', body: { packageId: pkgId } });
      window.location.href = bkashURL;
    } catch (ex) {
      setErr(ex);
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
      <div className="stack gap-20" style={{ flex: '1 1 620px', minWidth: 0 }}>
        <section className="card stack gap-20">
          <h2 className="h3">{p.choose}</h2>
          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}
            role="radiogroup"
          >
            {packages.map((x) => {
              const on = x._id === pkgId;
              return (
                <label
                  key={x._id}
                  className="stack gap-8"
                  style={{
                    cursor: 'pointer',
                    borderRadius: 22,
                    padding: 22,
                    border: `${on ? 2 : 1}px solid ${on ? 'var(--rose)' : 'var(--line)'}`,
                    background: on ? 'var(--surface2)' : 'var(--bg)',
                  }}
                >
                  <span className="row between">
                    <b
                      className="small"
                      style={{
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: on ? 'var(--rose-text)' : 'var(--muted)',
                      }}
                    >
                      {x.name[lang]}
                    </b>
                    <input
                      type="radio"
                      name="pkg"
                      checked={on}
                      onChange={() => setPkgId(x._id)}
                      style={{ width: 20, height: 20, accentColor: 'var(--rose)' }}
                    />
                  </span>
                  <span className="display" style={{ fontSize: 48 }}>
                    {taka(x.price, lang)}
                  </span>
                  <b>
                    {digits(x.connections, lang)} {t.common.connections}
                  </b>
                  <span className="small muted">
                    {taka(Math.round(x.price / x.connections), lang)} {p.per}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {!authReady ? null : !user ? (
          <section className="card stack gap-16" style={{ alignItems: 'flex-start' }}>
            <p className="muted">{p.loginFirst}</p>
            <NextLink href="/login?next=/packages" className="btn btn-primary">
              {t.nav.login}
            </NextLink>
          </section>
        ) : (
          <>
            {payment.bkashApi && (
              <section className="card stack gap-12">
                <h2 className="h3">{p.payOnline}</h2>
                <p className="small muted">{p.payOnlineHelp}</p>
                <button type="button" className="btn btn-primary btn-lg" onClick={payOnline} disabled={busy || !pkg}>
                  {p.payOnline} · {pkg && taka(pkg.price, lang)}
                </button>
              </section>
            )}

            <section className="card stack gap-20">
              <h2 className="h3">{payment.bkashApi ? p.or : p.pay}</h2>
              {payment.manual.length === 0 ? (
                <Alert kind="warn">{p.noNumbers}</Alert>
              ) : (
                <div className="choice-grid" role="radiogroup">
                  {payment.manual.map((m) => (
                    <label key={m.method} className="choice" style={{ padding: '14px 22px', fontSize: 16 }}>
                      <input
                        type="radio"
                        name="method"
                        checked={method === m.method}
                        onChange={() => setMethod(m.method)}
                      />
                      {label('method', m.method, lang)}
                    </label>
                  ))}
                </div>
              )}
            </section>

            {manual && pkg && (
              <form onSubmit={submitManual} className="card stack gap-20">
                <h2 className="h3">{p.confirm}</h2>
                <ol className="stack gap-8 muted" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
                  <li>
                    {fill(p.stepSend, {
                      method: label('method', method, lang),
                      number: manual.number,
                      amount: taka(pkg.price, lang),
                    })}
                  </li>
                  <li>{p.stepCopy}</li>
                  <li>{p.stepEnter}</li>
                </ol>
                <div className="grid grid-2" style={{ gap: 16 }}>
                  <Field id="sender" label={p.senderNumber} required error={err?.fields?.senderNumber}>
                    <input
                      id="sender"
                      className="input"
                      type="tel"
                      inputMode="tel"
                      placeholder="01XXXXXXXXX"
                      value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      required
                      aria-invalid={Boolean(err?.fields?.senderNumber)}
                    />
                  </Field>
                  <Field id="trx" label={p.trxId} required error={err?.fields?.trxId}>
                    <input
                      id="trx"
                      className="input"
                      value={trx}
                      onChange={(e) => setTrx(e.target.value.toUpperCase())}
                      required
                      minLength={6}
                      maxLength={40}
                      aria-invalid={Boolean(err?.fields?.trxId)}
                    />
                  </Field>
                </div>
                <Alert kind="error">{err && !err.fields ? err.message : null}</Alert>
                {done && (
                  <Alert kind="ok">
                    {p.submitted}{' '}
                    <NextLink href="/dashboard/connections" className="link">
                      {t.dash.nav.connections}
                    </NextLink>
                  </Alert>
                )}
                <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
                  {p.submitVerify}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      <aside className="stack gap-16" style={{ flex: '0 1 360px', minWidth: 300 }}>
        {pkg && (
          <section className="panel stack gap-12" style={{ padding: 28 }}>
            <h2 className="h3">{p.summary}</h2>
            <div className="row between" style={{ color: 'var(--panel-muted)' }}>
              <span>
                {pkg.name[lang]} · {digits(pkg.connections, lang)} {t.common.connections}
              </span>
              <span>{taka(pkg.price, lang)}</span>
            </div>
            <div
              className="row between"
              style={{ borderTop: '1px solid var(--panel-line)', paddingTop: 14, fontSize: 20, fontWeight: 800 }}
            >
              <span>{p.total}</span>
              <span>{taka(pkg.price, lang)}</span>
            </div>
            {user && (
              <span className="small" style={{ color: 'var(--panel-muted)' }}>
                {p.balanceAfter}:{' '}
                <b style={{ color: 'var(--on-panel)' }}>
                  {digits((user.connections || 0) + pkg.connections, lang)} {t.common.connections}
                </b>
              </span>
            )}
          </section>
        )}
        <section
          className="card card-tight stack gap-8"
          style={{ background: 'var(--sage-bg)', borderColor: 'transparent' }}
        >
          <b style={{ color: 'var(--sage)' }}>{p.refundsT}</b>
          <p className="small" style={{ lineHeight: 1.7 }}>
            {p.refundsD}{' '}
            <NextLink href="/refund-policy" className="link">
              {t.pages.refundT}
            </NextLink>
          </p>
        </section>
      </aside>
    </div>
  );
}
