import { getPrefs } from '@/lib/server';
import { FAQ } from '@/lib/content';

export async function generateMetadata() {
  const { t } = await getPrefs();
  return { title: t.pages.faqT, alternates: { canonical: '/faq' } };
}

export default async function FaqPage() {
  const { lang, t } = await getPrefs();
  const items = FAQ[lang];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
  return (
    <div className="container" style={{ padding: '48px 28px 0', maxWidth: 860 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="h2" style={{ marginBottom: 24 }}>{t.pages.faqT}</h1>
      {items.map(([q, a]) => (
        <details key={q} className="faq">
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
