import { useEffect, useState } from 'react';
import { useApp, useLoad, can } from '../lib/app.jsx';
import { api } from '../lib/api.js';
import { Alert, PageHead, Spinner } from '../components/ui.jsx';

const SOCIAL = ['facebook', 'youtube', 'instagram', 'whatsapp', 'messenger'];

function toForm(s) {
  return {
    paymentNumbers: {
      bkash: s.paymentNumbers?.bkash || '',
      nagad: s.paymentNumbers?.nagad || '',
      rocket: s.paymentNumbers?.rocket || '',
    },
    supportEmail: s.supportEmail || '',
    supportPhone: s.supportPhone || '',
    officeAddress: { en: s.officeAddress?.en || '', bn: s.officeAddress?.bn || '' },
    tradeLicense: s.tradeLicense || '',
    social: Object.fromEntries(SOCIAL.map((k) => [k, s.social?.[k] || ''])),
    chatLink: s.chatLink || '',
    announcement: { en: s.announcement?.en || '', bn: s.announcement?.bn || '', active: Boolean(s.announcement) },
  };
}

/** Site settings shown on the website (super admin only can save). */
export default function Settings() {
  const { t, user } = useApp();
  const st = t.settings;
  const { data, error, loading } = useLoad('/admin/settings');
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const editable = can(user, 'superadmin');

  useEffect(() => {
    if (data?.settings) setF(toForm(data.settings));
  }, [data]);

  if ((loading && !data) || (!f && !error)) return <Spinner />;
  if (error) return <Alert kind="error">{error.message}</Alert>;

  const set = (path) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((s) => {
      const next = structuredClone(s);
      const keys = path.split('.');
      keys.slice(0, -1).reduce((o, k) => o[k], next)[keys.at(-1)] = v;
      return next;
    });
  };
  const input = (path, label, props = {}) => (
    <label className="field">
      <span className="label">{label}</span>
      <input
        className="input"
        value={path.split('.').reduce((o, k) => o[k], f)}
        onChange={set(path)}
        disabled={!editable}
        {...props}
      />
    </label>
  );

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api('/admin/settings', { method: 'PUT', body: f });
      setMsg({ kind: 'ok', text: t.common.saved });
    } catch (ex) {
      setMsg({ kind: 'error', text: ex.fields ? Object.values(ex.fields).join(' · ') : ex.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="stack gap-20">
      <PageHead title={st.title} sub={st.sub}>
        {editable && (
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {t.common.save}
          </button>
        )}
      </PageHead>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <section className="card stack gap-16">
        <h2 className="h3">{st.payments}</h2>
        <div className="grid grid-auto-200" style={{ gap: 14 }}>
          {input('paymentNumbers.bkash', st.bkash, { inputMode: 'tel', placeholder: '01XXXXXXXXX' })}
          {input('paymentNumbers.nagad', st.nagad, { inputMode: 'tel', placeholder: '01XXXXXXXXX' })}
          {input('paymentNumbers.rocket', st.rocket, { inputMode: 'tel', placeholder: '01XXXXXXXXXX' })}
        </div>
      </section>
      <section className="card stack gap-16">
        <h2 className="h3">{st.support}</h2>
        <div className="grid grid-2" style={{ gap: 14 }}>
          {input('supportEmail', st.supportEmail, { type: 'email' })}
          {input('supportPhone', st.supportPhone, { inputMode: 'tel' })}
          {input('officeAddress.en', st.addressEn)}
          {input('officeAddress.bn', st.addressBn)}
          {input('tradeLicense', st.tradeLicense)}
          {input('chatLink', st.chatLink, { type: 'url', placeholder: 'https://wa.me/8801XXXXXXXXX' })}
        </div>
      </section>
      <section className="card stack gap-16">
        <h2 className="h3">{st.social}</h2>
        <div className="grid grid-auto-200" style={{ gap: 14 }}>
          {SOCIAL.map((k) => (
            <span key={k}>
              {input(`social.${k}`, k[0].toUpperCase() + k.slice(1), { type: 'url', placeholder: 'https://' })}
            </span>
          ))}
        </div>
      </section>
      <section className="card stack gap-16">
        <h2 className="h3">{st.announcement}</h2>
        <div className="grid grid-2" style={{ gap: 14 }}>
          {input('announcement.en', st.announcementEn, { maxLength: 300 })}
          {input('announcement.bn', st.announcementBn, { maxLength: 300 })}
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={f.announcement.active}
            onChange={set('announcement.active')}
            disabled={!editable}
          />
          {st.announcementOn}
        </label>
      </section>
    </form>
  );
}
