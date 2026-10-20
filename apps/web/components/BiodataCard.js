import NextLink from 'next/link';
import { label, digits, height } from '@ghotok/shared';
import { Silhouette } from './Icons';

export function cardTitle(b, t, lang) {
  const age = b.age ? `${digits(b.age, lang)} ${t.common.yrs}` : '';
  return [age, label('marital', b.maritalStatus, lang, b.type)].filter(Boolean).join(' · ');
}

export function cardPlace(b, lang) {
  const where = b.livesAbroad
    ? label('country', b.presentCountry, lang)
    : [label('upazila', b.permanentUpazila, lang), label('district', b.permanentDistrict, lang)]
        .filter(Boolean)
        .join(', ');
  return [where, label('religion', b.religion, lang)].filter(Boolean).join(' · ');
}

export default function BiodataCard({ b, t, lang, action }) {
  return (
    <article className="bio-card">
      <NextLink href={`/biodatas/${b.code}`} className="stack gap-16" style={{ color: 'inherit' }}>
        <div className="arch portrait">
          <Silhouette />
          {b.nidVerified && <span className="pill pill-sage">{t.common.verified}</span>}
        </div>
        <div className="stack gap-4" style={{ padding: '0 6px' }}>
          <span className="code">
            {b.code} · {label('type', b.type, lang)}
          </span>
          <h3 className="title">{cardTitle(b, t, lang)}</h3>
          <span className="meta">
            {[
              label('education', b.highestLevel, lang),
              b.occupationTitle || label('occupation', b.occupation, lang),
              height(b.heightInches, lang),
            ]
              .filter(Boolean)
              .join(' · ')}
            <br />
            {cardPlace(b, lang)}
          </span>
        </div>
      </NextLink>
      <div className="row between gap-8" style={{ padding: '0 6px' }}>
        <NextLink href={`/biodatas/${b.code}`} className="link small">
          {t.card.view} →
        </NextLink>
        {action}
      </div>
    </article>
  );
}
