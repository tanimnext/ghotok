'use client';

import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useApp } from '@/components/Providers';
import { useLoad } from '@/components/useLoad';
import { digits, taka, date, label } from '@/lib/format';
import { Alert, Empty, Spinner, StatusPill } from '@/components/ui';

function Connections() {
  const { t, lang, user, refreshUser } = useApp();
  const sp = useSearchParams();
  const ledger = useLoad('/me/ledger?limit=50');
  const payments = useLoad('/me/payments');
  const refunds = useLoad('/me/refunds');
  const c = t.conn;
  const pay = sp.get('payment');

  useEffect(() => { refreshUser(); }, [refreshUser]);

  return (
    <>
      <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>{c.title}</h1>
      {pay === 'success' && <Alert kind="ok">{c.paySuccess}</Alert>}
      {pay === 'failed' && <Alert kind="error">{c.payFailed}</Alert>}
      {pay === 'cancelled' && <Alert kind="warn">{c.payCancelled}</Alert>}

      <section className="panel row wrap between gap-20" style={{ padding: 28 }}>
        <div className="stack gap-4">
          <span style={{ color: 'var(--panel-muted)' }}>{c.balance}</span>
          <span className="display" style={{ fontSize: 72, lineHeight: 1 }}>{digits(user?.connections ?? 0, lang)}</span>
        </div>
        <NextLink href="/packages" className="btn btn-gold btn-lg">{c.buy}</NextLink>
      </section>

      <section className="card stack gap-16">
        <h2 className="h3">{c.payments}</h2>
        {payments.loading && !payments.data ? <Spinner /> : !payments.data?.items.length ? <p className="muted">{c.empty}</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t.common.date}</th><th>{t.pkg.package}</th><th>{t.pkg.method}</th><th>TrxID</th><th>{t.common.amount}</th><th>{t.common.status}</th></tr></thead>
              <tbody>
                {payments.data.items.map((p) => (
                  <tr key={p._id}>
                    <td>{date(p.createdAt, lang)}</td>
                    <td>{digits(p.connections, lang)} {t.common.connections}</td>
                    <td>{label('method', p.method, lang)}{p.gateway === 'bkash_api' ? ' (online)' : ''}</td>
                    <td>{p.trxId || '—'}</td>
                    <td><b>{taka(p.amount, lang)}</b></td>
                    <td><StatusPill status={p.status}>{c.payStatus[p.status]}</StatusPill>{p.note && p.status === 'rejected' && <div className="tiny muted" style={{ marginTop: 4 }}>{p.note}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card stack gap-16">
        <h2 className="h3">{c.ledger}</h2>
        {ledger.loading && !ledger.data ? <Spinner /> : !ledger.data?.items.length ? <p className="muted">{c.empty}</p> : (
          <div className="stack">
            {ledger.data.items.map((l) => (
              <div key={l._id} className="list-row">
                <span className="stack"><b className="small">{c.type[l.type] || l.type}</b><span className="tiny muted">{date(l.createdAt, lang)}{l.note ? ` · ${l.note}` : ''}</span></span>
                <span style={{ fontWeight: 800, color: l.delta > 0 ? 'var(--sage)' : 'var(--rose-text)' }}>{l.delta > 0 ? '+' : '−'}{digits(Math.abs(l.delta), lang)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card stack gap-16">
        <h2 className="h3">{c.refunds}</h2>
        {refunds.loading && !refunds.data ? <Spinner /> : !refunds.data?.items.length ? <p className="muted">{c.empty}</p> : (
          <div className="stack">
            {refunds.data.items.map((r) => (
              <div key={r._id} className="list-row">
                <span className="stack"><b className="small">{r.biodata ? `GH-${r.biodata.biodataNo}` : '—'} · {label('report', r.reason, lang) || r.reason}</b><span className="tiny muted">{date(r.createdAt, lang)}{r.resolution ? ` · ${r.resolution}` : ''}</span></span>
                <StatusPill status={r.status}>{c.refundStatus[r.status]}</StatusPill>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function Page() {
  return <Suspense><Connections /></Suspense>;
}
