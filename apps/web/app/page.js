import NextLink from 'next/link';
import { getPrefs, apiGet } from '@/lib/server';
import { num, digits, taka } from '@ghotok/shared';
import { RELIGIONS, DISTRICTS } from '@ghotok/shared';
import BiodataCard from '@/components/BiodataCard';
import { Rings, Shield, Heart, Check } from '@/components/Icons';

export default async function Home() {
  const { lang, t } = await getPrefs();
  const h = t.home;
  const [stats, recent, pkgs] = await Promise.all([
    apiGet('/biodatas/stats'),
    apiGet('/biodatas/recent?limit=4'),
    apiGet('/packages', { revalidate: 300 }),
  ]);
  const statItems = [
    [stats?.total, h.stats.total],
    [stats?.grooms, h.stats.grooms],
    [stats?.brides, h.stats.brides],
    [stats?.marriages, h.stats.marriages],
  ];
  const otherLang = lang === 'bn' ? 'en' : 'bn';

  return (
    <>
      {/* Hero */}
      <section
        className="container"
        style={{ padding: '64px 28px 40px', display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'center' }}
      >
        <div className="stack gap-24" style={{ flex: '1 1 520px', minWidth: 0 }}>
          <span className="eyebrow">{h.eyebrow}</span>
          <h1 className="h1">
            {h.heroA} <em className="accent">{h.heroB}</em>
          </h1>
          <p className="lead" style={{ maxWidth: 540 }}>
            {h.sub}
          </p>
          <div className="row wrap gap-12">
            <NextLink href="/register" className="btn btn-primary btn-lg">
              {t.nav.create}
            </NextLink>
            <NextLink href="/biodatas" className="btn btn-outline btn-lg">
              {h.cta2}
            </NextLink>
          </div>
          <ul
            className="row wrap"
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              gap: '10px 26px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--muted)',
            }}
          >
            {h.trust.map((x) => (
              <li key={x} className="row gap-8">
                <span className="gold">
                  <Check size={18} />
                </span>
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 440, height: 540 }}>
            <div className="arch" style={{ position: 'absolute', inset: 0, borderWidth: 1.5 }} />
            <div
              style={{
                position: 'absolute',
                inset: 18,
                borderRadius: '999px 999px 14px 14px',
                border: '1px dashed var(--gold)',
                opacity: 0.7,
              }}
            />
            <svg
              viewBox="0 0 300 300"
              style={{
                position: 'absolute',
                left: '50%',
                top: 130,
                width: 280,
                height: 280,
                transform: 'translateX(-50%)',
              }}
              fill="none"
              aria-hidden="true"
            >
              <circle cx="112" cy="150" r="72" style={{ stroke: 'var(--gold)', strokeWidth: 5 }} />
              <circle cx="188" cy="150" r="72" style={{ stroke: 'var(--rose)', strokeWidth: 5 }} />
              <path d="M150 62l9 12-9 12-9-12z" style={{ fill: 'var(--gold)' }} />
              <path d="M44 52q0 10 10 10q-10 0-10 10q0-10-10-10q10 0 10-10z" style={{ fill: 'var(--gold)' }} />
              <path d="M262 236q0 8 8 8q-8 0-8 8q0-8-8-8q8 0 8-8z" style={{ fill: 'var(--rose)' }} />
            </svg>
            <div
              className="card row gap-12"
              style={{
                position: 'absolute',
                left: -12,
                bottom: 56,
                padding: '14px 18px',
                borderRadius: 20,
                boxShadow: 'var(--shadow)',
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--sage-bg)',
                  color: 'var(--sage)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Shield size={22} />
              </span>
              <span className="stack">
                <b className="small">{t.common.verified}</b>
                <span className="tiny muted">{h.trust[0]}</span>
              </span>
            </div>
            <div
              className="card row gap-12"
              style={{
                position: 'absolute',
                right: -10,
                top: 84,
                padding: '14px 18px',
                borderRadius: 20,
                boxShadow: 'var(--shadow)',
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--surface2)',
                  color: 'var(--rose-text)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Heart size={22} />
              </span>
              <span className="stack">
                <b className="small">{t.bio.sendProposal}</b>
                <span className="tiny muted">{h.trust[1]}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick search (works without JavaScript) */}
      <section className="container">
        <form
          action="/biodatas"
          method="get"
          className="card"
          style={{
            padding: 14,
            borderRadius: 32,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
            boxShadow: 'var(--shadow)',
          }}
        >
          <label className="field" style={{ background: 'var(--bg)', borderRadius: 20, padding: '12px 18px' }}>
            <span className="label">{h.lookingFor}</span>
            <select
              name="type"
              className="select"
              style={{ border: 0, background: 'transparent', padding: 0, minHeight: 34, fontWeight: 600 }}
            >
              <option value="bride">{t.common.bride}</option>
              <option value="groom">{t.common.groom}</option>
            </select>
          </label>
          <label className="field" style={{ background: 'var(--bg)', borderRadius: 20, padding: '12px 18px' }}>
            <span className="label">{h.religion}</span>
            <select
              name="religion"
              className="select"
              style={{ border: 0, background: 'transparent', padding: 0, minHeight: 34, fontWeight: 600 }}
            >
              <option value="">{t.common.all}</option>
              {RELIGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r[lang]}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ background: 'var(--bg)', borderRadius: 20, padding: '12px 18px' }}>
            <span className="label">{h.age}</span>
            <span className="row gap-8">
              <input
                name="ageMin"
                type="number"
                min="18"
                max="80"
                placeholder={digits(20, lang)}
                aria-label={t.search.ageFrom}
                className="input"
                style={{ border: 0, background: 'transparent', padding: 0, minHeight: 34, fontWeight: 600 }}
              />
              <span className="muted">–</span>
              <input
                name="ageMax"
                type="number"
                min="18"
                max="80"
                placeholder={digits(35, lang)}
                aria-label={t.search.ageTo}
                className="input"
                style={{ border: 0, background: 'transparent', padding: 0, minHeight: 34, fontWeight: 600 }}
              />
            </span>
          </label>
          <label className="field" style={{ background: 'var(--bg)', borderRadius: 20, padding: '12px 18px' }}>
            <span className="label">{h.district}</span>
            <select
              name="district"
              className="select"
              style={{ border: 0, background: 'transparent', padding: 0, minHeight: 34, fontWeight: 600 }}
            >
              <option value="">{h.anyDistrict}</option>
              {[...DISTRICTS]
                .sort((a, b) => a[lang].localeCompare(b[lang]))
                .map((d) => (
                  <option key={d.value} value={d.value}>
                    {d[lang]}
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary" style={{ borderRadius: 20, minHeight: 70, fontSize: 17 }}>
            {t.common.search}
          </button>
        </form>
      </section>

      {/* Faiths */}
      <section className="container section" style={{ textAlign: 'center' }}>
        <div className="row gap-16" style={{ maxWidth: 700, margin: '0 auto 30px' }}>
          <span style={{ flex: 1, height: 1, background: 'var(--gold)' }} />
          <span className="display accent" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>
            {h.faithsTitle}
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--gold)' }} />
        </div>
        <div className="row wrap gap-12" style={{ justifyContent: 'center' }}>
          {RELIGIONS.filter((r) => r.value !== 'other').map((r) => (
            <NextLink key={r.value} href={`/biodatas?religion=${r.value}`} className="chip">
              <span className="display" style={{ fontSize: 24, fontWeight: 600 }}>
                {r[lang]}
              </span>
              <span className="small muted">{r[otherLang]}</span>
            </NextLink>
          ))}
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="container" style={{ paddingTop: 48 }}>
          <div className="grid grid-auto-200" style={{ textAlign: 'center' }}>
            {statItems.map(([v, l]) => (
              <div key={l} className="stack gap-4">
                <span className="display" style={{ fontSize: 52, color: 'var(--rose-text)' }}>
                  {num(v, lang)}
                </span>
                <span
                  className="small muted"
                  style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  {l}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how" className="container section">
        <div className="stack gap-12" style={{ maxWidth: 700, marginBottom: 52 }}>
          <span className="eyebrow">{h.howK}</span>
          <h2 className="h2">{h.howT}</h2>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0 }}>
          {h.steps.map(([title, d], i) => (
            <div
              key={title}
              className="stack gap-12"
              style={{ borderTop: '1.5px solid var(--gold)', padding: '20px 28px 20px 0' }}
            >
              <span className="display gold" style={{ fontSize: 56, lineHeight: 1 }}>
                {digits(`0${i + 1}`, lang)}
              </span>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>{title}</h3>
              <p className="muted" style={{ lineHeight: 1.7 }}>
                {d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Recently approved */}
      <section className="container section">
        <div className="row between wrap gap-20" style={{ alignItems: 'flex-end', marginBottom: 44 }}>
          <div className="stack gap-12">
            <span className="eyebrow">{h.featK}</span>
            <h2 className="h2">{h.featT}</h2>
          </div>
          <NextLink href="/biodatas" className="link">
            {t.common.viewAll} →
          </NextLink>
        </div>
        {recent?.items?.length ? (
          <div className="grid grid-auto-250">
            {recent.items.map((b) => (
              <BiodataCard key={b._id} b={b} t={t} lang={lang} />
            ))}
          </div>
        ) : (
          <p className="empty card">{h.noRecent}</p>
        )}
      </section>

      {/* Safety */}
      <section id="safety" className="container section">
        <div className="panel stack gap-32" style={{ padding: 'clamp(36px, 6vw, 72px) clamp(24px, 5vw, 56px)' }}>
          <div className="stack gap-12" style={{ maxWidth: 720 }}>
            <span className="eyebrow" style={{ color: 'var(--panel-gold)' }}>
              {h.safeK}
            </span>
            <h2 className="h2">{h.safeT}</h2>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 36 }}>
            {h.safe.map(([title, d]) => (
              <div
                key={title}
                className="stack gap-12"
                style={{ borderTop: '1px solid var(--panel-line)', paddingTop: 24 }}
              >
                <h3 className="h3">{title}</h3>
                <p style={{ color: 'var(--panel-muted)', lineHeight: 1.75 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        className="container section"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 56, alignItems: 'center' }}
      >
        <div className="stack gap-16" style={{ flex: '1 1 400px', minWidth: 0 }}>
          <span className="eyebrow">{h.priceK}</span>
          <h2 className="h2">{h.priceT}</h2>
          <p className="lead">{h.priceD}</p>
          <div className="row wrap gap-8">
            {['bKash', 'Nagad', 'Rocket'].map((m) => (
              <span key={m} className="pill pill-line" style={{ fontSize: 14, padding: '8px 18px' }}>
                {m}
              </span>
            ))}
          </div>
        </div>
        <div
          className="grid"
          style={{
            flex: '1 1 440px',
            minWidth: 0,
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 22,
          }}
        >
          {(pkgs?.items || []).map((p) => (
            <div
              key={p._id}
              className="card stack gap-8"
              style={{
                borderRadius: 32,
                padding: '32px 28px',
                ...(p.highlight ? { border: '2px solid var(--gold)' } : {}),
              }}
            >
              <span
                className="small"
                style={{
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: p.highlight ? 'var(--rose-text)' : 'var(--muted)',
                }}
              >
                {p.name[lang]}
              </span>
              <span className="display" style={{ fontSize: 60 }}>
                {taka(p.price, lang)}
              </span>
              <b>
                {digits(p.connections, lang)} {t.common.connections}
              </b>
              <span className="small muted">
                {taka(Math.round(p.price / p.connections), lang)} {t.pkg.per}
              </span>
              <NextLink
                href={`/packages?package=${p._id}`}
                className={`btn ${p.highlight ? 'btn-primary' : 'btn-outline'}`}
                style={{ marginTop: 12 }}
              >
                {t.pkg.choosePlan}
              </NextLink>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container section">
        <div
          className="blush stack gap-16"
          style={{
            borderRadius: '999px 999px 40px 40px',
            padding: 'clamp(64px, 9vw, 96px) 28px 64px',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Rings size={64} stroke={2} />
          <h2 className="h2" style={{ maxWidth: 760 }}>
            {h.ctaT}
          </h2>
          <p className="lead">{h.ctaD}</p>
          <NextLink href="/register" className="btn btn-primary btn-lg">
            {t.nav.create}
          </NextLink>
        </div>
      </section>
    </>
  );
}
