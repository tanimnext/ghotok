import NextLink from 'next/link';
import { getPrefs } from '@/lib/server';

export default async function NotFound() {
  const { lang, t } = await getPrefs();
  return (
    <div className="container stack gap-16" style={{ padding: '96px 28px', alignItems: 'center', textAlign: 'center' }}>
      <span className="display gold" style={{ fontSize: 80 }}>
        404
      </span>
      <h1 className="h2">{lang === 'bn' ? 'এই পেজটি পাওয়া যায়নি' : 'This page could not be found'}</h1>
      <NextLink href="/" className="btn btn-primary">
        {t.nav.home}
      </NextLink>
    </div>
  );
}
