import NextLink from 'next/link';
import { getPrefs, apiGet } from '@/lib/server';
import { num, digits, height, HEIGHTS, options } from '@/lib/format';
import { DIVISIONS } from '@/lib/constants';
import BiodataCard from '@/components/BiodataCard';

export async function generateMetadata({ searchParams }) {
  const { lang } = await getPrefs();
  const sp = await searchParams;
  const bn = lang === 'bn';
  const who = sp.type === 'groom' ? (bn ? 'পাত্র' : 'grooms') : sp.type === 'bride' ? (bn ? 'পাত্রী' : 'brides') : (bn ? 'পাত্র-পাত্রী' : 'brides and grooms');
  return {
    title: bn ? `${who}র বায়োডাটা খুঁজুন` : `Find ${who} — biodata search`,
    description: bn ? 'বয়স, ধর্ম, জেলা, শিক্ষা ও পেশা অনুযায়ী যাচাইকৃত বায়োডাটা খুঁজুন।' : 'Search verified biodatas by age, religion, district, education and profession.',
    alternates: { canonical: '/biodatas' },
  };
}

function toQuery(sp) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined || v === '') continue;
    q.set(k, Array.isArray(v) ? v.filter(Boolean).join(',') : v);
  }
  return q;
}

function Select({ name, label, value, list, lang, anyLabel }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <select name={name} defaultValue={value || ''} className="select">
        <option value="">{anyLabel}</option>
        {list.map((o) => <option key={o.value} value={o.value}>{o[lang]}</option>)}
      </select>
    </label>
  );
}

function Checks({ name, label, values, list, lang }) {
  const set = new Set([].concat(values || []).flatMap((v) => String(v).split(',')));
  return (
    <fieldset className="stack gap-8" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="label" style={{ marginBottom: 8 }}>{label}</legend>
      <div className="choice-grid">
        {list.map((o) => (
          <label key={o.value} className="choice"><input type="checkbox" name={name} value={o.value} defaultChecked={set.has(o.value)} />{o[lang]}</label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function BiodatasPage({ searchParams }) {
  const { lang, t } = await getPrefs();
  const sp = await searchParams;
  const s = t.search;
  const q = toQuery(sp);
  const data = await apiGet(`/biodatas?${q.toString()}`, { revalidate: 30 });
  const page = data?.page || 1;
  const pageHref = (p) => { const n = new URLSearchParams(q); n.set('page', p); return `/biodatas?${n.toString()}`; };
  const districts = options('district').slice().sort((a, b) => a[lang].localeCompare(b[lang]));

  return (
    <>
      <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="container stack gap-8" style={{ padding: '36px 28px' }}>
          <span className="small muted"><NextLink href="/">{t.nav.home}</NextLink> / {s.title}</span>
          <h1 className="h2">{s.title}</h1>
          <p className="muted">{s.sub}</p>
        </div>
      </div>

      <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start', padding: '32px 28px 0' }}>
        <form method="get" action="/biodatas" className="card stack gap-20" style={{ flex: '0 0 300px', maxWidth: '100%' }} aria-label={s.filters}>
          <div className="row between"><b style={{ fontSize: 18 }}>{s.filters}</b><NextLink href="/biodatas" className="small" style={{ color: 'var(--rose-text)', fontWeight: 700 }}>{t.common.clear}</NextLink></div>
          <fieldset className="stack gap-8" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label" style={{ marginBottom: 8 }}>{s.type}</legend>
            <div className="choice-grid">
              {[['', t.common.all], ['bride', t.common.bride], ['groom', t.common.groom]].map(([v, l]) => (
                <label key={v} className="choice"><input type="radio" name="type" value={v} defaultChecked={(sp.type || '') === v} />{l}</label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span className="label">{s.biodataNo}</span>
            <input name="q" defaultValue={sp.q || ''} placeholder={s.biodataNoPh} className="input" />
          </label>
          <Checks name="religion" label={s.religion} values={sp.religion} list={options('religion')} lang={lang} />
          <Checks name="marital" label={s.marital} values={sp.marital} list={options('marital')} lang={lang} />
          <div className="grid grid-2" style={{ gap: 10 }}>
            <label className="field"><span className="label">{s.ageFrom}</span><input type="number" name="ageMin" min="18" max="80" defaultValue={sp.ageMin || ''} className="input" /></label>
            <label className="field"><span className="label">{s.ageTo}</span><input type="number" name="ageMax" min="18" max="80" defaultValue={sp.ageMax || ''} className="input" /></label>
          </div>
          <div className="grid grid-2" style={{ gap: 10 }}>
            {[['heightMin', s.heightFrom], ['heightMax', s.heightTo]].map(([n, l]) => (
              <label key={n} className="field"><span className="label">{l}</span>
                <select name={n} defaultValue={sp[n] || ''} className="select"><option value="">{t.common.any}</option>{HEIGHTS.map((h) => <option key={h} value={h}>{height(h, lang)}</option>)}</select>
              </label>
            ))}
          </div>
          <Select name="division" label={s.division} value={sp.division} list={DIVISIONS} lang={lang} anyLabel={t.common.any} />
          <Select name="district" label={s.district} value={sp.district} list={districts} lang={lang} anyLabel={t.common.any} />
          <Select name="education" label={s.education} value={sp.education} list={options('education')} lang={lang} anyLabel={t.common.any} />
          <Select name="occupation" label={s.occupation} value={sp.occupation} list={options('occupation')} lang={lang} anyLabel={t.common.any} />
          <details>
            <summary className="small" style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--rose-text)' }}>{s.moreFilters}</summary>
            <div className="stack gap-20" style={{ paddingTop: 16 }}>
              <Checks name="complexion" label={s.complexion} values={sp.complexion} list={options('complexion')} lang={lang} />
              <Checks name="economic" label={s.economic} values={sp.economic} list={options('economic')} lang={lang} />
              <label className="check"><input type="checkbox" name="verified" value="1" defaultChecked={sp.verified === '1'} />{s.verifiedOnly}</label>
            </div>
          </details>
          <label className="field">
            <span className="label">{s.sort}</span>
            <select name="sort" defaultValue={sp.sort || 'newest'} className="select">
              <option value="newest">{s.sortNewest}</option><option value="age_asc">{s.sortAgeAsc}</option><option value="age_desc">{s.sortAgeDesc}</option>
            </select>
          </label>
          <button type="submit" className="btn btn-primary btn-block">{s.showResults}</button>
        </form>

        <div className="stack gap-20" style={{ flex: '1 1 600px', minWidth: 0 }}>
          <p className="muted"><b style={{ color: 'var(--ink)' }}>{num(data?.total || 0, lang)}</b> {s.results}</p>
          {data?.items?.length ? (
            <div className="grid grid-auto-250">{data.items.map((b) => <BiodataCard key={b._id} b={b} t={t} lang={lang} />)}</div>
          ) : (
            <p className="card empty">{data ? s.noResults : t.common.error}</p>
          )}
          {data && data.pages > 1 && (
            <nav aria-label="Pagination" className="row gap-8 wrap" style={{ justifyContent: 'center', paddingTop: 12 }}>
              {page > 1 && <NextLink className="btn btn-outline btn-sm" href={pageHref(page - 1)}>{t.common.prev}</NextLink>}
              <span className="small muted" style={{ padding: '0 10px' }}>{t.common.page} {digits(page, lang)} {t.common.of} {digits(data.pages, lang)}</span>
              {page < data.pages && <NextLink className="btn btn-outline btn-sm" href={pageHref(page + 1)}>{t.common.next}</NextLink>}
            </nav>
          )}
        </div>
      </div>
    </>
  );
}

