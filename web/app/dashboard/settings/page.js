'use client';

import { useState } from 'react';
import { useApp } from '@/components/Providers';
import { api, setToken } from '@/lib/api';
import { options } from '@/lib/format';
import { Alert, Field, Modal } from '@/components/ui';

export default function Settings() {
  const { t, lang, user, setUser, logout } = useApp();
  const st = t.settings;
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState({});
  const [del, setDel] = useState(false);

  const say = (k, kind, text) => setMsg((m) => ({ ...m, [k]: { kind, text } }));

  async function saveProfile(e) {
    e.preventDefault();
    try { const d = await api('/auth/me', { method: 'PATCH', body: { name } }); setUser(d.user); say('profile', 'ok', t.common.saved); } catch (ex) { say('profile', 'error', ex.message); }
  }
  async function changePw(e) {
    e.preventDefault();
    try {
      const d = await api('/auth/change-password', { method: 'POST', body: pw });
      setToken(d.token);
      setPw({ current: '', next: '' });
      say('pw', 'ok', st.pwChanged);
    } catch (ex) { say('pw', 'error', ex.fields?.current || ex.fields?.next || ex.message); }
  }
  async function logoutAll() {
    try { await api('/auth/logout-all', { method: 'POST' }); } finally { logout(); }
  }

  return (
    <>
      <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>{st.title}</h1>

      <form onSubmit={saveProfile} className="card stack gap-16">
        <h2 className="h3">{st.profile}</h2>
        <div className="grid grid-2" style={{ gap: 16 }}>
          <Field id="nm" label={t.auth.name} required><input id="nm" className="input" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field id="em" label={user.email ? t.auth.email : t.auth.phone}><input id="em" className="input" value={user.email || user.phone || ''} disabled /></Field>
        </div>
        {msg.profile && <Alert kind={msg.profile.kind}>{msg.profile.text}</Alert>}
        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>{t.common.save}</button>
      </form>

      <form onSubmit={changePw} className="card stack gap-16">
        <h2 className="h3">{st.changePw}</h2>
        <div className="grid grid-2" style={{ gap: 16 }}>
          <Field id="cur" label={st.current} required><input id="cur" type="password" className="input" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field id="nw" label={st.newPw} required hint={t.auth.passwordHint}><input id="nw" type="password" className="input" autoComplete="new-password" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        </div>
        {msg.pw && <Alert kind={msg.pw.kind}>{msg.pw.text}</Alert>}
        <div className="row gap-8 wrap">
          <button type="submit" className="btn btn-primary">{t.common.save}</button>
          <button type="button" className="btn btn-outline" onClick={logoutAll}>{st.logoutAll}</button>
        </div>
      </form>

      <section className="card stack gap-12" style={{ borderColor: 'var(--danger)' }}>
        <h2 className="h3" style={{ color: 'var(--danger)' }}>{st.dangerT}</h2>
        <p className="muted">{st.dangerD}</p>
        {msg.del && <Alert kind={msg.del.kind}>{msg.del.text}</Alert>}
        <button type="button" className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={() => setDel(true)}>{st.deleteBtn}</button>
      </section>

      {del && <DeleteModal t={t} lang={lang} onClose={() => setDel(false)} onDone={(ok, text) => { setDel(false); say('del', ok ? 'ok' : 'error', text); }} />}
    </>
  );
}

function DeleteModal({ t, lang, onClose, onDone }) {
  const st = t.settings;
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const go = async () => {
    try { await api('/me/biodata/delete', { method: 'POST', body: { reason, note } }); onDone(true, st.deleted); } catch (e) { onDone(false, e.message); }
  };
  return (
    <Modal title={st.deleteBtn} onClose={onClose}>
      <fieldset className="stack gap-8" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label req" style={{ marginBottom: 8 }}>{st.deleteReason}</legend>
        {options('delete').map((o) => <label key={o.value} className="check"><input type="radio" name="del" checked={reason === o.value} onChange={() => setReason(o.value)} />{o[lang]}</label>)}
      </fieldset>
      <label className="field"><span className="label">{st.deleteNote}</span><textarea className="textarea" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t.common.cancel}</button>
        <button type="button" className="btn btn-danger" disabled={!reason} onClick={go}>{st.deleteBtn}</button>
      </div>
    </Modal>
  );
}
