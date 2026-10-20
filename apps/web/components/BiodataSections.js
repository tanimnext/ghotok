// Renders a public biodata. No hooks, so it works in server and client components.
import { label, labels, digits, height, yesNo } from '@/lib/format';

function Row({ k, v }) {
  if (v === null || v === undefined || v === '') return null;
  return <div><dt>{k}</dt><dd style={{ whiteSpace: 'pre-line' }}>{v}</dd></div>;
}

function Section({ title, children }) {
  return (
    <section className="card stack gap-12">
      <h2 className="h3">{title}</h2>
      <dl className="kv" style={{ margin: 0 }}>{children}</dl>
    </section>
  );
}

export default function BiodataSections({ b, t, lang }) {
  const f = t.bio.f;
  const g = b.general || {};
  const a = b.address || {};
  const e = b.education || {};
  const fam = b.family || {};
  const p = b.personal || {};
  const o = b.occupation || {};
  const m = b.marriage || {};
  const x = b.expectation || {};
  const place = (area, dist, div) => [area, label('district', dist, lang), label('division', div, lang)].filter(Boolean).join(', ');
  const range = (min, max, fmt = (v) => digits(v, lang)) => (min || max ? `${min ? fmt(min) : '…'} – ${max ? fmt(max) : '…'}` : null);
  const S = t.bio.sections;

  return (
    <>
      <Section title={S.general}>
        <Row k={f.type} v={label('type', b.type, lang)} />
        <Row k={f.maritalStatus} v={label('marital', g.maritalStatus, lang)} />
        <Row k={f.age} v={g.age ? `${digits(g.age, lang)} ${t.common.years}` : null} />
        <Row k={f.birthYear} v={g.birthYear ? digits(g.birthYear, lang) : null} />
        <Row k={f.height} v={height(g.heightInches, lang)} />
        <Row k={f.weight} v={g.weightKg ? `${digits(g.weightKg, lang)} kg` : null} />
        <Row k={f.complexion} v={label('complexion', g.complexion, lang)} />
        <Row k={f.bloodGroup} v={g.bloodGroup} />
        <Row k={f.religion} v={label('religion', g.religion, lang)} />
        <Row k={f.community} v={g.community} />
        <Row k={f.nationality} v={g.nationality} />
      </Section>

      <Section title={S.address}>
        <Row k={f.permanentAddress} v={place(a.permanentArea, a.permanentDistrict, a.permanentDivision)} />
        <Row k={f.presentAddress} v={a.livesAbroad ? a.presentCountry : place(a.presentArea, a.presentDistrict, a.presentDivision)} />
        <Row k={f.livesAbroad} v={a.livesAbroad ? yesNo(true, lang) : null} />
        <Row k={f.grewUpAt} v={a.grewUpAt} />
      </Section>

      <Section title={S.education}>
        <Row k={f.medium} v={label('medium', e.medium, lang)} />
        <Row k={f.highestLevel} v={label('education', e.highestLevel, lang)} />
        {(e.entries || []).map((en, i) => (
          <Row key={i} k={label('education', en.level, lang) || `#${i + 1}`} v={[en.institution, en.subject, en.year && digits(en.year, lang), en.result].filter(Boolean).join(' · ')} />
        ))}
        <Row k={f.otherEducation} v={e.other} />
      </Section>

      <Section title={S.family}>
        <Row k={f.fatherAlive} v={yesNo(fam.fatherAlive, lang)} />
        <Row k={f.fatherOccupation} v={fam.fatherOccupation} />
        <Row k={f.motherAlive} v={yesNo(fam.motherAlive, lang)} />
        <Row k={f.motherOccupation} v={fam.motherOccupation} />
        <Row k={f.brothers} v={fam.brothers !== undefined && fam.brothers !== null ? [digits(fam.brothers, lang), fam.brothersInfo].filter(Boolean).join(' — ') : null} />
        <Row k={f.sisters} v={fam.sisters !== undefined && fam.sisters !== null ? [digits(fam.sisters, lang), fam.sistersInfo].filter(Boolean).join(' — ') : null} />
        <Row k={f.economicStatus} v={label('economic', fam.economicStatus, lang)} />
        <Row k={f.familyDetails} v={fam.details} />
      </Section>

      <Section title={S.personal}>
        <Row k={f.about} v={p.about} />
        <Row k={f.hobbies} v={p.hobbies} />
        <Row k={f.religiousPractice} v={p.religiousPractice} />
        <Row k={f.healthNotes} v={p.healthNotes} />
        <Row k={f.smokes} v={yesNo(p.smokes, lang)} />
        <Row k={f.diet} v={p.diet} />
      </Section>

      <Section title={S.occupation}>
        <Row k={f.occupation} v={label('occupation', o.type, lang)} />
        <Row k={f.occupationTitle} v={o.title} />
        <Row k={f.occupationDetails} v={o.details} />
        <Row k={f.monthlyIncome} v={o.monthlyIncome} />
      </Section>

      <Section title={S.marriage}>
        <Row k={f.guardiansAgree} v={yesNo(m.guardiansAgree, lang)} />
        <Row k={f.previousMarriageInfo} v={m.previousMarriageInfo} />
        <Row k={f.children} v={m.children ? digits(m.children, lang) : null} />
        <Row k={f.willingToRelocate} v={yesNo(m.willingToRelocate, lang)} />
        <Row k={f.careerAfterMarriage} v={m.careerAfterMarriage} />
        <Row k={f.thoughts} v={m.thoughts} />
      </Section>

      <Section title={S.expectation}>
        <Row k={f.ageRange} v={range(x.ageMin, x.ageMax)} />
        <Row k={f.heightRange} v={range(x.heightMin, x.heightMax, (v) => height(v, lang))} />
        <Row k={f.religions} v={labels('religion', x.religions, lang)} />
        <Row k={f.maritalStatuses} v={labels('marital', x.maritalStatuses, lang)} />
        <Row k={f.complexions} v={labels('complexion', x.complexions, lang)} />
        <Row k={f.educationMin} v={label('education', x.educationMin, lang)} />
        <Row k={f.occupations} v={labels('occupation', x.occupations, lang)} />
        <Row k={f.districts} v={labels('district', x.districts, lang)} />
        <Row k={f.economicStatuses} v={labels('economic', x.economicStatuses, lang)} />
        <Row k={f.qualities} v={x.qualities} />
      </Section>
    </>
  );
}
