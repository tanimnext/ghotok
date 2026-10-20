import NextLink from 'next/link';
import { num, height, HEIGHTS, options, label } from '@ghotok/shared';
import { getPrefs, apiGet } from '@/lib/server';
import BiodataCard from '@/components/BiodataCard';
import LocationFilter from '@/components/search/LocationFilter';
import { Pager } from '@/components/ui';

const FILTER_KEYS = [
  'type',
  'q',
  'religion',
  'marital',
  'ageMin',
  'ageMax',
  'heightMin',
  'heightMax',
  'division',
  'district',
  'upazila',
  'presentDivision',
  'presentDistrict',
  'presentUpazila',
  'country',
  'education',
  'medium',
  'occupation',
  'complexion',
  'economic',
  'category',
  'verified',
  'sort',
];

export async function generateMetadata({ searchParams }) {
  const { lang } = await getPrefs();
  const sp = await searchParams;
  const bn = lang === 'bn';
  const who =
    sp.type === 'groom'
      ? bn
        ? 'পাত্র'
        : 'grooms'
      : sp.type === 'bride'
        ? bn
          ? 'পাত্রী'
          : 'brides'
        : bn
          ? 'পাত্র-পাত্রী'
          : 'brides and grooms';
  const where = sp.district ? ` ${bn ? '' : 'in '}${label('district', sp.district, lang)}` : '';
  const faith = sp.religion && !String(sp.religion).includes(',') ? `${label('religion', sp.religion, lang)} ` : '';
  return {
    title: bn ? `${where.trim()} ${faith}${who}র বায়োডাটা`.trim() : `${faith}${who}${where} — biodata search`,
    description: bn
      ? 'বয়স, ধর্ম, জেলা, উপজেলা, শিক্ষা ও পেশা অনুযায়ী যাচাইকৃত বায়োডাটা খুঁজুন।'
      : 'Search verified biodatas by age, religion, district, upazila, education and profession.',
    alternates: { canonical: '/biodatas' },
  };
}

function toQuery(sp) {
  const q = new URLSearchParams();
  for (const k of [...FILTER_KEYS, 'page']) {
    const v = sp[k];
    if (v === undefined || v === '') continue;
    q.set(k, Array.isArray(v) ? v.filter(Boolean).join(',') : v);
  }
  return q;
}

function Select({ name, label: text, value, list, lang, anyLabel }) {
  return (
    <label className="field">
      <span className="label">{text}</span>
      <select name={name} defaultValue={value || ''} className="select">
        <option value="">{anyLabel}</option>
        {list.map((o) => (
          <option key={o.value} value={o.value}>
            {o[lang]}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checks({ name, label: text, values, list, lang }) {
  const set = new Set([].concat(values || []).flatMap((v) => String(v).split(',')));
  return (
    <fieldset className="field">
      <legend className="label">{text}</legend>
      <div className="choice-grid">
        {list.map((o) => (
          <label key={o.value} className="choice">
            <input type="checkbox" name={name} value={o.value} defaultChecked={set.has(o.value)} />
            {o[lang]}
          </label>
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
  const data = await apiGet(`/biodatas?${q}`, { revalidate: 30 });
  const pageHref = (p) => {
    const n = new URLSearchParams(q);
    n.set('page', p);
    return `/biodatas?${n}`;
  };
  // Location counts reflect every other filter.
  const base = new URLSearchParams(q);
  for (const k of [
    'division',
    'district',
    'upazila',
    'presentDivision',
    'presentDistrict',
    'presentUpazila',
    'country',
    'page',
    'sort',
  ])
    base.delete(k);
  const active = FILTER_KEYS.filter((k) => k !== 'sort' && sp[k]).length;

  return (
    <>
      <div className="page-head">
        <div className="container stack gap-8">
          <span className="small muted">
            <NextLink href="/">{t.nav.home}</NextLink> / {s.title}
          </span>
          <h1 className="h2">{s.title}</h1>
          <p className="muted">{s.sub}</p>
        </div>
      </div>

      <div className="container search-layout">
        <details className="filters-toggle" open>
          <summary className="btn btn-outline btn-block">
            {s.filters}
            {active ? ` (${num(active, lang)})` : ''}
          </summary>
          <form method="get" action="/biodatas" className="card stack gap-20 filters" aria-label={s.filters}>
            <div className="row between">
              <b style={{ fontSize: 18 }}>{s.filters}</b>
              <NextLink href="/biodatas" className="small link-plain">
                {t.common.clear}
              </NextLink>
            </div>
            <fieldset className="field">
              <legend className="label">{s.type}</legend>
              <div className="choice-grid">
                {[
                  ['', t.common.all],
                  ['bride', t.common.bride],
                  ['groom', t.common.groom],
                ].map(([v, l]) => (
                  <label key={v} className="choice">
                    <input type="radio" name="type" value={v} defaultChecked={(sp.type || '') === v} />
                    {l}
                  </label>
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
              <label className="field">
                <span className="label">{s.ageFrom}</span>
                <input type="number" name="ageMin" min="18" max="80" defaultValue={sp.ageMin || ''} className="input" />
              </label>
              <label className="field">
                <span className="label">{s.ageTo}</span>
                <input type="number" name="ageMax" min="18" max="80" defaultValue={sp.ageMax || ''} className="input" />
              </label>
            </div>
            <div className="grid grid-2" style={{ gap: 10 }}>
              {[
                ['heightMin', s.heightFrom],
                ['heightMax', s.heightTo],
              ].map(([n, l]) => (
                <label key={n} className="field">
                  <span className="label">{l}</span>
                  <select name={n} defaultValue={sp[n] || ''} className="select">
                    <option value="">{t.common.any}</option>
                    {HEIGHTS.map((h) => (
                      <option key={h} value={h}>
                        {height(h, lang)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <fieldset className="field">
              <legend className="label">{s.permanentAddress}</legend>
              <LocationFilter which="permanent" initial={sp} baseQuery={base.toString()} lang={lang} t={t} />
            </fieldset>
            <Select
              name="education"
              label={s.education}
              value={sp.education}
              list={options('education')}
              lang={lang}
              anyLabel={t.common.any}
            />
            <Select
              name="occupation"
              label={s.occupation}
              value={sp.occupation}
              list={options('occupation')}
              lang={lang}
              anyLabel={t.common.any}
            />
            <details
              open={Boolean(
                sp.medium ||
                  sp.complexion ||
                  sp.economic ||
                  sp.category ||
                  sp.presentDistrict ||
                  sp.country ||
                  sp.verified
              )}
            >
              <summary className="small link-plain" style={{ cursor: 'pointer' }}>
                {s.moreFilters}
              </summary>
              <div className="stack gap-20" style={{ paddingTop: 16 }}>
                <fieldset className="field">
                  <legend className="label">{s.presentAddress}</legend>
                  <LocationFilter which="present" initial={sp} baseQuery={base.toString()} lang={lang} t={t} />
                </fieldset>
                <Select
                  name="medium"
                  label={s.medium}
                  value={sp.medium}
                  list={options('medium')}
                  lang={lang}
                  anyLabel={t.common.any}
                />
                <Checks
                  name="complexion"
                  label={s.complexion}
                  values={sp.complexion}
                  list={options('complexion')}
                  lang={lang}
                />
                <Checks
                  name="economic"
                  label={s.economic}
                  values={sp.economic}
                  list={options('economic')}
                  lang={lang}
                />
                <Checks
                  name="category"
                  label={s.category}
                  values={sp.category}
                  list={options('category')}
                  lang={lang}
                />
                <label className="check">
                  <input type="checkbox" name="verified" value="1" defaultChecked={sp.verified === '1'} />
                  {s.verifiedOnly}
                </label>
              </div>
            </details>
            <label className="field">
              <span className="label">{s.sort}</span>
              <select name="sort" defaultValue={sp.sort || 'newest'} className="select">
                <option value="newest">{s.sortNewest}</option>
                <option value="age_asc">{s.sortAgeAsc}</option>
                <option value="age_desc">{s.sortAgeDesc}</option>
              </select>
            </label>
            <button type="submit" className="btn btn-primary btn-block">
              {s.showResults}
            </button>
          </form>
        </details>

        <div className="stack gap-20 results">
          <p className="muted" aria-live="polite">
            <b style={{ color: 'var(--ink)' }}>{num(data?.total || 0, lang)}</b> {s.results}
          </p>
          {data?.items?.length ? (
            <div className="grid grid-auto-250">
              {data.items.map((b) => (
                <BiodataCard key={b._id} b={b} t={t} lang={lang} />
              ))}
            </div>
          ) : (
            <p className="card empty">{data ? s.noResults : t.common.error}</p>
          )}
          {data && <Pager page={data.page} pages={data.pages} lang={lang} href={pageHref} LinkComponent={NextLink} />}
        </div>
      </div>
    </>
  );
}
