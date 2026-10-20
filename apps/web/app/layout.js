import '@ghotok/ui/styles.css';
import './site.css';
import { Providers } from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomTabs from '@/components/BottomTabs';
import ChatButton from '@/components/ChatButton';
import { getPrefs, getSettings, SITE_URL, ADMIN_URL } from '@/lib/server';

export async function generateMetadata() {
  const { lang, t } = await getPrefs();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: '%s · Ghotok' },
    description: t.meta.description,
    applicationName: 'Ghotok',
    openGraph: { siteName: 'Ghotok', type: 'website', locale: lang === 'bn' ? 'bn_BD' : 'en_US' },
    alternates: { canonical: '/' },
    icons: { icon: '/favicon.svg', apple: '/icon-192.png' },
  };
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF9F5' },
    { media: '(prefers-color-scheme: dark)', color: '#170E13' },
  ],
};

export default async function RootLayout({ children }) {
  const [{ lang, theme, t }, settings] = await Promise.all([getPrefs(), getSettings()]);
  return (
    <html lang={lang} data-theme={theme} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Noto+Serif+Bengali:wght@500;600&family=Manrope:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <Providers initialLang={lang} initialTheme={theme}>
          <a href="#main" className="sr-only skip-link">
            {t.nav.skip}
          </a>
          {settings?.announcement?.[lang] && (
            <div className="announcement" role="status">
              {settings.announcement[lang]}
            </div>
          )}
          <Header adminUrl={ADMIN_URL} />
          <main id="main">{children}</main>
          <Footer t={t} lang={lang} settings={settings} />
          <ChatButton href={settings?.chatLink || settings?.social?.whatsapp} label={t.nav.chat} />
          <BottomTabs />
        </Providers>
      </body>
    </html>
  );
}
