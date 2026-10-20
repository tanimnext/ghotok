import NextLink from 'next/link';
import { getPrefs, apiGet, SITE_URL } from '@/lib/server';
import { label, digits, num } from '@/lib/format';
import BiodataSections from '@/components/BiodataSections';
import ViewerPanel from './ViewerPanel';
import PrivateFallback from './PrivateFallback';
import { Silhouette, Eye } from '@/components/Icons';

async function load(no) {
  return apiGet(`/biodatas/${encodeURIComponent(no)}`, { revalidate: 30 });
}

export async function generateMetadata({ params }) {
  const { no } = await params;
  const { lang } = await getPrefs();
  const data = await load(no);
  const b = data?.biodata;
  if (!b) return { title: 'Biodata', robots: { index: false } };
  const bn = lang === 'bn';
  const who = label('type', b.type, lang);
  const parts = [b.general?.age && `${digits(b.general.age, lang)} ${bn ? 'বছর' : 'years'}`, label('religion', b.general?.religion, lang), label('district', b.address?.permanentDistrict, lang), label('education', b.education?.highestLevel, lang)].filter(Boolean);
  return {
    title: `${who} ${b.code} — ${parts.slice(0, 3).join(', ')}`,
    description: `${who} ${b.code}: ${parts.join(' · ')}. ${b.personal?.about ? b.personal.about.slice(0, 120) : ''}`.trim(),
    alternates: { canonical: `/biodatas/${b.code}` },
    openGraph: { url: `${SITE_URL}/biodatas/${b.code}` },
  };
}

export default async function BiodataPage({ params }) {
  const { no } = await params;
  const { lang, t } = await getPrefs();
  const data = await load(no);
  const b = data?.biodata;

  if (!b) return <PrivateFallback no={no} />;

  return (
    <div className="container stack gap-24" style={{ padding: '28px 28px 0' }}>
      <span className="small muted"><NextLink href="/">{t.nav.home}</NextLink> / <NextLink href="/biodatas">{t.search.title}</NextLink> / {b.code}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
        <div className="stack gap-20" style={{ flex: '1 1 640px', minWidth: 0 }}>
          <section className="card row wrap gap-24">
            <div className="arch" style={{ width: 120, height: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', flex: '0 0 auto' }}>
              <Silhouette width={100} height={110} />
            </div>
            <div className="stack gap-8" style={{ flex: '1 1 260px' }}>
              <div className="row wrap gap-8">
                {b.nidVerified && <span className="pill pill-sage">{t.common.verified}</span>}
                <span className="pill pill-rose">{label('type', b.type, lang)}</span>
              </div>
              <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>{b.code}</h1>
              <p className="muted">
                {[b.general?.age && `${digits(b.general.age, lang)} ${t.common.years}`, label('marital', b.general?.maritalStatus, lang), label('religion', b.general?.religion, lang), label('district', b.address?.permanentDistrict, lang)].filter(Boolean).join(' · ')}
              </p>
              <span className="row gap-8 small muted"><Eye size={16} /> {num(b.stats?.views || 0, lang)} {t.bio.views}</span>
            </div>
          </section>
          <BiodataSections b={b} t={t} lang={lang} />
        </div>
        <ViewerPanel no={b.code} biodataId={b._id} type={b.type} />
      </div>
    </div>
  );
}
