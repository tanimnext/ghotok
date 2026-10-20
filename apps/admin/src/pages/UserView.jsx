import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp, useLoad, can } from '../lib/app.jsx';
import { api } from '../lib/api.js';
import { digits, taka, date, dateTime, label, statusLabel, statusOptions } from '@ghotok/shared';
import { Alert, Pill, Spinner, NoteModal } from '../components/ui.jsx';

export default function UserView() {
  const { id } = useParams();
  const { t, lang, user: me } = useApp();
  const a = t.users;
  const c = t.conn;
  const { data, error, loading, reload } = useLoad(`/admin/users/${id}`);
  const ledger = useLoad(`/admin/users/${id}/ledger`);
  const [adj, setAdj] = useState({ action: 'grant', amount: 1, reason: '' });
  const [msg, setMsg] = useState(null);
  const [suspend, setSuspend] = useState(false);

  const say = (kind, text) => setMsg({ kind, text });
  async function adjust(e) {
    e.preventDefault();
    try {
      await api(`/admin/users/${id}/connections`, { method: 'POST', body: adj });
      setAdj({ action: 'grant', amount: 1, reason: '' });
      say('ok', c.done);
      reload();
      ledger.reload();
    } catch (ex) {
      say('error', ex.message);
    }
  }
  async function setRole(role) {
    try {
      await api(`/admin/users/${id}/role`, { method: 'POST', body: { role } });
      say('ok', t.common.saved);
      reload();
    } catch (ex) {
      say('error', ex.message);
    }
  }
  async function setStatus(status, reason) {
    try {
      await api(`/admin/users/${id}/status`, { method: 'POST', body: { status, reason } });
      setSuspend(false);
      say('ok', t.common.saved);
      reload();
    } catch (ex) {
      say('error', ex.message);
    }
  }

  async function setVerified(kind, value) {
    try {
      await api(`/admin/users/${id}/verification`, { method: 'POST', body: { [kind]: value } });
      say('ok', t.common.saved);
      reload();
    } catch (ex) {
      say('error', ex.message);
    }
  }

  if (loading && !data) return <Spinner />;
  if (error) return <Alert kind="error">{error.message}</Alert>;
  const u = data.user;
  const self = String(me.id) === String(u._id);

  return (
    <>
      <Link to="/users" className="small muted">
        ← {a.title}
      </Link>
      <div className="row between wrap gap-16">
        <div className="stack gap-4">
          <h1 className="display" style={{ fontSize: 'clamp(30px, 3.6vw, 42px)' }}>
            {u.name}
          </h1>
          <span className="muted small">
            {u.email} {u.phone && `· ${u.phone}`} · {a.joined} {date(u.createdAt, lang)}
            {u.lastLoginAt ? ` · ${a.lastLogin} ${dateTime(u.lastLoginAt, lang)}` : ''}
          </span>
        </div>
        <div className="row gap-8 wrap">
          <Pill status={u.status}>{statusLabel('user', u.status, lang)}</Pill>
          <span className="pill pill-rose">{statusLabel('role', u.role, lang)}</span>
        </div>
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {u.suspendReason && u.status === 'suspended' && <Alert kind="warn">{u.suspendReason}</Alert>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <div className="stack gap-20" style={{ flex: '1 1 560px', minWidth: 0 }}>
          <section className="panel row wrap between gap-16" style={{ padding: 26 }}>
            <div className="stack gap-4">
              <span style={{ color: 'var(--panel-muted)' }}>{a.balance}</span>
              <span className="display" style={{ fontSize: 64, lineHeight: 1 }}>
                {digits(u.connections, lang)}
              </span>
            </div>
            <div className="stack gap-4" style={{ color: 'var(--panel-muted)' }}>
              <span>
                {t.bio.unlocks}: <b style={{ color: 'var(--on-panel)' }}>{digits(data.counts.unlocks, lang)}</b>
              </span>
              {data.biodata && (
                <Link to={`/biodatas/${data.biodata._id}`} style={{ color: 'var(--panel-gold)' }}>
                  {data.biodata.biodataNo ? `GH-${data.biodata.biodataNo}` : '—'} ·{' '}
                  {statusLabel('biodata', data.biodata.status, lang)}
                  {data.biodata.deletedAt ? ' · deleted' : ''} →
                </Link>
              )}
            </div>
          </section>

          {can(me, 'admin') && (
            <form onSubmit={adjust} className="card stack gap-16">
              <h2 className="h3">{c.title}</h2>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <label className="field">
                  <span className="label">{c.action}</span>
                  <select
                    className="select"
                    value={adj.action}
                    onChange={(e) => setAdj({ ...adj, action: e.target.value })}
                  >
                    <option value="grant">{c.grant}</option>
                    <option value="revoke">{c.revoke}</option>
                    <option value="refund">{c.refund}</option>
                  </select>
                </label>
                <label className="field">
                  <span className="label">{c.amount}</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="input"
                    value={adj.amount}
                    onChange={(e) => setAdj({ ...adj, amount: Number(e.target.value) })}
                  />
                </label>
              </div>
              <label className="field">
                <span className="label req">{c.reason}</span>
                <textarea
                  className="textarea"
                  required
                  minLength={3}
                  maxLength={300}
                  value={adj.reason}
                  onChange={(e) => setAdj({ ...adj, reason: e.target.value })}
                />
              </label>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                {c.apply}
              </button>
            </form>
          )}

          <section className="card stack gap-8">
            <h2 className="h3">{c.ledger}</h2>
            {!ledger.data?.items.length ? (
              <p className="muted">{t.common.none}</p>
            ) : (
              ledger.data.items.map((l) => (
                <div key={l._id} className="list-row">
                  <span className="stack">
                    <b className="small">{statusLabel('ledger', l.type, lang)}</b>
                    <span className="tiny muted">
                      {dateTime(l.createdAt, lang)}
                      {l.note ? ` · ${l.note}` : ''}
                      {l.actor ? ` · ${l.actor.name}` : ''}
                    </span>
                  </span>
                  <span style={{ fontWeight: 800, color: l.delta > 0 ? 'var(--sage)' : 'var(--rose-text)' }}>
                    {l.delta > 0 ? '+' : '−'}
                    {digits(Math.abs(l.delta), lang)} → {digits(l.balanceAfter, lang)}
                  </span>
                </div>
              ))
            )}
          </section>

          <section className="card stack gap-8">
            <h2 className="h3">{t.nav.payments}</h2>
            {!data.payments.length ? (
              <p className="muted">{t.common.none}</p>
            ) : (
              data.payments.map((p) => (
                <div key={p._id} className="list-row">
                  <span className="stack">
                    <b className="small">
                      {label('method', p.method, lang)} · {p.trxId || '—'}
                    </b>
                    <span className="tiny muted">{dateTime(p.createdAt, lang)}</span>
                  </span>
                  <span className="row gap-8">
                    <b>{taka(p.amount, lang)}</b>
                    <Pill status={p.status}>{statusLabel('payment', p.status, lang)}</Pill>
                  </span>
                </div>
              ))
            )}
          </section>
        </div>

        <aside className="stack gap-16" style={{ flex: '0 1 320px', minWidth: 280 }}>
          {can(me, 'superadmin') && !self && (
            <section className="card stack gap-12">
              <h2 className="h3">{a.setRole}</h2>
              <select
                className="select"
                value={u.role}
                onChange={(e) => setRole(e.target.value)}
                aria-label={a.setRole}
              >
                {statusOptions('role', lang).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </section>
          )}
          {can(me, 'admin') && (
            <section className="card stack gap-12">
              <h2 className="h3">{a.verification}</h2>
              {[
                ['phone', a.phoneVerified, u.phoneVerified, u.phone],
                ['email', a.emailVerified, u.emailVerified, u.email],
              ].map(([k, l, on, value]) => (
                <label key={k} className="check">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!value}
                    onChange={(e) => setVerified(k, e.target.checked)}
                  />
                  <span>
                    {l}
                    {value ? ` · ${value}` : ''}
                  </span>
                </label>
              ))}
            </section>
          )}
          {can(me, 'admin') && !self && (
            <section className="card stack gap-12">
              <h2 className="h3">{a.status}</h2>
              {u.status === 'active' ? (
                <button type="button" className="btn btn-danger" onClick={() => setSuspend(true)}>
                  {a.suspend}
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setStatus('active')}>
                  {a.activate}
                </button>
              )}
            </section>
          )}
        </aside>
      </div>
      {suspend && (
        <NoteModal
          title={a.suspend}
          label={a.suspendReason}
          required
          danger
          onClose={() => setSuspend(false)}
          onSubmit={(fd) => setStatus('suspended', fd.get('note'))}
        />
      )}
    </>
  );
}
