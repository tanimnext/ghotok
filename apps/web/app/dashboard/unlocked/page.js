'use client';

import NextLink from 'next/link';
import { useState } from 'react';
import { useApp } from '@/components/Providers';
import { useLoad } from '@/components/useLoad';
import { cardTitle } from '@/components/BiodataCard';
import { api } from '@/lib/api';
import { date, label } from '@/lib/format';
import { Alert, Empty, Modal, Spinner } from '@/components/ui';
import { Phone } from '@/components/Icons';

export default function Unlocked() {
  const { t, lang } = useApp();
  const { data, error, loading } = useLoad('/me/unlocked');
  const [refundFor, setRefundFor] = useState(null);
  const [msg, setMsg] = useState('');
  const l = t.lists;

  return (
    <>
      <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>{l.unlocked}</h1>
      <Alert kind="ok">{msg}</Alert>
      {loading && !data ? <Spinner /> : error ? <Alert kind="error">{error.message}</Alert> : !data.items.length ? <Empty>{l.unlockedEmpty}</Empty> : (
        <div className="stack gap-16">
          {data.items.map((u) => (
            <article key={u.unlockId} className="card row wrap gap-20" style={{ alignItems: 'flex-start' }}>
              <div className="stack gap-4" style={{ flex: '1 1 220px' }}>
                <NextLink href={`/biodatas/${u.biodata.code}`} className="display" style={{ fontSize: 24 }}>{u.biodata.code}</NextLink>
                <span className="muted small">{cardTitle(u.biodata, t, lang)} · {label('district', u.biodata.permanentDistrict, lang)}</span>
                <span className="tiny muted">{date(u.unlockedAt, lang)}{u.source === 'proposal' ? ` · ${l.viaProposal}` : ''}</span>
              </div>
              <div className="stack gap-4" style={{ flex: '1 1 260px' }}>
                {u.contact ? (
                  <>
                    <span className="small"><b>{u.contact.guardianName}</b> {u.contact.guardianRelation && <span className="muted">({label('relation', u.contact.guardianRelation, lang)})</span>}</span>
                    <a href={`tel:${u.contact.guardianPhone}`} className="row gap-8" style={{ fontWeight: 800, fontSize: 18, color: 'var(--rose-text)' }}><Phone size={18} />{u.contact.guardianPhone}</a>
                    {u.contact.guardianPhone2 && <a href={`tel:${u.contact.guardianPhone2}`} className="small">{u.contact.guardianPhone2}</a>}
                    {u.contact.email && <a href={`mailto:${u.contact.email}`} className="small">{u.contact.email}</a>}
                  </>
                ) : <span className="muted">{l.unavailable}</span>}
              </div>
              <div>
                {u.refunded ? <span className="pill pill-sage">{l.refunded}</span>
                  : u.source === 'connection' && <button type="button" className="btn btn-outline btn-sm" onClick={() => setRefundFor(u)}>{l.askRefund}</button>}
              </div>
            </article>
          ))}
        </div>
      )}
      {refundFor && <RefundModal t={t} unlock={refundFor} onClose={() => setRefundFor(null)} onDone={() => { setRefundFor(null); setMsg(t.bio.reportSent); }} />}
    </>
  );
}

function RefundModal({ t, unlock, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [err, setErr] = useState('');
  const send = async (e) => {
    e.preventDefault();
    try { await api('/me/refunds', { method: 'POST', body: { unlockId: unlock.unlockId, reason, details } }); onDone(); } catch (ex) { setErr(ex.message); }
  };
  return (
    <Modal title={`${t.lists.askRefund} · ${unlock.biodata.code}`} onClose={onClose}>
      <form onSubmit={send} className="stack gap-16">
        <label className="field"><span className="label req">{t.conn.refundReason}</span><input className="input" required minLength={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <label className="field"><span className="label">{t.conn.refundDetails}</span><textarea className="textarea" maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} /></label>
        <Alert kind="error">{err}</Alert>
        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t.common.cancel}</button>
          <button type="submit" className="btn btn-primary">{t.common.submit}</button>
        </div>
      </form>
    </Modal>
  );
}
