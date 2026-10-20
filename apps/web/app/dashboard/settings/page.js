'use client';
/** Account and security: profile, email / phone verification, password, sessions, deletion. */
import { useState } from 'react';
import { options } from '@ghotok/shared';
import { useApp } from '@/components/Providers';
import { api, setToken } from '@/lib/api';
import { Alert, Field, Modal } from '@/components/ui';
import OtpForm from '@/components/OtpForm';

function Verified({ ok, t }) {
  return (
    <span className={`pill ${ok ? 'pill-sage' : 'pill-amber'}`}>
      {ok ? t.settings.verified : t.settings.notVerified}
    </span>
  );
}

export default function Settings() {
  const { t, lang, setLang, user, setUser, logout } = useApp();
  const st = t.settings;
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState({});
  const [modal, setModal] = useState(null);

  const say = (k, kind, text) => setMsg((m) => ({ ...m, [k]: { kind, text } }));

  async function saveProfile(e) {
    e.preventDefault();
    try {
      const d = await api('/auth/me', { method: 'PATCH', body: { name } });
      setUser(d.user);
      say('profile', 'ok', t.common.saved);
    } catch (ex) {
      say('profile', 'error', ex.message);
    }
  }

  async function sendEmailLink() {
    try {
      await api('/auth/email/send-verification', { method: 'POST' });
      say('email', 'ok', st.emailSent);
    } catch (ex) {
      say('email', 'error', ex.message);
    }
  }

  async function changePw(e) {
    e.preventDefault();
    try {
      const d = await api('/auth/change-password', { method: 'POST', body: pw });
      setToken(d.token);
      setUser(d.user);
      setPw({ current: '', next: '' });
      say('pw', 'ok', st.pwChanged);
    } catch (ex) {
      say('pw', 'error', ex.fields?.current || ex.fields?.next || ex.message);
    }
  }

  async function logoutAll() {
    try {
      await api('/auth/logout-all', { method: 'POST' });
    } finally {
      logout();
    }
  }

  return (
    <>
      <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>
        {st.title}
      </h1>

      <form onSubmit={saveProfile} className="card stack gap-16">
        <h2 className="h3">{st.profile}</h2>
        <div className="grid grid-2" style={{ gap: 16 }}>
          <Field id="nm" label={t.auth.name} required>
            <input
              id="nm"
              className="input"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field id="lang" label={st.language}>
            <select id="lang" className="select" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="bn">বাংলা</option>
              <option value="en">English</option>
            </select>
          </Field>
        </div>
        {msg.profile && <Alert kind={msg.profile.kind}>{msg.profile.text}</Alert>}
        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          {t.common.save}
        </button>
      </form>

      <section className="card stack gap-16">
        <h2 className="h3">{st.contactT}</h2>
        <p className="small muted">{st.contactD}</p>
        <div className="list-row">
          <span className="stack gap-4">
            <span className="label">{t.auth.email}</span>
            <b>{user.email || st.none}</b>
          </span>
          {user.email && (
            <span className="row gap-8 wrap">
              <Verified ok={user.emailVerified} t={t} />
              {!user.emailVerified && (
                <button type="button" className="btn btn-outline btn-sm" onClick={sendEmailLink}>
                  {st.sendLink}
                </button>
              )}
            </span>
          )}
        </div>
        {msg.email && <Alert kind={msg.email.kind}>{msg.email.text}</Alert>}
        <div className="list-row">
          <span className="stack gap-4">
            <span className="label">{t.auth.phone}</span>
            <b>{user.phone || st.none}</b>
          </span>
          <span className="row gap-8 wrap">
            {user.phone && <Verified ok={user.phoneVerified} t={t} />}
            {user.phone && !user.phoneVerified && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal('verifyPhone')}>
                {st.verifyPhone}
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal('changePhone')}>
              {user.phone ? st.changePhone : st.addPhone}
            </button>
          </span>
        </div>
        {msg.phone && <Alert kind={msg.phone.kind}>{msg.phone.text}</Alert>}
      </section>

      <form onSubmit={changePw} className="card stack gap-16">
        <h2 className="h3">{user.hasPassword ? st.changePw : st.setPw}</h2>
        <div className="grid grid-2" style={{ gap: 16 }}>
          {user.hasPassword && (
            <Field id="cur" label={st.current} required>
              <input
                id="cur"
                type="password"
                className="input"
                autoComplete="current-password"
                required
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
              />
            </Field>
          )}
          <Field id="nw" label={st.newPw} required hint={t.auth.passwordHint}>
            <input
              id="nw"
              type="password"
              className="input"
              autoComplete="new-password"
              required
              minLength={8}
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
          </Field>
        </div>
        {msg.pw && <Alert kind={msg.pw.kind}>{msg.pw.text}</Alert>}
        <div className="row gap-8 wrap">
          <button type="submit" className="btn btn-primary">
            {t.common.save}
          </button>
          <button type="button" className="btn btn-outline" onClick={logoutAll}>
            {st.logoutAll}
          </button>
        </div>
      </form>

      <section className="card stack gap-12 danger-zone">
        <h2 className="h3 danger-text">{st.dangerT}</h2>
        <p className="muted">{st.dangerD}</p>
        {msg.del && <Alert kind={msg.del.kind}>{msg.del.text}</Alert>}
        <div className="row gap-8 wrap">
          <button type="button" className="btn btn-danger" onClick={() => setModal('deleteBiodata')}>
            {st.deleteBtn}
          </button>
          <button type="button" className="btn btn-ghost danger-text" onClick={() => setModal('deleteAccount')}>
            {st.deleteAccount}
          </button>
        </div>
      </section>

      {modal === 'verifyPhone' && (
        <Modal title={st.verifyPhone} onClose={() => setModal(null)}>
          <OtpForm
            phone={user.phone}
            onDone={(u) => {
              setUser(u);
              setModal(null);
              say('phone', 'ok', st.phoneVerified);
            }}
          />
        </Modal>
      )}
      {modal === 'changePhone' && (
        <Modal title={user.phone ? st.changePhone : st.addPhone} onClose={() => setModal(null)}>
          <OtpForm
            askPhone
            onDone={(u) => {
              setUser(u);
              setModal(null);
              say('phone', 'ok', st.phoneVerified);
            }}
          />
        </Modal>
      )}
      {modal === 'deleteBiodata' && (
        <DeleteBiodataModal
          t={t}
          lang={lang}
          onClose={() => setModal(null)}
          onDone={(ok, text) => {
            setModal(null);
            say('del', ok ? 'ok' : 'error', text);
          }}
        />
      )}
      {modal === 'deleteAccount' && (
        <DeleteAccountModal t={t} user={user} onClose={() => setModal(null)} onDeleted={logout} />
      )}
    </>
  );
}

function DeleteBiodataModal({ t, lang, onClose, onDone }) {
  const st = t.settings;
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const go = async () => {
    try {
      await api('/me/biodata/delete', { method: 'POST', body: { reason, note } });
      onDone(true, st.deleted);
    } catch (e) {
      onDone(false, e.message);
    }
  };
  return (
    <Modal title={st.deleteBtn} onClose={onClose}>
      <fieldset className="field">
        <legend className="label req">{st.deleteReason}</legend>
        {options('delete').map((o) => (
          <label key={o.value} className="check">
            <input type="radio" name="del" checked={reason === o.value} onChange={() => setReason(o.value)} />
            {o[lang]}
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span className="label">{st.deleteNote}</span>
        <textarea className="textarea" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t.common.cancel}
        </button>
        <button type="button" className="btn btn-danger" disabled={!reason} onClick={go}>
          {st.deleteBtn}
        </button>
      </div>
    </Modal>
  );
}

function DeleteAccountModal({ t, user, onClose, onDeleted }) {
  const st = t.settings;
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const go = async (e) => {
    e.preventDefault();
    try {
      await api('/auth/delete-account', { method: 'POST', body: { password, reason } });
      onDeleted();
    } catch (ex) {
      setErr(ex.fields?.password || ex.message);
    }
  };
  return (
    <Modal title={st.deleteAccount} onClose={onClose}>
      <form onSubmit={go} className="stack gap-16">
        <Alert kind="warn">{st.deleteAccountD}</Alert>
        {user.hasPassword && (
          <Field id="del-pw" label={t.auth.password} required>
            <input
              id="del-pw"
              type="password"
              className="input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        <label className="field">
          <span className="label">{st.deleteNote}</span>
          <textarea className="textarea" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <Alert kind="error">{err}</Alert>
        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn btn-danger">
            {st.deleteAccount}
          </button>
        </div>
      </form>
    </Modal>
  );
}
