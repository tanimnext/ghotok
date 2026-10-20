'use client';
/**
 * Biodata editor: one step per schema section (+ photo/NID), saved step by step.
 * Fields, labels, conditions and validation all come from @ghotok/shared, so this page
 * never needs to change when a field is added to the schema.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NextLink from 'next/link';
import { FORM_STEPS, SECTION_KEYS, sectionByKey, options, digits } from '@ghotok/shared';
import { SectionForm, problemsBySection, problemFieldErrors } from '@ghotok/ui/biodata';
import { useApp } from '@/components/Providers';
import { api } from '@/lib/api';
import { Alert, Spinner, StatusPill } from '@/components/ui';
import PhotoAndNid from './PhotoAndNid';

const emptyForm = () => Object.fromEntries([['type', undefined], ...SECTION_KEYS.map((k) => [k, {}])]);

function toForm(b) {
  const f = emptyForm();
  if (!b) return f;
  f.type = b.type;
  for (const k of SECTION_KEYS) f[k] = structuredClone(b[k] || {});
  if (f.general.dateOfBirth) f.general.dateOfBirth = String(f.general.dateOfBirth).slice(0, 10);
  return f;
}

export default function BiodataEditor() {
  const { t, lang } = useApp();
  const fm = t.form;
  const [bio, setBio] = useState(undefined); // undefined = loading, null = not created yet
  const [form, setForm] = useState(emptyForm);
  const saved = useRef(JSON.stringify(emptyForm()));
  const [step, setStep] = useState(0);
  const [problems, setProblems] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const top = useRef(null);

  useEffect(() => {
    api('/me/biodata')
      .then(({ biodata }) => {
        setBio(biodata);
        const f = toForm(biodata);
        setForm(f);
        saved.current = JSON.stringify(f);
      })
      .catch((e) => {
        setBio(null);
        setMsg({ kind: 'error', text: e.message });
      });
  }, []);

  const dirty = JSON.stringify(form) !== saved.current;
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /** Only the sections that changed since the last save. */
  const changes = useCallback(() => {
    const prev = JSON.parse(saved.current);
    const body = {};
    if (form.type !== prev.type || !bio) body.type = form.type;
    for (const k of SECTION_KEYS) if (JSON.stringify(form[k]) !== JSON.stringify(prev[k])) body[k] = form[k];
    return body;
  }, [form, bio]);

  const save = useCallback(async () => {
    setMsg(null);
    if (!form.type) {
      setMsg({ kind: 'error', text: fm.chooseType });
      setStep(0);
      return false;
    }
    const body = changes();
    if (!Object.keys(body).length) return true;
    setBusy(true);
    try {
      const d = await api('/me/biodata', { method: 'PUT', body });
      setBio(d.biodata);
      setProblems(d.problems);
      setFieldErrors({});
      saved.current = JSON.stringify(form);
      return true;
    } catch (e) {
      setFieldErrors(e.fields || {});
      setMsg({ kind: 'error', text: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  }, [changes, form, fm.chooseType]);

  const go = async (i) => {
    if (i === step) return;
    if (await save()) {
      setStep(i);
      top.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  async function submit() {
    if (!(await save())) return;
    setBusy(true);
    try {
      const d = await api('/me/biodata/submit', { method: 'POST' });
      setBio(d.biodata);
      setProblems([]);
      setMsg({ kind: 'ok', text: fm.submitted });
    } catch (e) {
      if (e.code === 'BIODATA_INCOMPLETE') {
        const codes = Object.entries(e.fieldCodes || {}).map(([k, v]) => (v === 'required' ? k : v));
        setProblems(codes);
      } else setMsg({ kind: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  const bySection = useMemo(() => problemsBySection(problems, lang, form.type), [problems, lang, form.type]);
  const errors = useMemo(
    () => ({ ...problemFieldErrors(problems, lang, form.type), ...fieldErrors }),
    [problems, lang, form.type, fieldErrors]
  );

  if (bio === undefined) return <Spinner />;
  const cur = FORM_STEPS[step];
  const section = sectionByKey[cur];
  const last = step === FORM_STEPS.length - 1;
  const canSubmit = !['approved', 'pending'].includes(bio?.status);

  return (
    <>
      <div ref={top} className="row between wrap gap-12">
        <div className="stack gap-4">
          <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>
            {fm.title}
          </h1>
          {bio?.code && (
            <span className="small muted">
              {bio.code} ·{' '}
              <NextLink href={`/biodatas/${bio.code}`} className="link">
                {t.dash.viewPublic}
              </NextLink>
            </span>
          )}
        </div>
        {bio && <StatusPill status={bio.status}>{t.dash.status[bio.status]}</StatusPill>}
      </div>

      {bio?.status === 'approved' && <Alert kind="warn">{fm.approvedWarn}</Alert>}
      {bio?.reviewNote && ['rejected', 'changes_requested'].includes(bio.status) && (
        <Alert kind="warn">
          <b>{t.dash.reviewNote}:</b> {bio.reviewNote}
        </Alert>
      )}

      <nav className="steps" aria-label={fm.stepsLabel}>
        {FORM_STEPS.map((s, i) => {
          const title = sectionByKey[s]?.step[lang] || fm.photoStep;
          const issues = bySection[s]?.length;
          return (
            <button
              key={s}
              type="button"
              aria-current={i === step ? 'step' : undefined}
              className={issues ? 'has-issues' : i < step ? 'done' : ''}
              onClick={() => go(i)}
              disabled={busy}
            >
              <span className="n">{digits(i + 1, lang)}</span>
              {title}
            </button>
          );
        })}
      </nav>

      <section className="card stack gap-24">
        <div className="stack gap-8">
          <h2 className="h3">{section ? section.title[lang] : fm.photoTitle}</h2>
          {section?.help && <Alert kind="info">{section.help[lang]}</Alert>}
        </div>

        {cur === 'general' && (
          <fieldset className="field" style={{ gap: 8 }}>
            <legend className="label req">{fm.typeQ}</legend>
            <div className="choice-grid">
              {options('type').map((tp) => (
                <label key={tp.value} className="choice choice-lg">
                  <input
                    type="radio"
                    name="type"
                    checked={form.type === tp.value}
                    disabled={Boolean(bio)}
                    onChange={() => setForm((f) => ({ ...f, type: tp.value }))}
                  />
                  {tp[lang]}
                </label>
              ))}
            </div>
            {bio && <span className="hint">{fm.typeLocked}</span>}
          </fieldset>
        )}

        {section && (
          <SectionForm
            section={section}
            biodata={form}
            lang={lang}
            errors={errors}
            onChange={(values) => setForm((f) => ({ ...f, [cur]: values }))}
          />
        )}

        {cur === 'photo' && <PhotoAndNid bio={bio} setBio={setBio} />}

        {last && problems.length > 0 && (
          <Alert kind="warn">
            <b>{fm.missing}</b>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              {Object.entries(bySection).map(([s, list]) =>
                list.map((p) => (
                  <li key={p.code}>
                    <button type="button" className="link-btn" onClick={() => go(FORM_STEPS.indexOf(s))}>
                      {sectionByKey[s]?.step[lang]}
                    </button>{' '}
                    — {p.message}
                  </li>
                ))
              )}
            </ul>
          </Alert>
        )}

        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

        <div className="row between wrap gap-12" style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
          <button type="button" className="btn btn-ghost" disabled={step === 0 || busy} onClick={() => go(step - 1)}>
            ← {t.common.back}
          </button>
          <div className="row gap-8 wrap">
            {cur !== 'photo' && (
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy || !dirty}
                onClick={async () => (await save()) && setMsg({ kind: 'ok', text: t.common.saved })}
              >
                {busy ? t.common.saving : fm.saveDraft}
              </button>
            )}
            {last ? (
              canSubmit && (
                <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
                  {fm.submitReview}
                </button>
              )
            ) : (
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => go(step + 1)}>
                {fm.saveNext} →
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
