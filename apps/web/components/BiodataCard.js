import NextLink from 'next/link';
import { Silhouette } from './Icons';
import { label, digits, height } from '@/lib/format';

export function cardTitle(b, t, lang) {
  const age = b.age ? `${digits(b.age, lang)} ${t.common.yrs}` : '';
  return [age, label('marital', b.maritalStatus, lang)].filter(Boolean).join(' · ');
}

export default function BiodataCard({ b, t, lang, action }) {
  const place = [label('district', b.permanentDistrict, lang), label('religion', b.religion, lang)].filter(Boolean).join(' · ');
  return (
    <div className="bio-card">
      <NextLink href={`/biodatas/${b.code}`} className="stack gap-16" style={{ color: 'inherit' }}>
        <div className="arch portrait">
          <Silhouette />
          {b.nidVerified && <span className="pill pill-sage">{t.common.verified}</span>}
        </div>
        <div className="stack gap-4" style={{ padding: '0 6px' }}>
          <span className="code">{b.code} · {label('type', b.type, lang)}</span>
          <span className="title">{cardTitle(b, t, lang)}</span>
          <span className="meta">
            {[label('education', b.highestLevel, lang), b.occupationTitle || label('occupation', b.occupation, lang), height(b.heightInches, lang)].filter(Boolean).join(' · ')}
            <br />
            {place}
          </span>
        </div>
      </NextLink>
      <div className="row between gap-8" style={{ padding: '0 6px' }}>
        <NextLink href={`/biodatas/${b.code}`} className="link small">{t.card.view} →</NextLink>
        {action}
      </div>
    </div>
  );
}
