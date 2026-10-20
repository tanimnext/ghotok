import NextLink from 'next/link';
import { label, digits, num, place } from '@ghotok/shared';
import { BiodataView } from '@ghotok/ui/biodata';
import { getPrefs, apiGet, SITE_URL } from '@/lib/server';
import { Silhouette, Eye, Shield } from '@/components/Icons';
import ViewerPanel from './ViewerPanel';
import PrivateFallback from './PrivateFallback';
import CopyCode from './CopyCode';

const load = (code) => apiGet(`/biodatas/${encodeURIComponent(code)}`, { revalidate: 30 });

function summary(b, lang, t) {
  return [
    b.general?.age && `${digits(b.general.age, lang)} ${t.common.years}`,
    label('marital', b.general?.maritalStatus, lang, b.type),
    label('religion', b.general?.religion, lang),
    label('district', b.address?.permanentDistrict, lang),
  ].filter(Boolean);
}

export async function generateMetadata({ params }) {
  const { code } = await params;
  const { lang, t } = await getPrefs();
  const data = await load(code);
  const b = data?.biodata;
  if (!b) return { title: t.bio.notFound, robots: { index: false } };
  const who = label('type', b.type, lang);
  const parts = [...summary(b, lang, t), label('education', b.education?.highestLevel, lang)].filter(Boolean);
  return {
    title: `${who} ${b.code} — ${parts.slice(0, 3).join(', ')}`,
    description:
      `${who} ${b.code}: ${parts.join(' · ')}. ${b.personal?.about ? b.personal.about.slice(0, 120) : ''}`.trim(),
    alternates: { canonical: `/biodatas/${b.code}` },
    openGraph: { url: `${SITE_URL}/biodatas/${b.code}` },
  };
}

export default async function BiodataPage({ params }) {
  const { code } = await params;
  const { lang, t } = await getPrefs();
  const data = await load(code);
  const b = data?.biodata;
  if (!b) return <PrivateFallback code={code} />;

  const badges = [
    b.nidVerified && t.badges.nid,
    b.phoneVerified && t.badges.phone,
    b.emailVerified && t.badges.email,
  ].filter(Boolean);

  return (
    <div className="container stack gap-24 page-pad">
      <span className="small muted no-print">
        <NextLink href="/">{t.nav.home}</NextLink> / <NextLink href="/biodatas">{t.search.title}</NextLink> / {b.code}
      </span>
      <div className="detail-layout">
        <div className="stack gap-20 detail-main">
          <section className="card row wrap gap-24">
            <div className="arch detail-portrait">
              <Silhouette width={100} height={110} />
            </div>
            <div className="stack gap-8" style={{ flex: '1 1 260px' }}>
              <div className="row wrap gap-8">
                <span className="pill pill-rose">{label('type', b.type, lang)}</span>
                {badges.map((x) => (
                  <span key={x} className="pill pill-sage">
                    <Shield size={14} /> {x}
                  </span>
                ))}
              </div>
              <h1 className="display row gap-12 wrap" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>
                {b.code}
                <CopyCode code={b.code} />
              </h1>
              <p className="muted">{summary(b, lang, t).join(' · ')}</p>
              {b.address && <p className="small muted">{place(b.address, 'present', lang)}</p>}
              <span className="row gap-8 small muted">
                <Eye size={16} /> {num(b.stats?.views || 0, lang)} {t.bio.views}
              </span>
            </div>
          </section>
          <BiodataView biodata={b} lang={lang} />
        </div>
        <ViewerPanel code={b.code} biodataId={b._id} type={b.type} />
      </div>
    </div>
  );
}
