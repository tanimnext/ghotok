import { apiGet, SITE_URL } from '@/lib/server';

export const revalidate = 3600;

export default async function sitemap() {
  const fixed = ['', '/biodatas', '/packages', '/guide', '/faq', '/about', '/contact', '/privacy-policy', '/terms', '/refund-policy'].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: p === '/biodatas' || p === '' ? 'daily' : 'monthly',
    priority: p === '' ? 1 : p === '/biodatas' ? 0.9 : 0.5,
  }));
  const bios = [];
  for (let page = 1; page <= 100; page += 1) {
    const d = await apiGet(`/biodatas?limit=48&page=${page}`, { revalidate: 3600 });
    if (!d?.items?.length) break;
    for (const b of d.items) bios.push({ url: `${SITE_URL}/biodatas/${b.code}`, lastModified: b.approvedAt, changeFrequency: 'weekly', priority: 0.7 });
    if (page >= d.pages) break;
  }
  return [...fixed, ...bios];
}
