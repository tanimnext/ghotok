'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import NextLink from 'next/link';
import { useApp } from '@/components/Providers';
import { api, fileUrl } from '@/lib/api';
import { options, HEIGHTS, height as fmtHeight } from '@/lib/format';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import { Alert, Spinner, StatusPill } from '@/components/ui';
import { Upload } from '@/components/Icons';
import { Text, Num, Area, Pick, YesNo, Multi, Height } from './fields';

const SECTIONS = ['general', 'address', 'education', 'family', 'personal', 'occupation', 'marriage', 'expectation', 'contact', 'pledge'];
const STEPS = ['general', 'address', 'education', 'family', 'personal', 'occupation', 'marriage', 'expectation', 'contact', 'photo', 'pledge'];

function toForm(b) {
  const f = { type: b?.type };
  for (const s of SECTIONS) f[s] = { ...(b?.[s] || {}) };
  if (f.general.dateOfBirth) f.general.dateOfBirth = String(f.general.dateOfBirth).slice(0, 10);
  f.education.entries = (b?.education?.entries || []).map((e) => ({ ...e }));
  return f;
}

export default function BiodataForm() {
  const { t, lang } = useApp();
  const fm = t.form;
  const [bio, setBio] = useState(undefined); // undefined = loading, null = none yet
  const [form, setForm] = useState(toForm(null));
  const saved = useRef(JSON.stringify(toForm(null)));
  const [step, setStep] = useState(0);
  const [problems, setProblems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const top = useRef(null);

  useEffect(() => {
    api('/me/biodata').then(({ biodata }) => {
      setBio(biodata);
      const f = toForm(biodata);
      setForm(f);
      saved.current = JSON.stringify(f);
    }).catch((e) => { setBio(null); setMsg({ kind: 'error', text: e.message }); });
  }, []);

  const set = (section, key) => (v) => setForm((f) => ({ ...f, [section]: { ...f[section], [key]: v } }));
  const dirtyBody = () => {
    const prev = JSON.parse(saved.current);
    const body = {};
    if (form.type !== prev.type) body.type = form.type;
    for (const s of SECTIONS) if (JSON.stringify(form[s]) !== JSON.stringify(prev[s])) body[s] = form[s];
    return body;
  };

  async function save(advance) {
    setMsg(null);
    if (!form.type) { setMsg({ kind: 'error', text: fm.missingItems.type }); return false; }
    const body = dirtyBody();
    if (!bio) body.type = form.type;
    setBusy(true);
    try {
      if (Object.keys(body).length) {
        const d = await api('/me/biodata', { method: 'PUT', body });
        setBio(d.biodata);
        setProblems(d.problems);
        saved.current = JSON.stringify(form);
      }
      if (advance) { setStep((s) => Math.min(STEPS.length - 1, s + 1)); top.current?.scrollIntoView({ behavior: 'smooth' }); }
      else setMsg({ kind: 'ok', text: t.common.saved });
      return true;
    } catch (e) {
      setMsg({ kind: 'error', text: e.fields ? `${e.message}: ${Object.keys(e.fields).join(', ')}` : e.message });
      return false;
    } finally { setBusy(false); }
  }

  async function submit() {
    if (!(await save(false))) return;
    setBusy(true);
    try {
      const d = await api('/me/biodata/submit', { method: 'POST' });
      setBio(d.biodata);
      setProblems([]);
      setMsg({ kind: 'ok', text: fm.submitted });
    } catch (e) {
      if (e.code === 'INCOMPLETE') setProblems(Object.entries(e.fields).map(([k, v]) => (v === 'required' ? k : `${k}:${v}`)));
      else setMsg({ kind: 'error', text: e.message });
    } finally { setBusy(false); }
  }

  if (bio === undefined) return <Spinner />;
  const choose = fm.choose;
  const g = form.general; const a = form.address; const e = form.education; const fam = form.family;
  const p = form.personal; const o = form.occupation; const m = form.marriage; const x = form.expectation; const c = form.contact; const pl = form.pledge;
  const districtsOf = (div) => (div ? DIVISIONS.find((d) => d.value === div)?.districts || [] : DISTRICTS);
  const cur = STEPS[step];
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 };
  const heightItems = HEIGHTS.map((h) => ({ value: h, en: fmtHeight(h, 'en'), bn: fmtHeight(h, 'bn') }));

  return (
    <>
      <div ref={top} className="row between wrap gap-12">
        <div className="stack gap-4">
          <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>{fm.title}</h1>
          {bio?.code && <span className="small muted">{bio.code} · <NextLink href={`/biodatas/${bio.code}`} className="link">{t.dash.viewPublic}</NextLink></span>}
        </div>
        {bio && <StatusPill status={bio.status}>{t.dash.status[bio.status]}</StatusPill>}
      </div>

      {bio?.status === 'approved' && <Alert kind="warn">{fm.approvedWarn}</Alert>}
      {bio?.reviewNote && ['rejected', 'changes_requested'].includes(bio.status) && <Alert kind="warn"><b>{t.dash.reviewNote}:</b> {bio.reviewNote}</Alert>}

      <nav className="steps" aria-label="Steps">
        {STEPS.map((s, i) => (
          <button key={s} type="button" aria-current={i === step ? 'step' : undefined} className={i < step ? 'done' : ''} onClick={() => setStep(i)}>
            <span className="n">{lang === 'bn' ? String(i + 1).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]) : i + 1}</span>{fm.steps[s]}
          </button>
        ))}
      </nav>

      <section className="card stack gap-24">
        <h2 className="h3">{fm.steps[cur]}</h2>

        {cur === 'general' && (
          <>
            <fieldset className="stack gap-8" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="label req" style={{ marginBottom: 8 }}>{fm.typeQ}</legend>
              <div className="choice-grid">
                {options('type').map((tp) => (
                  <label key={tp.value} className="choice" style={{ padding: '12px 24px', fontSize: 16 }}>
                    <input type="radio" checked={form.type === tp.value} onChange={() => setForm((f) => ({ ...f, type: tp.value }))} />{tp[lang]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div style={grid}>
              <Pick label={t.bio.f.maritalStatus} required value={g.maritalStatus} onChange={set('general', 'maritalStatus')} list="marital" lang={lang} chooseLabel={choose} />
              <Text label={fm.dob} required type="date" value={g.dateOfBirth} onChange={set('general', 'dateOfBirth')} hint={fm.dobHint} max={10} />
              <Height label={t.bio.f.height} required value={g.heightInches} onChange={set('general', 'heightInches')} t={t} lang={lang} />
              <Num label={fm.weightKg} min={30} max={200} value={g.weightKg} onChange={set('general', 'weightKg')} />
              <Pick label={t.bio.f.complexion} value={g.complexion} onChange={set('general', 'complexion')} list="complexion" lang={lang} chooseLabel={choose} />
              <Pick label={t.bio.f.bloodGroup} value={g.bloodGroup} onChange={set('general', 'bloodGroup')} list="blood" lang={lang} chooseLabel={choose} />
              <Pick label={t.bio.f.religion} required value={g.religion} onChange={set('general', 'religion')} list="religion" lang={lang} chooseLabel={choose} />
              <Text label={t.bio.f.community} value={g.community} onChange={set('general', 'community')} max={80} />
              <Text label={t.bio.f.nationality} value={g.nationality} onChange={set('general', 'nationality')} max={40} />
            </div>
          </>
        )}

        {cur === 'address' && (
          <div style={grid}>
            <Pick label={fm.permanentDivision} value={a.permanentDivision} onChange={(v) => setForm((f) => ({ ...f, address: { ...f.address, permanentDivision: v, permanentDistrict: undefined } }))} items={DIVISIONS} lang={lang} chooseLabel={choose} />
            <Pick label={fm.permanentDistrict} required value={a.permanentDistrict} onChange={set('address', 'permanentDistrict')} items={districtsOf(a.permanentDivision)} lang={lang} chooseLabel={choose} />
            <Text label={fm.permanentArea} value={a.permanentArea} onChange={set('address', 'permanentArea')} max={120} />
            <YesNo label={t.bio.f.livesAbroad} value={a.livesAbroad} onChange={set('address', 'livesAbroad')} t={t} />
            {a.livesAbroad ? (
              <Text label={fm.presentCountry} required value={a.presentCountry} onChange={set('address', 'presentCountry')} max={60} />
            ) : (
              <>
                <Pick label={fm.presentDivision} value={a.presentDivision} onChange={(v) => setForm((f) => ({ ...f, address: { ...f.address, presentDivision: v, presentDistrict: undefined } }))} items={DIVISIONS} lang={lang} chooseLabel={choose} />
                <Pick label={fm.presentDistrict} required value={a.presentDistrict} onChange={set('address', 'presentDistrict')} items={districtsOf(a.presentDivision)} lang={lang} chooseLabel={choose} />
                <Text label={fm.presentArea} value={a.presentArea} onChange={set('address', 'presentArea')} max={120} />
              </>
            )}
            <Area label={fm.grewUpAt} value={a.grewUpAt} onChange={set('address', 'grewUpAt')} max={200} rows={2} />
          </div>
        )}

        {cur === 'education' && (
          <div className="stack gap-20">
            <div style={grid}>
              <Pick label={t.bio.f.medium} value={e.medium} onChange={set('education', 'medium')} list="medium" lang={lang} chooseLabel={choose} />
              <Pick label={t.bio.f.highestLevel} required value={e.highestLevel} onChange={set('education', 'highestLevel')} list="education" lang={lang} chooseLabel={choose} />
            </div>
            {(e.entries || []).map((en, i) => {
              const upd = (k) => (v) => setForm((f) => ({ ...f, education: { ...f.education, entries: f.education.entries.map((x2, j) => (j === i ? { ...x2, [k]: v } : x2)) } }));
              return (
                <div key={i} className="stack gap-12" style={{ border: '1px solid var(--line)', borderRadius: 20, padding: 18 }}>
                  <div style={grid}>
                    <Pick label={fm.level} value={en.level} onChange={upd('level')} list="education" lang={lang} chooseLabel={choose} />
                    <Text label={fm.institution} value={en.institution} onChange={upd('institution')} max={120} />
                    <Text label={fm.subject} value={en.subject} onChange={upd('subject')} max={120} />
                    <Num label={fm.year} min={1960} max={2035} value={en.year} onChange={upd('year')} />
                    <Text label={fm.result} value={en.result} onChange={upd('result')} max={40} />
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', color: 'var(--danger)' }}
                    onClick={() => setForm((f) => ({ ...f, education: { ...f.education, entries: f.education.entries.filter((_, j) => j !== i) } }))}>{fm.removeEducation}</button>
                </div>
              );
            })}
            {(e.entries || []).length < 8 && (
              <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}
                onClick={() => setForm((f) => ({ ...f, education: { ...f.education, entries: [...(f.education.entries || []), {}] } }))}>+ {fm.addEducation}</button>
            )}
            <Area label={t.bio.f.otherEducation} value={e.other} onChange={set('education', 'other')} max={500} rows={2} />
          </div>
        )}

        {cur === 'family' && (
          <div style={grid}>
            <YesNo label={t.bio.f.fatherAlive} value={fam.fatherAlive} onChange={set('family', 'fatherAlive')} t={t} />
            <Text label={t.bio.f.fatherOccupation} value={fam.fatherOccupation} onChange={set('family', 'fatherOccupation')} max={200} />
            <YesNo label={t.bio.f.motherAlive} value={fam.motherAlive} onChange={set('family', 'motherAlive')} t={t} />
            <Text label={t.bio.f.motherOccupation} value={fam.motherOccupation} onChange={set('family', 'motherOccupation')} max={200} />
            <Num label={t.bio.f.brothers} min={0} max={20} value={fam.brothers} onChange={set('family', 'brothers')} />
            <Num label={t.bio.f.sisters} min={0} max={20} value={fam.sisters} onChange={set('family', 'sisters')} />
            <Area label={fm.brothersInfo} value={fam.brothersInfo} onChange={set('family', 'brothersInfo')} max={500} rows={2} />
            <Area label={fm.sistersInfo} value={fam.sistersInfo} onChange={set('family', 'sistersInfo')} max={500} rows={2} />
            <Pick label={t.bio.f.economicStatus} required value={fam.economicStatus} onChange={set('family', 'economicStatus')} list="economic" lang={lang} chooseLabel={choose} />
            <Area label={t.bio.f.familyDetails} value={fam.details} onChange={set('family', 'details')} max={1000} />
          </div>
        )}

        {cur === 'personal' && (
          <div style={grid}>
            <Area label={t.bio.f.about} value={p.about} onChange={set('personal', 'about')} max={1500} rows={5} />
            <Area label={t.bio.f.hobbies} value={p.hobbies} onChange={set('personal', 'hobbies')} max={500} rows={2} />
            <Area label={t.bio.f.religiousPractice} value={p.religiousPractice} onChange={set('personal', 'religiousPractice')} max={500} rows={2} />
            <Area label={t.bio.f.healthNotes} value={p.healthNotes} onChange={set('personal', 'healthNotes')} max={500} rows={2} />
            <YesNo label={t.bio.f.smokes} value={p.smokes} onChange={set('personal', 'smokes')} t={t} />
            <Text label={t.bio.f.diet} value={p.diet} onChange={set('personal', 'diet')} max={100} />
          </div>
        )}

        {cur === 'occupation' && (
          <div style={grid}>
            <Pick label={t.bio.f.occupation} required value={o.type} onChange={set('occupation', 'type')} list="occupation" lang={lang} chooseLabel={choose} />
            <Text label={t.bio.f.occupationTitle} value={o.title} onChange={set('occupation', 'title')} max={120} />
            <Text label={t.bio.f.monthlyIncome} value={o.monthlyIncome} onChange={set('occupation', 'monthlyIncome')} max={60} />
            <Area label={t.bio.f.occupationDetails} value={o.details} onChange={set('occupation', 'details')} max={500} rows={3} />
          </div>
        )}

        {cur === 'marriage' && (
          <div style={grid}>
            <YesNo label={t.bio.f.guardiansAgree} required value={m.guardiansAgree} onChange={set('marriage', 'guardiansAgree')} t={t} />
            <YesNo label={t.bio.f.willingToRelocate} value={m.willingToRelocate} onChange={set('marriage', 'willingToRelocate')} t={t} />
            {g.maritalStatus && g.maritalStatus !== 'never_married' && (
              <>
                <Num label={t.bio.f.children} min={0} max={15} value={m.children} onChange={set('marriage', 'children')} />
                <Area label={t.bio.f.previousMarriageInfo} value={m.previousMarriageInfo} onChange={set('marriage', 'previousMarriageInfo')} max={500} rows={3} />
              </>
            )}
            <Area label={t.bio.f.careerAfterMarriage} value={m.careerAfterMarriage} onChange={set('marriage', 'careerAfterMarriage')} max={300} rows={2} />
            <Area label={t.bio.f.thoughts} value={m.thoughts} onChange={set('marriage', 'thoughts')} max={1000} />
          </div>
        )}

        {cur === 'expectation' && (
          <div style={grid}>
            <Num label={fm.expAgeMin} min={18} max={80} value={x.ageMin} onChange={set('expectation', 'ageMin')} />
            <Num label={fm.expAgeMax} min={18} max={80} value={x.ageMax} onChange={set('expectation', 'ageMax')} />
            <Pick label={fm.expHeightMin} value={x.heightMin} onChange={(v) => set('expectation', 'heightMin')(v ? Number(v) : undefined)} items={heightItems} lang={lang} chooseLabel={t.common.any} />
            <Pick label={fm.expHeightMax} value={x.heightMax} onChange={(v) => set('expectation', 'heightMax')(v ? Number(v) : undefined)} items={heightItems} lang={lang} chooseLabel={t.common.any} />
            <Pick label={t.bio.f.educationMin} value={x.educationMin} onChange={set('expectation', 'educationMin')} list="education" lang={lang} chooseLabel={t.common.any} />
            <Multi label={t.bio.f.religions} value={x.religions} onChange={set('expectation', 'religions')} list="religion" lang={lang} />
            <Multi label={t.bio.f.maritalStatuses} value={x.maritalStatuses} onChange={set('expectation', 'maritalStatuses')} list="marital" lang={lang} />
            <Multi label={t.bio.f.complexions} value={x.complexions} onChange={set('expectation', 'complexions')} list="complexion" lang={lang} />
            <Multi label={t.bio.f.occupations} value={x.occupations} onChange={set('expectation', 'occupations')} list="occupation" lang={lang} />
            <Multi label={t.bio.f.economicStatuses} value={x.economicStatuses} onChange={set('expectation', 'economicStatuses')} list="economic" lang={lang} />
            <Multi label={t.bio.f.districts} value={x.districts} onChange={set('expectation', 'districts')} items={[...DISTRICTS].sort((q, r) => q[lang].localeCompare(r[lang]))} lang={lang} scroll />
            <Area label={t.bio.f.qualities} value={x.qualities} onChange={set('expectation', 'qualities')} max={1000} />
          </div>
        )}

        {cur === 'contact' && (
          <>
            <Alert kind="info">{fm.contactPrivate}</Alert>
            <div style={grid}>
              <Text label={fm.candidateName} value={c.candidateName} onChange={set('contact', 'candidateName')} max={80} />
              <Text label={fm.guardianName} required value={c.guardianName} onChange={set('contact', 'guardianName')} max={80} />
              <Pick label={fm.guardianRelation} required value={c.guardianRelation} onChange={set('contact', 'guardianRelation')} list="relation" lang={lang} chooseLabel={choose} />
              <Text label={fm.guardianPhone} required type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={c.guardianPhone} onChange={set('contact', 'guardianPhone')} hint={fm.guardianPhoneHint} max={20} />
              <Text label={fm.guardianPhone2} type="tel" inputMode="tel" value={c.guardianPhone2} onChange={set('contact', 'guardianPhone2')} max={20} />
              <Text label={fm.contactEmail} type="email" value={c.email} onChange={set('contact', 'email')} max={120} />
            </div>
          </>
        )}

        {cur === 'photo' && <PhotoAndNid bio={bio} setBio={setBio} t={t} />}

        {cur === 'pledge' && (
          <div className="stack gap-16">
            <p className="muted">{fm.pledgeTitle}</p>
            {[['truthful', fm.pledgeTruthful], ['guardiansKnow', fm.pledgeGuardians], ['acceptsTerms', fm.pledgeTerms]].map(([k, l]) => (
              <label key={k} className="check"><input type="checkbox" checked={Boolean(pl[k])} onChange={(ev) => set('pledge', k)(ev.target.checked)} />{l}</label>
            ))}
            {problems.length > 0 && (
              <Alert kind="warn">
                <b>{fm.missing}</b>
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>{problems.map((pr) => <li key={pr}>{fm.missingItems[pr] || fm.missingItems[pr.split(':')[0]] || pr}</li>)}</ul>
              </Alert>
            )}
          </div>
        )}

        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

        <div className="row between wrap gap-12" style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
          <button type="button" className="btn btn-ghost" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>← {t.common.back}</button>
          <div className="row gap-8 wrap">
            {cur !== 'photo' && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => save(false)}>{busy ? t.common.saving : fm.saveDraft}</button>}
            {cur === 'pledge' ? (
              bio?.status !== 'approved' && bio?.status !== 'pending' && <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>{fm.submitReview}</button>
            ) : cur === 'photo' ? (
              <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>{t.common.next} →</button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(true)}>{fm.saveNext} →</button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function PhotoAndNid({ bio, setBio, t }) {
  const fm = t.form;
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const hasPhoto = bio?.hasPhoto;
  const nid = bio?.nid || { status: 'none' };

  useEffect(() => {
    let url;
    if (hasPhoto && bio?._id) fileUrl(`/files/photo/${bio._id}`).then((u) => { url = u; setPhoto(u); });
    else setPhoto(null);
    return () => url && URL.revokeObjectURL(url);
  }, [hasPhoto, bio?._id]);

  if (!bio) return <Alert kind="info">{fm.missingItems.type}</Alert>;

  async function upload(kind, file) {
    if (!file) return;
    setBusy(kind); setErr('');
    const form = new FormData();
    form.append('file', file);
    try {
      const d = await api(`/me/biodata/${kind}`, { method: 'POST', form });
      setBio((b) => (kind === 'photo' ? { ...b, hasPhoto: true, _photoV: Date.now() } : { ...b, nid: d.nid }));
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  }
  async function removePhoto() {
    setBusy('photo');
    try { await api('/me/biodata/photo', { method: 'DELETE' }); setBio((b) => ({ ...b, hasPhoto: false })); } catch (e) { setErr(e.message); } finally { setBusy(''); }
  }

  return (
    <div className="grid grid-2" style={{ gap: 20 }}>
      <div className="stack gap-12" style={{ border: '1px solid var(--line)', borderRadius: 22, padding: 20 }}>
        <b>{fm.photoTitle}</b>
        <p className="small muted">{fm.photoHelp}</p>
        {photo && <img src={photo} alt="" style={{ borderRadius: 18, maxHeight: 260, objectFit: 'cover' }} />}
        <label className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
          <Upload size={16} />{busy === 'photo' ? t.common.saving : fm.uploadPhoto}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload('photo', e.target.files?.[0])} />
        </label>
        {hasPhoto && <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', color: 'var(--danger)' }} onClick={removePhoto}>{fm.removePhoto}</button>}
      </div>
      <div className="stack gap-12" style={{ border: '1px solid var(--line)', borderRadius: 22, padding: 20 }}>
        <div className="row between gap-8"><b>{fm.nidTitle}</b><StatusPill status={nid.status}>{fm.nidStatus[nid.status]}</StatusPill></div>
        <p className="small muted">{fm.nidHelp}</p>
        {nid.note && nid.status === 'rejected' && <Alert kind="warn">{nid.note}</Alert>}
        {nid.status !== 'verified' && (
          <label className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
            <Upload size={16} />{busy === 'nid' ? t.common.saving : fm.uploadNid}
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => upload('nid', e.target.files?.[0])} />
          </label>
        )}
      </div>
      {err && <div style={{ gridColumn: '1 / -1' }}><Alert kind="error">{err}</Alert></div>}
    </div>
  );
}
