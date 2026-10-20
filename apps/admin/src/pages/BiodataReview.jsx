import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { label, digits, date, dateTime, statusLabel, SECTIONS } from '@ghotok/shared';
import { BiodataView, SectionForm } from '@ghotok/ui/biodata';
import { useApp, useLoad, can } from '../lib/app.jsx';
import { api, fileUrl, WEB_URL } from '../lib/api.js';
import { Alert, Pill, Spinner, NoteModal } from '../components/ui.jsx';

/** One section of the biodata, editable in place by admins. */
function EditableSection({ section, biodata, lang, onSaved, t }) {
  const [values, setValues] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  if (!values) {
    return (
      <div className="stack gap-8 editable">
        <BiodataView biodata={biodata} lang={lang} showPrivate only={[section.key]} />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: 'flex-end' }}
          onClick={() => setValues(structuredClone(biodata[section.key] || {}))}
        >
          {t.common.edit} · {section.title[lang]}
        </button>
      </div>
    );
  }
  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const d = await api(`/admin/biodatas/${biodata._id}`, { method: 'PUT', body: { [section.key]: values } });
      setValues(null);
      onSaved(d.biodata);
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card stack gap-16">
      <h2 className="h3">{section.title[lang]}</h2>
      <Alert kind="info">{t.bio.editHelp}</Alert>
      <SectionForm
        section={section}
        biodata={{ ...biodata, [section.key]: values }}
        lang={lang}
        errors={err?.fields || {}}
        onChange={setValues}
      />
      <Alert kind="error">{err && !err.fields ? err.message : null}</Alert>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={() => setValues(null)}>
          {t.common.cancel}
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
          {t.bio.saveSection}
        </button>
      </div>
    </section>
  );
}

export default function BiodataReview() {
  const { id } = useParams();
  const { t, lang, user } = useApp();
  const a = t.bio;
  const { data, error, loading, reload, setData } = useLoad(`/admin/biodatas/${id}`);
  const [modal, setModal] = useState(null);
  const [msg, setMsg] = useState(null);
  const [nidFile, setNidFile] = useState(null);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    const urls = [];
    if (data?.biodata?.hasPhoto) {
      fileUrl(`/files/photo/${id}`).then((x) => {
        if (x) {
          urls.push(x.url);
          setPhoto(x.url);
        }
      });
    }
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [data?.biodata?.hasPhoto, id]);

  if (loading && !data) return <Spinner />;
  if (error) return <Alert kind="error">{error.message}</Alert>;
  const b = data.biodata;
  const c = b.contact || {};
  const samePhone = c.guardianPhone && b.owner?.phone && c.guardianPhone === b.owner.phone;
  const editable = can(user, 'admin');

  async function act(path, body, okText) {
    setMsg(null);
    try {
      await api(`/admin/biodatas/${id}/${path}`, { method: 'POST', body });
      setModal(null);
      setMsg({ kind: 'ok', text: okText || t.common.saved });
      reload();
    } catch (ex) {
      setMsg({ kind: 'error', text: ex.message });
    }
  }
  async function openNid() {
    const r = await fileUrl(`/files/nid/${id}`);
    if (r) setNidFile(r);
  }

  return (
    <>
      <Link to="/biodatas" className="small muted">
        ← {a.title}
      </Link>
      <div className="row between wrap gap-16">
        <div className="stack gap-4">
          <h1 className="display" style={{ fontSize: 'clamp(30px, 3.6vw, 42px)' }}>
            {b.code || '—'} · {label('type', b.type, lang)}
          </h1>
          <div className="row wrap gap-8">
            <Pill status={b.status}>{statusLabel('biodata', b.status, lang)}</Pill>
            <Pill status={b.nid?.status}>NID: {statusLabel('nid', b.nid?.status || 'none', lang)}</Pill>
            {b.verification?.phone && <span className="pill pill-sage">{t.users.phoneVerified}</span>}
            {b.verification?.email && <span className="pill pill-sage">{t.users.emailVerified}</span>}
            {b.hidden && (
              <span className="pill pill-line">
                {t.common.hidden} · {b.hiddenReason}
              </span>
            )}
            {b.deletedAt && (
              <span className="pill pill-danger">
                {a.deleted} {date(b.deletedAt, lang)}
              </span>
            )}
          </div>
        </div>
        {b.code && b.status === 'approved' && (
          <a className="btn btn-outline btn-sm" href={`${WEB_URL}/biodatas/${b.code}`} target="_blank" rel="noreferrer">
            {t.common.view} ↗
          </a>
        )}
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <div className="review-layout">
        <div className="stack gap-20 review-main">
          <section className="card stack gap-12">
            <h2 className="h3">{a.private}</h2>
            {samePhone && <Alert kind="error">{a.samePhone}</Alert>}
            <dl className="kv" style={{ margin: 0 }}>
              <div>
                <dt>{a.owner}</dt>
                <dd>
                  {b.owner?.name} {b.owner?.email && `· ${b.owner.email}`}
                </dd>
              </div>
              <div>
                <dt>{a.ownerPhone}</dt>
                <dd>{b.owner?.phone || '—'}</dd>
              </div>
              <div>
                <dt>{a.dob}</dt>
                <dd>
                  {b.general?.dateOfBirth
                    ? date(b.general.dateOfBirth, lang, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>
          {SECTIONS.map((s) =>
            editable ? (
              <EditableSection
                key={s.key}
                section={s}
                biodata={b}
                lang={lang}
                t={t}
                onSaved={(nb) => setData((d) => ({ ...d, biodata: { ...d.biodata, ...nb } }))}
              />
            ) : (
              <BiodataView key={s.key} biodata={b} lang={lang} showPrivate only={[s.key]} />
            )
          )}
        </div>

        <aside className="stack gap-16 review-side">
          {!b.deletedAt && (
            <section className="card stack gap-12">
              <h2 className="h3">{a.decision}</h2>
              {b.reviewNote && (
                <Alert kind="info">
                  {b.reviewNote}
                  {b.reviewedBy?.name ? ` — ${b.reviewedBy.name}` : ''}{' '}
                  {b.reviewedAt && `· ${dateTime(b.reviewedAt, lang)}`}
                </Alert>
              )}
              <button
                type="button"
                className="btn btn-primary"
                disabled={b.status === 'approved'}
                onClick={() => act('review', { decision: 'approved' }, a.approve)}
              >
                {a.approve}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setModal('changes_requested')}>
                {a.changes}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setModal('rejected')}>
                {a.reject}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => act('hide', { hidden: !b.hidden, reason: 'staff' })}
              >
                {b.hidden ? a.unhide : a.hide}
              </button>
            </section>
          )}

          <section className="card stack gap-12">
            <h2 className="h3">{a.nid}</h2>
            <Pill status={b.nid?.status}>{statusLabel('nid', b.nid?.status || 'none', lang)}</Pill>
            {b.nid?.uploaded ? (
              <>
                {!nidFile ? (
                  <button type="button" className="btn btn-outline btn-sm" onClick={openNid}>
                    {a.viewNid}
                  </button>
                ) : nidFile.type === 'application/pdf' ? (
                  <a href={nidFile.url} target="_blank" rel="noreferrer" className="link">
                    PDF ↗
                  </a>
                ) : (
                  <img src={nidFile.url} alt="NID" className="preview-img" />
                )}
                {b.nid?.status !== 'verified' && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => act('nid', { decision: 'verified' })}
                  >
                    {a.verify}
                  </button>
                )}
                {b.nid?.status === 'submitted' && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setModal('nid_rejected')}>
                    {a.rejectNid}
                  </button>
                )}
              </>
            ) : (
              <p className="muted small">—</p>
            )}
          </section>

          {photo && (
            <section className="card stack gap-12">
              <h2 className="h3">{a.photo}</h2>
              <img src={photo} alt="" className="preview-img" />
            </section>
          )}

          <section className="card stack gap-8">
            <div className="row between">
              <span className="muted">{a.unlocks}</span>
              <b>{digits(data.counts.unlocks, lang)}</b>
            </div>
            <div className="row between">
              <span className="muted">{a.proposals}</span>
              <b>{digits(data.counts.proposals, lang)}</b>
            </div>
            <div className="row between">
              <span className="muted">{a.views}</span>
              <b>{digits(b.stats?.views || 0, lang)}</b>
            </div>
          </section>

          {data.reports.length > 0 && (
            <section className="card stack gap-8">
              <h2 className="h3">{a.reportsOn}</h2>
              {data.reports.map((r) => (
                <div key={r._id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <span className="stack">
                    <b className="small">{label('report', r.reason, lang)}</b>
                    <span className="tiny muted">
                      {r.reporter?.name} · {date(r.createdAt, lang)}
                    </span>
                  </span>
                  <Pill status={r.priority === 'urgent' && r.status === 'open' ? 'urgent' : r.status}>
                    {statusLabel('report', r.status, lang)}
                  </Pill>
                </div>
              ))}
            </section>
          )}
          {b.owner && (
            <Link to={`/users/${b.owner._id}`} className="btn btn-ghost btn-sm">
              {a.owner}: {b.owner.name} →
            </Link>
          )}
        </aside>
      </div>

      {(modal === 'rejected' || modal === 'changes_requested') && (
        <NoteModal
          title={modal === 'rejected' ? a.reject : a.changes}
          label={a.note}
          required
          danger={modal === 'rejected'}
          onClose={() => setModal(null)}
          onSubmit={(fd) => act('review', { decision: modal, note: fd.get('note') })}
        />
      )}
      {modal === 'nid_rejected' && (
        <NoteModal
          title={a.rejectNid}
          label={a.note}
          danger
          onClose={() => setModal(null)}
          onSubmit={(fd) => act('nid', { decision: 'rejected', note: fd.get('note') || undefined })}
        />
      )}
    </>
  );
}
