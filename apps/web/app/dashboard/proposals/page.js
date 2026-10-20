'use client';

import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useApp } from '@/components/Providers';
import { useLoad } from '@/components/useLoad';
import { cardTitle } from '@/components/BiodataCard';
import { api } from '@/lib/api';
import { date, label } from '@ghotok/shared';
import { Alert, Empty, Spinner, StatusPill } from '@/components/ui';

function Proposals() {
  const { t, lang } = useApp();
  const sp = useSearchParams();
  const router = useRouter();
  const box = sp.get('box') === 'received' ? 'received' : 'sent';
  const { data, error, loading, setData } = useLoad(`/me/proposals?box=${box}`);
  const [err, setErr] = useState('');
  const pr = t.prop;

  const act = async (id, path, body) => {
    setErr('');
    try {
      const d = await api(`/me/proposals/${id}/${path}`, { method: 'POST', body });
      setData((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, status: d.status } : i)) }));
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <>
      <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>
        {pr.title}
      </h1>
      <div className="tabs" role="tablist">
        {['received', 'sent'].map((b) => (
          <button
            key={b}
            type="button"
            role="tab"
            aria-selected={box === b}
            onClick={() => router.replace(`/dashboard/proposals?box=${b}`)}
          >
            {pr[b]}
          </button>
        ))}
      </div>
      {box === 'received' && <p className="small muted">{pr.acceptHelp}</p>}
      <Alert kind="error">{err}</Alert>
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <Alert kind="error">{error.message}</Alert>
      ) : !data.items.length ? (
        <Empty>{pr.empty}</Empty>
      ) : (
        <div className="stack gap-12">
          {data.items.map((p) => (
            <article key={p.id} className="card row wrap between gap-16">
              <div className="stack gap-4" style={{ flex: '1 1 260px' }}>
                {p.biodata ? (
                  <NextLink href={`/biodatas/${p.biodata.code}`} className="display" style={{ fontSize: 22 }}>
                    {p.biodata.code}
                  </NextLink>
                ) : (
                  <b>—</b>
                )}
                {p.biodata && (
                  <span className="small muted">
                    {cardTitle(p.biodata, t, lang)} · {label('district', p.biodata.permanentDistrict, lang)} ·{' '}
                    {label('religion', p.biodata.religion, lang)}
                  </span>
                )}
                {p.message && (
                  <p className="small" style={{ fontStyle: 'italic' }}>
                    “{p.message}”
                  </p>
                )}
                <span className="tiny muted">{date(p.createdAt, lang)}</span>
              </div>
              <div className="row gap-8 wrap">
                <StatusPill status={p.status}>{pr.status[p.status]}</StatusPill>
                {p.status === 'pending' && box === 'received' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => act(p.id, 'respond', { action: 'accept' })}
                    >
                      {pr.accept}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => act(p.id, 'respond', { action: 'decline' })}
                    >
                      {pr.decline}
                    </button>
                  </>
                )}
                {p.status === 'pending' && box === 'sent' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(p.id, 'withdraw')}>
                    {pr.withdraw}
                  </button>
                )}
                {p.status === 'accepted' && (
                  <NextLink href="/dashboard/unlocked" className="btn btn-outline btn-sm">
                    {t.dash.nav.unlocked}
                  </NextLink>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Proposals />
    </Suspense>
  );
}
