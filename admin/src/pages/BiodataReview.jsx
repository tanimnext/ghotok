import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp, useLoad } from '../lib/app.jsx';
import { api, fileUrl, WEB_URL } from '../lib/api.js';
import { label, labels, digits, height, yesNo, date, dateTime } from '../lib/format.js';
import { Alert, Pill, Spinner, NoteModal } from '../components/ui.jsx';

function KV({ rows }) {
  const r = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!r.length) return <p className="muted small">—</p>;
  return <dl className="kv" style={{ margin: 0 }}>{r.map(([k, v]) => <div key={k}><dt>{k}</dt><dd style={{ whiteSpace: 'pre-line' }}>{v}</dd></div>)}</dl>;
}

const Section = ({ title, children }) => <section className="card stack gap-12"><h2 className="h3">{title}</h2>{children}</section>;

export default function BiodataReview() {
  const { id } = useParams();
  const { t, lang } = useApp();
  const a = t.a.bio;
  const f = t.bio.f;
  const { data, error, loading, reload } = useLoad(`/admin/biodatas/${id}`);
  const [modal, setModal] = useState(null);
  const [msg, setMsg] = useState(null);
  const [nidFile, setNidFile] = useState(null);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    let urls = [];
    if (data?.biodata?.hasPhoto) fileUrl(`/files/photo/${id}`).then((x) => { if (x) { urls.push(x.url); setPhoto(x.url); } });
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [data?.biodata?.hasPhoto, id]);

  if (loading && !data) return <Spinner />;
  if (error) return <Alert kind="error">{error.message}</Alert>;
  const b = data.biodata;
  const g = b.general || {}; const ad = b.address || {}; const e = b.education || {}; const fam = b.family || {};
  const p = b.personal || {}; const o = b.occupation || {}; const m = b.marriage || {}; const x = b.expectation || {}; const c = b.contact || {};
  const samePhone = c.guardianPhone && b.owner?.phone && c.guardianPhone === b.owner.phone;

  async function act(path, body, okText) {
    setMsg(null);
    try { await api(`/admin/biodatas/${id}/${path}`, { method: 'POST', body }); setModal(null); setMsg({ kind: 'ok', text: okText || t.common.saved }); reload(); }
    catch (ex) { setMsg({ kind: 'error', text: ex.message }); }
  }
  async function openNid() {
    const r = await fileUrl(`/files/nid/${id}`);
    if (r) setNidFile(r);
  }
  const place = (area, dist, div) => [area, label('district', dist, lang), label('division', div, lang)].filter(Boolean).join(', ');

  return (
    <>
      <Link to="/biodatas" className="small muted">← {a.title}</Link>
      <div className="row between wrap gap-16">
        <div className="stack gap-4">
          <h1 className="display" style={{ fontSize: 'clamp(30px, 3.6vw, 42px)' }}>{b.code || '—'} · {label('type', b.type, lang)}</h1>
          <div className="row wrap gap-8">
            <Pill status={b.status}>{t.dash.status[b.status]}</Pill>
            <Pill status={b.nid?.status}>NID: {t.form.nidStatus[b.nid?.status || 'none']}</Pill>
            {b.hidden && <span className="pill pill-line">hidden · {b.hiddenReason}</span>}
            {b.deletedAt && <span className="pill pill-danger">{a.deleted} {date(b.deletedAt, lang)}</span>}
          </div>
        </div>
        {b.code && b.status === 'approved' && <a className="btn btn-outline btn-sm" href={`${WEB_URL}/biodatas/${b.code}`} target="_blank" rel="noreferrer">{t.common.view} ↗</a>}
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <div className="stack gap-20" style={{ flex: '1 1 620px', minWidth: 0 }}>
          <Section title={a.private}>
            {samePhone && <Alert kind="error">{a.samePhone}</Alert>}
            <KV rows={[
              [t.bio.candidate, c.candidateName], [t.bio.guardian, c.guardianName], [t.bio.relation, label('relation', c.guardianRelation, lang)],
              [t.bio.phoneLabel, c.guardianPhone], [t.bio.phone2, c.guardianPhone2], [t.bio.email, c.email],
              [a.owner, `${b.owner?.name || ''} · ${b.owner?.email || ''}`], [a.ownerPhone, b.owner?.phone], [a.dob, g.dateOfBirth && date(g.dateOfBirth, lang)],
            ]} />
          </Section>
          <Section title={t.bio.sections.general}>
            <KV rows={[[f.maritalStatus, label('marital', g.maritalStatus, lang)], [f.height, height(g.heightInches, lang)], [f.weight, g.weightKg && `${digits(g.weightKg, lang)} kg`], [f.complexion, label('complexion', g.complexion, lang)], [f.bloodGroup, g.bloodGroup], [f.religion, label('religion', g.religion, lang)], [f.community, g.community], [f.nationality, g.nationality]]} />
          </Section>
          <Section title={t.bio.sections.address}>
            <KV rows={[[f.permanentAddress, place(ad.permanentArea, ad.permanentDistrict, ad.permanentDivision)], [f.presentAddress, ad.livesAbroad ? ad.presentCountry : place(ad.presentArea, ad.presentDistrict, ad.presentDivision)], [f.grewUpAt, ad.grewUpAt]]} />
          </Section>
          <Section title={t.bio.sections.education}>
            <KV rows={[[f.medium, label('medium', e.medium, lang)], [f.highestLevel, label('education', e.highestLevel, lang)], ...(e.entries || []).map((en, i) => [label('education', en.level, lang) || `#${i + 1}`, [en.institution, en.subject, en.year, en.result].filter(Boolean).join(' · ')]), [f.otherEducation, e.other]]} />
          </Section>
          <Section title={t.bio.sections.family}>
            <KV rows={[[f.fatherAlive, yesNo(fam.fatherAlive, lang)], [f.fatherOccupation, fam.fatherOccupation], [f.motherAlive, yesNo(fam.motherAlive, lang)], [f.motherOccupation, fam.motherOccupation], [f.brothers, fam.brothers != null ? [digits(fam.brothers, lang), fam.brothersInfo].filter(Boolean).join(' — ') : null], [f.sisters, fam.sisters != null ? [digits(fam.sisters, lang), fam.sistersInfo].filter(Boolean).join(' — ') : null], [f.economicStatus, label('economic', fam.economicStatus, lang)], [f.familyDetails, fam.details]]} />
          </Section>
          <Section title={t.bio.sections.personal}>
            <KV rows={[[f.about, p.about], [f.hobbies, p.hobbies], [f.religiousPractice, p.religiousPractice], [f.healthNotes, p.healthNotes], [f.smokes, yesNo(p.smokes, lang)], [f.diet, p.diet]]} />
          </Section>
          <Section title={t.bio.sections.occupation}>
            <KV rows={[[f.occupation, label('occupation', o.type, lang)], [f.occupationTitle, o.title], [f.occupationDetails, o.details], [f.monthlyIncome, o.monthlyIncome]]} />
          </Section>
          <Section title={t.bio.sections.marriage}>
            <KV rows={[[f.guardiansAgree, yesNo(m.guardiansAgree, lang)], [f.previousMarriageInfo, m.previousMarriageInfo], [f.children, m.children != null ? digits(m.children, lang) : null], [f.willingToRelocate, yesNo(m.willingToRelocate, lang)], [f.careerAfterMarriage, m.careerAfterMarriage], [f.thoughts, m.thoughts]]} />
          </Section>
          <Section title={t.bio.sections.expectation}>
            <KV rows={[[f.ageRange, x.ageMin || x.ageMax ? `${x.ageMin ?? '…'} – ${x.ageMax ?? '…'}` : null], [f.heightRange, x.heightMin || x.heightMax ? `${height(x.heightMin, lang) || '…'} – ${height(x.heightMax, lang) || '…'}` : null], [f.religions, labels('religion', x.religions, lang)], [f.maritalStatuses, labels('marital', x.maritalStatuses, lang)], [f.complexions, labels('complexion', x.complexions, lang)], [f.educationMin, label('education', x.educationMin, lang)], [f.occupations, labels('occupation', x.occupations, lang)], [f.districts, labels('district', x.districts, lang)], [f.economicStatuses, labels('economic', x.economicStatuses, lang)], [f.qualities, x.qualities]]} />
          </Section>
          <Section title={t.form.steps.pledge}>
            <KV rows={[[t.form.pledgeTruthful, yesNo(b.pledge?.truthful, lang)], [t.form.pledgeGuardians, yesNo(b.pledge?.guardiansKnow, lang)], [t.form.pledgeTerms, yesNo(b.pledge?.acceptsTerms, lang)]]} />
          </Section>
        </div>

        <aside className="stack gap-16" style={{ flex: '0 1 360px', minWidth: 300, position: 'sticky', top: 20 }}>
          {!b.deletedAt && (
            <section className="card stack gap-12">
              <h2 className="h3">{a.decision}</h2>
              {b.reviewNote && <Alert kind="info">{b.reviewNote}{b.reviewedBy?.name ? ` — ${b.reviewedBy.name}` : ''} {b.reviewedAt && `· ${dateTime(b.reviewedAt, lang)}`}</Alert>}
              <button type="button" className="btn btn-primary" disabled={b.status === 'approved'} onClick={() => act('review', { decision: 'approved' }, a.approve)}>{a.approve}</button>
              <button type="button" className="btn btn-outline" onClick={() => setModal('changes_requested')}>{a.changes}</button>
              <button type="button" className="btn btn-danger" onClick={() => setModal('rejected')}>{a.reject}</button>
              {b.status === 'approved' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => act('hide', { hidden: !b.hidden, reason: 'staff' })}>{b.hidden ? a.unhide : a.hide}</button>
              )}
            </section>
          )}

          <section className="card stack gap-12">
            <h2 className="h3">{a.nid}</h2>
            <Pill status={b.nid?.status}>{t.form.nidStatus[b.nid?.status || 'none']}</Pill>
            {b.hasNid ? (
              <>
                {!nidFile ? <button type="button" className="btn btn-outline btn-sm" onClick={openNid}>{a.viewNid}</button>
                  : nidFile.type === 'application/pdf' ? <a href={nidFile.url} target="_blank" rel="noreferrer" className="link">PDF ↗</a>
                  : <img src={nidFile.url} alt="NID" className="preview-img" />}
                {b.nid?.status !== 'verified' && <button type="button" className="btn btn-primary btn-sm" onClick={() => act('nid', { decision: 'verified' })}>{a.verify}</button>}
                {b.nid?.status === 'submitted' && <button type="button" className="btn btn-danger btn-sm" onClick={() => setModal('nid_rejected')}>{a.rejectNid}</button>}
              </>
            ) : <p className="muted small">—</p>}
          </section>

          {photo && <section className="card stack gap-12"><h2 className="h3">{a.photo}</h2><img src={photo} alt="" className="preview-img" /></section>}

          <section className="card stack gap-8">
            <div className="row between"><span className="muted">{a.unlocks}</span><b>{digits(data.counts.unlocks, lang)}</b></div>
            <div className="row between"><span className="muted">{a.proposals}</span><b>{digits(data.counts.proposals, lang)}</b></div>
            <div className="row between"><span className="muted">{a.views}</span><b>{digits(b.stats?.views || 0, lang)}</b></div>
          </section>

          {data.reports.length > 0 && (
            <section className="card stack gap-8">
              <h2 className="h3">{a.reportsOn}</h2>
              {data.reports.map((r) => (
                <div key={r._id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <span className="stack"><b className="small">{label('report', r.reason, lang)}</b><span className="tiny muted">{r.reporter?.name} · {date(r.createdAt, lang)}</span></span>
                  <Pill status={r.status}>{t.support.reportStatus[r.status]}</Pill>
                </div>
              ))}
            </section>
          )}
          {b.owner && <Link to={`/users/${b.owner._id}`} className="btn btn-ghost btn-sm">{a.owner}: {b.owner.name} →</Link>}
        </aside>
      </div>

      {(modal === 'rejected' || modal === 'changes_requested') && (
        <NoteModal title={modal === 'rejected' ? a.reject : a.changes} label={a.note} required danger={modal === 'rejected'}
          onClose={() => setModal(null)} onSubmit={(fd) => act('review', { decision: modal, note: fd.get('note') })} />
      )}
      {modal === 'nid_rejected' && (
        <NoteModal title={a.rejectNid} label={a.note} danger onClose={() => setModal(null)} onSubmit={(fd) => act('nid', { decision: 'rejected', note: fd.get('note') || undefined })} />
      )}
    </>
  );
}
