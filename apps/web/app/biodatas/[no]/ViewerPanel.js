'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/components/Providers';
import { api, fileUrl } from '@/lib/api';
import { label, digits, options } from '@/lib/format';
import { Modal, Alert, Spinner } from '@/components/ui';
import { Lock, Heart, HeartFilled, ThumbDown, Flag, Phone, Mail, Link as LinkIcon } from '@/components/Icons';

export default function ViewerPanel({ no, biodataId }) {
  const { t, lang, user, authReady, refreshUser } = useApp();
  const path = usePathname();
  const [viewer, setViewer] = useState(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [modal, setModal] = useState(null);
  const b = t.bio;

  const load = useCallback(async () => {
    if (!user) { setViewer(null); return; }
    try {
      const d = await api(`/biodatas/${no}`);
      setViewer(d.viewer);
      setHasPhoto(Boolean(d.biodata.hasPhoto));
    } catch { /* keep public view */ }
  }, [no, user]);

  useEffect(() => { if (authReady) load(); }, [authReady, load]);
  useEffect(() => {
    if (!authReady) return;
    api(`/biodatas/${no}/view`, { method: 'POST' }).catch(() => {});
  }, [authReady, no]);

  useEffect(() => {
    let url;
    if ((viewer?.unlocked || viewer?.isOwner) && hasPhoto) {
      fileUrl(`/files/photo/${biodataId}`).then((u) => { url = u; setPhoto(u); });
    }
    return () => url && URL.revokeObjectURL(url);
  }, [viewer?.unlocked, viewer?.isOwner, hasPhoto, biodataId]);

  async function run(key, fn) {
    setBusy(key); setErr(''); setMsg('');
    try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(''); }
  }

  const unlock = () => run('unlock', async () => {
    const d = await api(`/biodatas/${no}/unlock`, { method: 'POST' });
    setViewer((v) => ({ ...v, unlocked: true, contact: d.contact, connections: d.connections }));
    refreshUser();
  });

  const setFav = (kind) => run('fav', async () => {
    if (viewer?.favorite === kind) {
      await api(`/biodatas/${no}/favorite`, { method: 'DELETE' });
      setViewer((v) => ({ ...v, favorite: null }));
    } else {
      await api(`/biodatas/${no}/favorite`, { method: 'POST', body: { kind } });
      setViewer((v) => ({ ...v, favorite: kind }));
    }
  });

  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setMsg(b.copied); } catch { /* clipboard blocked */ }
  };

  const loginHref = `/login?next=${encodeURIComponent(path)}`;
  const c = viewer?.contact;

  return (
    <aside className="stack gap-16" style={{ flex: '0 1 380px', minWidth: 300, position: 'sticky', top: 100 }}>
      {viewer?.isOwner && <Alert kind="info">{b.yourBiodata} <NextLink href="/dashboard/biodata" className="link">{t.dash.editBio}</NextLink></Alert>}

      <section className="card stack gap-16" style={{ borderWidth: 1.5 }}>
        <div className="row gap-8"><span className="gold"><Lock size={22} /></span><h2 className="h3">{b.contactTitle}</h2></div>

        {photo && <img src={photo} alt="" style={{ borderRadius: 20, maxHeight: 320, objectFit: 'cover', width: '100%' }} />}

        {c ? (
          <dl className="stack gap-12" style={{ margin: 0 }}>
            {c.candidateName && <div><dt className="label">{b.candidate}</dt><dd style={{ margin: 0, fontWeight: 700 }}>{c.candidateName}</dd></div>}
            <div><dt className="label">{b.guardian}</dt><dd style={{ margin: 0, fontWeight: 700 }}>{c.guardianName} {c.guardianRelation && <span className="muted">({label('relation', c.guardianRelation, lang)})</span>}</dd></div>
            <div><dt className="label">{b.phoneLabel}</dt><dd style={{ margin: 0 }}><a href={`tel:${c.guardianPhone}`} className="row gap-8 phone-blur" style={{ color: 'var(--rose-text)' }}><Phone size={20} />{c.guardianPhone}</a></dd></div>
            {c.guardianPhone2 && <div><dt className="label">{b.phone2}</dt><dd style={{ margin: 0 }}><a href={`tel:${c.guardianPhone2}`}>{c.guardianPhone2}</a></dd></div>}
            {c.email && <div><dt className="label">{b.email}</dt><dd style={{ margin: 0 }}><a href={`mailto:${c.email}`} className="row gap-8"><Mail size={16} />{c.email}</a></dd></div>}
          </dl>
        ) : (
          <>
            <div className="locked stack gap-4">
              <span className="label">{b.phoneLabel}</span>
              <span className="phone-blur" aria-label="hidden">01•••-••••••</span>
            </div>
            <p className="small muted">{b.unlockCost}</p>
            {!authReady ? <Spinner /> : !user ? (
              <NextLink href={loginHref} className="btn btn-primary btn-lg btn-block">{b.loginToUnlock}</NextLink>
            ) : viewer && !viewer.isOwner ? (
              viewer.connections > 0 ? (
                <button type="button" className="btn btn-primary btn-lg btn-block" onClick={unlock} disabled={busy === 'unlock'}>{busy === 'unlock' ? b.unlocking : b.unlock}</button>
              ) : (
                <>
                  <Alert kind="warn">{b.noBalance}</Alert>
                  <NextLink href="/packages" className="btn btn-primary btn-lg btn-block">{b.buyMore}</NextLink>
                </>
              )
            ) : null}
          </>
        )}

        {user && viewer && !viewer.isOwner && (
          <>
            {viewer.proposal ? (
              <span className="pill pill-rose" style={{ alignSelf: 'flex-start' }}>
                {viewer.proposal.status === 'accepted' ? b.proposalAccepted : viewer.proposal.status === 'declined' ? b.proposalDeclined : b.proposalSent}
              </span>
            ) : (
              <button type="button" className="btn btn-outline btn-block" onClick={() => setModal('proposal')}>{b.sendProposal}</button>
            )}
            <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <span className="small muted">{b.balance}: <b style={{ color: 'var(--ink)' }}>{digits(viewer.connections, lang)} {t.common.connections}</b></span>
              <NextLink href="/packages" className="small" style={{ fontWeight: 700, color: 'var(--rose-text)' }}>{b.buyMore}</NextLink>
            </div>
          </>
        )}
        <Alert kind="error">{err}</Alert>
      </section>

      {user && viewer && !viewer.isOwner && (
        <div className="row gap-8 wrap">
          <button type="button" className="btn btn-outline btn-sm" aria-pressed={viewer.favorite === 'like'} onClick={() => setFav('like')} disabled={busy === 'fav'}>
            <span style={{ color: 'var(--rose-text)' }}>{viewer.favorite === 'like' ? <HeartFilled size={18} /> : <Heart size={18} />}</span>
            {viewer.favorite === 'like' ? b.favorited : b.favorite}
          </button>
          <button type="button" className="btn btn-outline btn-sm" aria-pressed={viewer.favorite === 'dislike'} onClick={() => setFav('dislike')} disabled={busy === 'fav'}>
            <ThumbDown size={18} />{viewer.favorite === 'dislike' ? b.disliked : b.notInterested}
          </button>
        </div>
      )}

      <section className="card card-tight stack gap-8" style={{ background: 'var(--sage-bg)', borderColor: 'transparent' }}>
        <b style={{ color: 'var(--sage)' }}>{b.safetyT}</b>
        <p className="small" style={{ lineHeight: 1.7 }}>{b.safetyD}</p>
      </section>

      <div className="row gap-8 wrap">
        <button type="button" className="btn btn-ghost btn-sm" onClick={copy}><LinkIcon size={16} />{b.share}</button>
        {user && viewer && !viewer.isOwner && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal('report')}><Flag size={16} />{b.report}</button>}
      </div>
      <Alert kind="ok">{msg}</Alert>

      {modal === 'proposal' && <ProposalModal no={no} t={t} onClose={() => setModal(null)} onSent={(p) => { setViewer((v) => ({ ...v, proposal: p })); setModal(null); }} />}
      {modal === 'report' && <ReportModal no={no} t={t} lang={lang} unlocked={viewer?.unlocked} onClose={() => setModal(null)} onSent={() => { setModal(null); setMsg(b.reportSent); }} />}
    </aside>
  );
}

function ProposalModal({ no, t, onClose, onSent }) {
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const d = await api(`/biodatas/${no}/proposal`, { method: 'POST', body: { message } });
      onSent(d.proposal);
    } catch (ex) {
      setErr(ex.code === 'OWN_BIODATA_REQUIRED' ? t.bio.proposalNeedsBiodata : ex.message);
    } finally { setBusy(false); }
  };
  return (
    <Modal title={t.bio.sendProposal} onClose={onClose}>
      <form onSubmit={send} className="stack gap-16">
        <p className="muted small">{t.bio.proposalHelp}</p>
        <label className="field"><span className="label">{t.bio.proposalMsg}</span><textarea className="textarea" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
        <Alert kind="error">{err}</Alert>
        {err === t.bio.proposalNeedsBiodata && <NextLink href="/dashboard/biodata" className="link">{t.dash.createBio}</NextLink>}
        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t.common.cancel}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{t.common.send}</button>
        </div>
      </form>
    </Modal>
  );
}

function ReportModal({ no, t, lang, unlocked, onClose, onSent }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [refund, setRefund] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    if (!reason) return setErr(t.form.choose);
    setBusy(true); setErr('');
    try {
      await api(`/biodatas/${no}/report`, { method: 'POST', body: { reason, details, requestRefund: refund } });
      onSent();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  return (
    <Modal title={t.bio.reportTitle} onClose={onClose}>
      <form onSubmit={send} className="stack gap-16">
        <label className="field"><span className="label req">{t.bio.reportReason}</span>
          <select className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">{t.form.choose}</option>
            {options('report').map((o) => <option key={o.value} value={o.value}>{o[lang]}</option>)}
          </select>
        </label>
        <label className="field"><span className="label">{t.bio.reportDetails}</span><textarea className="textarea" maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} /></label>
        {unlocked && <label className="check"><input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} />{t.bio.requestRefund}</label>}
        <Alert kind="error">{err}</Alert>
        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t.common.cancel}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{t.common.submit}</button>
        </div>
      </form>
    </Modal>
  );
}
