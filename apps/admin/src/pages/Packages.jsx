import { useState } from 'react';
import { useApp, useLoad, can } from '../lib/app.jsx';
import { api } from '../lib/api.js';
import { digits, taka } from '@ghotok/shared';
import { Alert, Modal, PageHead, Spinner } from '../components/ui.jsx';

const blank = { nameEn: '', nameBn: '', connections: 3, price: 300, active: true, highlight: false, sort: 0 };

export default function Packages() {
  const { t, lang, user } = useApp();
  const a = t.pkg;
  const { data, error, loading, reload } = useLoad('/admin/packages');
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const canEdit = can(user, 'superadmin');

  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      const body = {
        ...edit.form,
        connections: Number(edit.form.connections),
        price: Number(edit.form.price),
        sort: Number(edit.form.sort),
      };
      await api(edit.id ? `/admin/packages/${edit.id}` : '/admin/packages', { method: edit.id ? 'PUT' : 'POST', body });
      setEdit(null);
      reload();
    } catch (ex) {
      setErr(ex.message);
    }
  }
  const f = edit?.form;
  const set = (k) => (e) =>
    setEdit((x) => ({
      ...x,
      form: { ...x.form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value },
    }));

  return (
    <>
      <PageHead title={a.title}>
        {canEdit && (
          <button type="button" className="btn btn-primary" onClick={() => setEdit({ form: blank })}>
            + {a.add}
          </button>
        )}
      </PageHead>
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <Alert kind="error">{error.message}</Alert>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
          {data.items.map((p) => (
            <div
              key={p._id}
              className="card stack gap-8"
              style={p.highlight ? { border: '2px solid var(--gold)' } : undefined}
            >
              <div className="row between">
                <b>{p.name[lang]}</b>
                {!p.active && <span className="pill pill-line">off</span>}
              </div>
              <span className="display" style={{ fontSize: 44 }}>
                {taka(p.price, lang)}
              </span>
              <span>
                {digits(p.connections, lang)} {t.common.connections}
              </span>
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() =>
                    setEdit({
                      id: p._id,
                      form: {
                        nameEn: p.name.en,
                        nameBn: p.name.bn,
                        connections: p.connections,
                        price: p.price,
                        active: p.active,
                        highlight: p.highlight,
                        sort: p.sort,
                      },
                    })
                  }
                >
                  {a.edit}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {edit && (
        <Modal title={edit.id ? a.edit : a.add} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="stack gap-12">
            <label className="field">
              <span className="label req">{a.nameEn}</span>
              <input className="input" required value={f.nameEn} onChange={set('nameEn')} />
            </label>
            <label className="field">
              <span className="label req">{a.nameBn}</span>
              <input className="input" required value={f.nameBn} onChange={set('nameBn')} />
            </label>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <label className="field">
                <span className="label req">{a.connections}</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="input"
                  required
                  value={f.connections}
                  onChange={set('connections')}
                />
              </label>
              <label className="field">
                <span className="label req">{a.price}</span>
                <input type="number" min={0} className="input" required value={f.price} onChange={set('price')} />
              </label>
              <label className="field">
                <span className="label">{a.sort}</span>
                <input type="number" className="input" value={f.sort} onChange={set('sort')} />
              </label>
            </div>
            <label className="check">
              <input type="checkbox" checked={f.active} onChange={set('active')} />
              {a.active}
            </label>
            <label className="check">
              <input type="checkbox" checked={f.highlight} onChange={set('highlight')} />
              {a.highlight}
            </label>
            <Alert kind="error">{err}</Alert>
            <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>
                {t.common.cancel}
              </button>
              <button type="submit" className="btn btn-primary">
                {a.save}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
