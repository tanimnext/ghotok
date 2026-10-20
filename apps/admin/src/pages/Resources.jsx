import { useState } from 'react';
import { num } from '@ghotok/shared';
import { useApp, useLoad, can } from '../lib/app.jsx';
import { api, API_URL } from '../lib/api.js';
import { Alert, Modal, PageHead, Spinner } from '../components/ui.jsx';

const EMPTY = { titleEn: '', titleBn: '', descriptionEn: '', descriptionBn: '', published: true, sort: 0 };

function ResourceForm({ initial, onClose, onSaved, t }) {
  const r = t.resources;
  const [f, setF] = useState(initial || EMPTY);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) =>
    setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const form = new FormData();
    for (const [k, v] of Object.entries(f)) if (k !== '_id') form.append(k, String(v ?? ''));
    if (file) form.append('file', file);
    try {
      await api(initial?._id ? `/admin/resources/${initial._id}` : '/admin/resources', {
        method: initial?._id ? 'PUT' : 'POST',
        form,
      });
      onSaved();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={initial?._id ? t.common.edit : r.add} onClose={onClose} wide>
      <form onSubmit={submit} className="stack gap-16">
        <div className="grid grid-2" style={{ gap: 14 }}>
          <label className="field">
            <span className="label req">{r.titleEn}</span>
            <input
              className="input"
              required
              minLength={2}
              maxLength={120}
              value={f.titleEn}
              onChange={set('titleEn')}
            />
          </label>
          <label className="field">
            <span className="label req">{r.titleBn}</span>
            <input
              className="input"
              required
              minLength={2}
              maxLength={120}
              value={f.titleBn}
              onChange={set('titleBn')}
            />
          </label>
          <label className="field">
            <span className="label">{r.descEn}</span>
            <textarea className="textarea" maxLength={500} value={f.descriptionEn} onChange={set('descriptionEn')} />
          </label>
          <label className="field">
            <span className="label">{r.descBn}</span>
            <textarea className="textarea" maxLength={500} value={f.descriptionBn} onChange={set('descriptionBn')} />
          </label>
          <label className="field">
            <span className="label">{r.order}</span>
            <input className="input" type="number" value={f.sort} onChange={set('sort')} />
          </label>
          <label className="check" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={f.published} onChange={set('published')} />
            {r.published}
          </label>
        </div>
        <label className="field">
          <span className={`label${initial?._id ? '' : ' req'}`}>{initial?._id ? r.replaceFile : r.file}</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            required={!initial?._id}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <Alert kind="error">{err}</Alert>
        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {t.common.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Resources() {
  const { t, lang, user } = useApp();
  const r = t.resources;
  const { data, error, loading, reload } = useLoad('/admin/resources');
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState('');
  const editable = can(user, 'superadmin');

  async function remove(item) {
    if (!window.confirm(r.confirmDelete)) return;
    try {
      await api(`/admin/resources/${item._id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <>
      <PageHead title={r.title} sub={r.sub}>
        {editable && (
          <button type="button" className="btn btn-primary" onClick={() => setEdit({})}>
            + {r.add}
          </button>
        )}
      </PageHead>
      <Alert kind="error">{msg}</Alert>
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <Alert kind="error">{error.message}</Alert>
      ) : !data.items.length ? (
        <p className="card empty">{t.common.none}</p>
      ) : (
        <section className="card" style={{ padding: 8 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{r.titleEn}</th>
                  <th>{r.file}</th>
                  <th>{r.downloads}</th>
                  <th>{r.published}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((x) => (
                  <tr key={x._id}>
                    <td>
                      <span className="stack">
                        <b>{x.title?.[lang]}</b>
                        <span className="tiny muted">{x.title?.[lang === 'bn' ? 'en' : 'bn']}</span>
                      </span>
                    </td>
                    <td>
                      <a href={`${API_URL}/api/resources/${x._id}/download`} target="_blank" rel="noreferrer">
                        {x.fileName}
                      </a>
                    </td>
                    <td>{num(x.downloads, lang)}</td>
                    <td>{x.published ? t.common.yes : t.common.no}</td>
                    <td>
                      {editable && (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() =>
                              setEdit({
                                _id: x._id,
                                titleEn: x.title?.en || '',
                                titleBn: x.title?.bn || '',
                                descriptionEn: x.description?.en || '',
                                descriptionBn: x.description?.bn || '',
                                published: x.published,
                                sort: x.sort || 0,
                              })
                            }
                          >
                            {t.common.edit}
                          </button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(x)}>
                            {t.common.delete}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {edit && (
        <ResourceForm
          t={t}
          initial={edit._id ? edit : null}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            reload();
          }}
        />
      )}
    </>
  );
}
