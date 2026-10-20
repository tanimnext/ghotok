import { getPrefs, apiGet } from '@/lib/server';
import BuyFlow from './BuyFlow';

export async function generateMetadata() {
  const { t } = await getPrefs();
  return { title: t.pkg.title, description: t.pkg.sub, alternates: { canonical: '/packages' } };
}

export default async function PackagesPage({ searchParams }) {
  const { t } = await getPrefs();
  const sp = await searchParams;
  const data = await apiGet('/packages', { revalidate: 60 });
  return (
    <div className="container stack gap-32" style={{ padding: '44px 28px 0' }}>
      <div className="stack gap-8" style={{ maxWidth: 680 }}>
        <span className="eyebrow">{t.home.priceK}</span>
        <h1 className="h2">{t.pkg.title}</h1>
        <p className="lead">{t.pkg.sub}</p>
      </div>
      {data ? (
        <BuyFlow packages={data.items} payment={data.payment} initialPackage={sp.package} />
      ) : (
        <p className="card empty">{t.common.error}</p>
      )}
    </div>
  );
}
