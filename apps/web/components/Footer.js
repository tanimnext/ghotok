import NextLink from 'next/link';
import { digits } from '@ghotok/shared';
import { Rings } from './Icons';

const SOCIAL = [
  ['facebook', 'Facebook'],
  ['youtube', 'YouTube'],
  ['instagram', 'Instagram'],
  ['whatsapp', 'WhatsApp'],
  ['messenger', 'Messenger'],
];

export default function Footer({ t, lang, settings }) {
  const year = new Date().getFullYear();
  const email = settings?.supportEmail || 'support@ghotok.com.bd';
  const social = SOCIAL.filter(([k]) => settings?.social?.[k]);
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div className="stack gap-16" style={{ flex: '1 1 300px', maxWidth: 380 }}>
            <div className="brand">
              <Rings />
              <span className="brand-name">Ghotok</span>
              <span className="brand-bn">ঘটক</span>
            </div>
            <p className="muted" style={{ lineHeight: 1.75 }}>
              {t.brandTag}
            </p>
            <address className="stack gap-4 small muted" style={{ fontStyle: 'normal' }}>
              <a href={`mailto:${email}`}>{email}</a>
              {settings?.supportPhone && (
                <a href={`tel:${settings.supportPhone}`}>{digits(settings.supportPhone, lang)}</a>
              )}
              {settings?.officeAddress?.[lang] && <span>{settings.officeAddress[lang]}</span>}
              {settings?.tradeLicense && (
                <span>
                  {t.footer.tradeLicense}: {digits(settings.tradeLicense, lang)}
                </span>
              )}
            </address>
            {social.length > 0 && (
              <div className="row wrap gap-8">
                {social.map(([k, name]) => (
                  <a
                    key={k}
                    className="pill pill-line"
                    href={settings.social[k]}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {name}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="row gap-32 wrap" style={{ alignItems: 'flex-start', gap: 64 }}>
            <div className="links">
              <b>{t.footer.platform}</b>
              <NextLink href="/biodatas">{t.nav.browse}</NextLink>
              <NextLink href="/packages">{t.nav.packages}</NextLink>
              <NextLink href="/register">{t.nav.create}</NextLink>
              <NextLink href="/resources">{t.nav.resources}</NextLink>
            </div>
            <div className="links">
              <b>{t.footer.support}</b>
              <NextLink href="/guide">{t.nav.guide}</NextLink>
              <NextLink href="/faq">{t.nav.faq}</NextLink>
              <NextLink href="/about">{t.nav.about}</NextLink>
              <NextLink href="/contact">{t.nav.contact}</NextLink>
            </div>
            <div className="links">
              <b>{t.footer.policies}</b>
              <NextLink href="/privacy-policy">{t.pages.privacyT}</NextLink>
              <NextLink href="/terms">{t.pages.termsT}</NextLink>
              <NextLink href="/refund-policy">{t.pages.refundT}</NextLink>
              <NextLink href="/child-safety">{t.pages.childSafetyT}</NextLink>
            </div>
          </div>
        </div>
        <hr className="divider" />
        <p className="small muted" style={{ padding: '22px 0' }}>
          © {digits(year, lang)} ghotok.com.bd. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
