import NextLink from 'next/link';
import { Rings } from './Icons';
import { digits } from '@/lib/format';

export default function Footer({ t, lang }) {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div className="stack gap-16" style={{ flex: '1 1 300px', maxWidth: 380 }}>
            <div className="brand"><Rings /><span className="brand-name">Ghotok</span><span className="brand-bn">ঘটক</span></div>
            <p className="muted" style={{ lineHeight: 1.75 }}>{t.brandTag}</p>
            <a className="muted small" href="mailto:support@ghotok.com.bd">support@ghotok.com.bd</a>
          </div>
          <div className="row gap-32 wrap" style={{ alignItems: 'flex-start', gap: 64 }}>
            <div className="links"><b>{t.footer.platform}</b>
              <NextLink href="/biodatas">{t.nav.browse}</NextLink>
              <NextLink href="/packages">{t.nav.packages}</NextLink>
              <NextLink href="/register">{t.nav.create}</NextLink>
            </div>
            <div className="links"><b>{t.footer.support}</b>
              <NextLink href="/guide">{t.nav.guide}</NextLink>
              <NextLink href="/faq">{t.nav.faq}</NextLink>
              <NextLink href="/about">{t.nav.about}</NextLink>
              <NextLink href="/contact">{t.nav.contact}</NextLink>
            </div>
            <div className="links"><b>{t.footer.policies}</b>
              <NextLink href="/privacy-policy">{t.pages.privacyT}</NextLink>
              <NextLink href="/terms">{t.pages.termsT}</NextLink>
              <NextLink href="/refund-policy">{t.pages.refundT}</NextLink>
            </div>
          </div>
        </div>
        <hr className="divider" />
        <p className="small muted" style={{ padding: '22px 0' }}>© {digits(year, lang)} ghotok.com.bd. {t.footer.rights}</p>
      </div>
    </footer>
  );
}
