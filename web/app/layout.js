import './globals.css';
import { Providers } from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getPrefs, SITE_URL } from '@/lib/server';

export async function generateMetadata() {
  const { lang } = await getPrefs();
  const bn = lang === 'bn';
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: bn ? 'ঘটক — সব ধর্মের জন্য বিশ্বস্ত ম্যাট্রিমনি' : 'Ghotok — Trusted matrimony for every faith in Bangladesh', template: '%s · Ghotok' },
    description: bn
      ? 'হিন্দু, মুসলিম, খ্রিস্টান ও বৌদ্ধ পরিবারের জন্য যাচাইকৃত বায়োডাটা। বিনামূল্যে বায়োডাটা তৈরি করুন, নিরাপদে অভিভাবকের সাথে যোগাযোগ করুন।'
      : 'Verified marriage biodatas for Hindu, Muslim, Christian and Buddhist families in Bangladesh. Create a free biodata and reach guardians safely.',
    openGraph: { siteName: 'Ghotok', type: 'website', locale: bn ? 'bn_BD' : 'en_US' },
    alternates: { canonical: '/' },
  };
}

export const viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#FFF9F5' }, { media: '(prefers-color-scheme: dark)', color: '#170E13' }],
};

export default async function RootLayout({ children }) {
  const { lang, theme, t } = await getPrefs();
  return (
    <html lang={lang} data-theme={theme} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Noto+Serif+Bengali:wght@500;600&family=Manrope:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <Providers initialLang={lang} initialTheme={theme}>
          <a href="#main" className="sr-only">Skip to content</a>
          <Header />
          <main id="main">{children}</main>
          <Footer t={t} lang={lang} />
        </Providers>
      </body>
    </html>
  );
}
