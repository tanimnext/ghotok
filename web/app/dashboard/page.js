'use client';

import NextLink from 'next/link';
import { useState } from 'react';
import { useApp } from '@/components/Providers';
import { useLoad } from '@/components/useLoad';
import { api } from '@/lib/api';
import { digits, date, options } from '@/lib/format';
import { Alert, Modal, Spinner, StatusPill } from '@/components/ui';
import { Rings, Silhouette } from '@/components/Icons';

export default function Overview() {
  const { t, lang, user } = useApp();
  const { data, error, loading, reload, setData } = useLoad('/me/overview');
  const [hideModal, setHideModal] = useState(false);
  const [restoreModal, setRestoreModal] = useState(false);
  const [err, setErr] = useState('');
  const d = t.dash;

  if (loading && !data) return <Spinner />;
  if (error) return <Alert kind="error">{error.message}</Alert>;
  const bio = data.biodata;

  async function setVisible(hidden, reason) {
    setErr('');
    try {
      await api('/me/biodata/visibility', { method: 'POST', body: { hidden, reason } });
      setData((s) => ({ ...s, biodata: { ...s.biodata, hidden } }));
      setHideModal(false);
    } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <div className="stack gap-8">
        <span className="eyebrow">{d.kicker}</span>
        <h1 className="display" style={{ fontSize: 'clamp(34px, 4vw, 48px)' }}>{d.welcome}, {user.name.split(' ')[0]}</h1>
        <p className="muted">{d.welcomeSub}</p>
      </div>
      <Alert kind="error">{err}</Alert>

      <div className="row wrap gap-24" style={{ alignItems: 'stretch' }}>
        <section className="card stack gap-20" style={{ flex: '1 1 400px' }}>
          <div className="row between gap-12">
            <h2 className="h3">{d.bioTitle}</h2>
            {bio && <StatusPill status={bio.status}>{d.status[bio.status]}</StatusPill>}
          </div>
          {data.deletedBiodata && !bio ? (
            <div className="stack gap-12">
              <p><b>{d.deletedTitle}</b></p>
              {data.deletedBiodata.recovery?.status === 'pending' ? <Alert kind="info">{d.restorePending}</Alert>
                : data.deletedBiodata.recovery?.status === 'declined' ? <Alert kind="warn">{d.restoreDeclined}</Alert>
                : <p className="muted small">{d.deletedSub}</p>}
              {data.deletedBiodata.recovery?.status !== 'pending' && <button type="button" className="btn btn-outline" style={{ alignSelf: 'flex-start' }} onClick={() => setRestoreModal(true)}>{d.requestRestore}</button>}
            </div>
          ) : !bio ? (
            <div className="stack gap-12" style={{ alignItems: 'flex-start' }}>
              <p className="muted">{d.noBio}</p>
              <NextLink href="/dashboard/biodata" className="btn btn-primary">{d.createBio}</NextLink>
            </div>
          ) : (
            <>
              <div className="row gap-16">
                <div className="arch" style={{ width: 72, height: 88, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', flex: '0 0 auto' }}><Silhouette width={56} height={60} /></div>
                <div className="stack gap-4">
                  <b>{bio.code || '—'}</b>
                  <span className="small muted">{d.statusHelp[bio.status]}</span>
                </div>
              </div>
              {bio.reviewNote && ['rejected', 'changes_requested'].includes(bio.status) && <Alert kind="warn"><b>{d.reviewNote}:</b> {bio.reviewNote}</Alert>}
              {bio.status === 'approved' && (
                <div className="row between gap-16" style={{ background: 'var(--bg)', borderRadius: 20, padding: '14px 18px' }}>
                  <span className="stack"><b className="small">{d.visible}</b><span className="tiny muted">{bio.hidden ? d.visOff : d.visOn}</span></span>
                  <button type="button" role="switch" className="switch" aria-checked={!bio.hidden} aria-label={d.visible} onClick={() => (bio.hidden ? setVisible(false) : setHideModal(true))}><span /></button>
                </div>
              )}
              <div className="row wrap gap-8">
                <NextLink href="/dashboard/biodata" className="btn btn-primary">{d.editBio}</NextLink>
                {bio.code && <NextLink href={`/biodatas/${bio.code}`} className="btn btn-outline">{d.viewPublic}</NextLink>}
              </div>
            </>
          )}
        </section>

        <section className="panel stack gap-12" style={{ flex: '1 1 300px', padding: 28, position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', right: -20, top: -6, opacity: 0.35 }}><Rings size={160} stroke={0.8} /></span>
          <h2 className="h3" style={{ position: 'relative' }}>{d.balTitle}</h2>
          <div className="row gap-12" style={{ alignItems: 'baseline', position: 'relative' }}>
            <span className="display" style={{ fontSize: 88, lineHeight: 1 }}>{digits(data.connections.balance, lang)}</span>
            <span style={{ color: 'var(--panel-muted)' }}>{d.balLeft}</span>
          </div>
          <span className="small" style={{ color: 'var(--panel-muted)', position: 'relative' }}>
            {digits(data.connections.used, lang)} {d.used}{data.connections.lastPurchaseAt ? ` · ${d.lastPurchase} ${date(data.connections.lastPurchaseAt, lang)}` : ''}
          </span>
          <NextLink href="/packages" className="btn btn-gold" style={{ marginTop: 'auto', position: 'relative' }}>{d.buy}</NextLink>
        </section>
      </div>

      {bio && (
        <section className="card stack gap-20">
          <h2 className="h3">{d.activity}</h2>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 18 }}>
            {[[data.views.today, d.visitsToday], [data.views.week, d.visits7], [data.views.month, d.visits30], [data.favoritedBy, d.favoritedBy]].map(([v, l]) => (
              <div key={l} className="stat"><span className="stat-num">{digits(v, lang)}</span><span className="small muted">{l}</span></div>
            ))}
          </div>
        </section>
      )}

      <div className="row wrap gap-24" style={{ alignItems: 'stretch' }}>
        <section className="card stack gap-8" style={{ flex: '1 1 380px' }}>
          <div className="row between"><h2 className="h3">{d.proposalsTitle}</h2><NextLink href="/dashboard/proposals" className="small" style={{ color: 'var(--rose-text)', fontWeight: 700 }}>{t.common.viewAll}</NextLink></div>
          <NextLink href="/dashboard/proposals?box=received" className="list-row"><span>{t.prop.received}</span><span className="gold">{digits(data.proposals.receivedPending, lang)} {d.pendingIn} →</span></NextLink>
          <NextLink href="/dashboard/proposals?box=sent" className="list-row"><span>{t.prop.sent}</span><span className="gold">{digits(data.proposals.sentPending, lang)} {d.pendingOut} →</span></NextLink>
        </section>
        <section className="card stack gap-8" style={{ flex: '1 1 380px' }}>
          <h2 className="h3">{d.lists}</h2>
          {[['/dashboard/favorites', d.nav.favorites, data.lists.favorites], ['/dashboard/dislikes', d.nav.dislikes, data.lists.dislikes], ['/dashboard/favorited-me', d.nav.favoritedMe, data.lists.favoritedBy], ['/dashboard/unlocked', d.nav.unlocked, data.lists.unlocked]].map(([href, l, v]) => (
            <NextLink key={href} href={href} className="list-row"><span style={{ fontWeight: 600 }}>{l}</span><span className="gold">{digits(v, lang)} →</span></NextLink>
          ))}
        </section>
      </div>

      {hideModal && <HideModal t={t} lang={lang} onClose={() => setHideModal(false)} onConfirm={(r) => setVisible(true, r)} />}
      {restoreModal && <RestoreModal t={t} onClose={() => setRestoreModal(false)} onDone={() => { setRestoreModal(false); reload(); }} />}
    </>
  );
}

function HideModal({ t, lang, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title={t.dash.hideReason} onClose={onClose}>
      <div className="stack gap-8">
        {options('hide').map((o) => <label key={o.value} className="check"><input type="radio" name="hide" checked={reason === o.value} onChange={() => setReason(o.value)} />{o[lang]}</label>)}
      </div>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t.common.cancel}</button>
        <button type="button" className="btn btn-primary" disabled={!reason} onClick={() => onConfirm(reason)}>{t.common.confirm}</button>
      </div>
    </Modal>
  );
}

function RestoreModal({ t, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const send = async () => {
    try { await api('/me/biodata/recovery', { method: 'POST', body: { note } }); onDone(); } catch (e) { setErr(e.message); }
  };
  return (
    <Modal title={t.dash.requestRestore} onClose={onClose}>
      <label className="field"><span className="label">{t.dash.restoreNote}</span><textarea className="textarea" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></label>
      <Alert kind="error">{err}</Alert>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t.common.cancel}</button>
        <button type="button" className="btn btn-primary" onClick={send}>{t.common.submit}</button>
      </div>
    </Modal>
  );
}
