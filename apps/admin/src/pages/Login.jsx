import { useState } from 'react';
import { useApp, can } from '../lib/app.jsx';
import { api, setToken } from '../lib/api.js';
import { Alert } from '../components/ui.jsx';
import { Toggles } from '../components/Layout.jsx';

export default function Login() {
  const { t, setUser } = useApp();
  const [identifier, setId] = useState('');
  const [password, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const d = await api('/auth/login', { method: 'POST', body: { identifier, password } });
      if (!can(d.user, 'support')) { setErr(t.a.login.notStaff); return; }
      setToken(d.token);
      setUser(d.user);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form onSubmit={submit} className="card stack gap-16" style={{ width: '100%', maxWidth: 440, borderRadius: 32, padding: 36 }}>
        <div className="row between"><span className="eyebrow">Ghotok</span><Toggles /></div>
        <h1 className="display" style={{ fontSize: 34 }}>{t.a.login.title}</h1>
        <p className="muted">{t.a.login.sub}</p>
        <label className="field"><span className="label">{t.auth.identifier}</span><input className="input" autoComplete="username" required value={identifier} onChange={(e) => setId(e.target.value)} /></label>
        <label className="field"><span className="label">{t.auth.password}</span><input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPw(e.target.value)} /></label>
        <Alert kind="error">{err}</Alert>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{t.nav.login}</button>
      </form>
    </div>
  );
}
