'use client';
/**
 * Cascading location filter for the search form: division → district → upazila
 * (permanent address) or country → division → district (present address).
 * Shows how many biodatas each option has, given the other filters.
 * Plain <select name=…> elements, so the GET form still works without JavaScript.
 */
import { useEffect, useMemo, useState } from 'react';
import { label, options, districtsOf, upazilasOf, digits } from '@ghotok/shared';
import { api } from '@/lib/api';

const PARAMS = {
  permanent: ['division', 'district', 'upazila'],
  present: ['presentDivision', 'presentDistrict', 'presentUpazila'],
};

const sortByLabel = (list, lang) => [...list].sort((a, b) => a[lang].localeCompare(b[lang], lang));

function useCounts(level, which, parent, baseQuery, enabled) {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const ctrl = new AbortController();
    const q = new URLSearchParams(baseQuery);
    q.set('level', level);
    q.set('which', which);
    if (parent) q.set('parent', parent);
    api(`/biodatas/location-counts?${q}`, { signal: ctrl.signal })
      .then((d) => setCounts(d.counts))
      .catch(() => {});
    return () => ctrl.abort();
  }, [level, which, parent, baseQuery, enabled]);
  return counts;
}

function CountedSelect({ name, value, onChange, list, counts, lang, anyLabel, labelText, disabled }) {
  return (
    <label className="field">
      <span className="label">{labelText}</span>
      <select
        name={value ? name : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select"
        disabled={disabled}
      >
        <option value="">{anyLabel}</option>
        {list.map((o) => (
          <option key={o.value} value={o.value}>
            {o[lang]}
            {counts ? ` (${digits(counts[o.value] || 0, lang)})` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function LocationFilter({ which = 'permanent', initial = {}, baseQuery = '', lang, t }) {
  const [a, b, c] = PARAMS[which];
  const [division, setDivision] = useState(initial[a] || '');
  const [district, setDistrict] = useState(initial[b] || '');
  const [upazila, setUpazila] = useState(initial[c] || '');
  const [country, setCountry] = useState(initial.country || '');

  const abroad = which === 'present' && country && country !== 'bangladesh';
  const divCounts = useCounts('division', which, null, baseQuery, !abroad);
  const distCounts = useCounts('district', which, division, baseQuery, !abroad);
  const upaCounts = useCounts('upazila', which, district, baseQuery, Boolean(district) && !abroad);
  const countryCounts = useCounts('country', 'present', null, baseQuery, which === 'present');

  const divisions = useMemo(() => sortByLabel(options('division'), lang), [lang]);
  const districts = useMemo(
    () => sortByLabel(division ? districtsOf(division) : options('district'), lang),
    [division, lang]
  );
  const upazilas = useMemo(() => sortByLabel(district ? upazilasOf(district) : [], lang), [district, lang]);
  const countries = useMemo(() => options('country'), []);

  return (
    <div className="stack gap-12">
      {which === 'present' && (
        <label className="field">
          <span className="label">{t.search.country}</span>
          <select
            name={country && country !== 'bangladesh' ? 'country' : undefined}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="select"
          >
            <option value="">{t.common.any}</option>
            {countries.map((o) => (
              <option key={o.value} value={o.value}>
                {label('country', o.value, lang)}
                {countryCounts ? ` (${digits(countryCounts[o.value] || 0, lang)})` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {!abroad && (
        <>
          <CountedSelect
            name={a}
            value={division}
            onChange={(v) => {
              setDivision(v);
              setDistrict('');
              setUpazila('');
            }}
            list={divisions}
            counts={divCounts}
            lang={lang}
            anyLabel={t.common.any}
            labelText={t.search.division}
          />
          <CountedSelect
            name={b}
            value={district}
            onChange={(v) => {
              setDistrict(v);
              setUpazila('');
            }}
            list={districts}
            counts={distCounts}
            lang={lang}
            anyLabel={t.common.any}
            labelText={t.search.district}
          />
          <CountedSelect
            name={c}
            value={upazila}
            onChange={setUpazila}
            list={upazilas}
            counts={upaCounts}
            lang={lang}
            anyLabel={district ? t.common.any : t.search.chooseDistrictFirst}
            labelText={t.search.upazila}
            disabled={!district}
          />
        </>
      )}
    </div>
  );
}
