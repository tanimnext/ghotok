import NextLink from 'next/link';
import { digits } from '@ghotok/shared';
import { getPrefs, getSettings } from '@/lib/server';
import { Mail, Phone } from '@/components/Icons';
import ContactForm from './ContactForm';

export async function generateMetadata() {
  const { t } = await getPrefs();
  return { title: t.pages.contactT, description: t.contact.lead, alternates: { canonical: '/contact' } };
}

export default async function ContactPage() {
  const [{ lang, t }, settings] = await Promise.all([getPrefs(), getSettings()]);
  const c = t.contact;
  const email = settings?.supportEmail || 'support@ghotok.com.bd';
  return (
    <div className="container stack gap-24" style={{ padding: '48px 28px 0', maxWidth: 1040 }}>
      <div className="stack gap-12" style={{ maxWidth: 720 }}>
        <h1 className="h2">{t.pages.contactT}</h1>
        <p className="lead">{c.lead}</p>
      </div>
      <div className="contact-layout">
        <section className="card stack gap-16" style={{ flex: '1 1 520px' }}>
          <h2 className="h3">{c.formTitle}</h2>
          <ContactForm />
        </section>
        <aside className="stack gap-16" style={{ flex: '1 1 300px' }}>
          <section className="card stack gap-12">
            <h2 className="h3">{c.reachUs}</h2>
            <a href={`mailto:${email}`} className="row gap-8 link-plain">
              <Mail size={18} />
              {email}
            </a>
            {settings?.supportPhone && (
              <a href={`tel:${settings.supportPhone}`} className="row gap-8 link-plain">
                <Phone size={18} />
                {digits(settings.supportPhone, lang)}
              </a>
            )}
            {settings?.officeAddress?.[lang] && <p className="muted">{settings.officeAddress[lang]}</p>}
            <p className="small muted">{c.hours}</p>
          </section>
          <section className="card stack gap-12">
            <h2 className="h3">{t.support.title}</h2>
            <p className="muted small">{c.ticketHint}</p>
            <NextLink href="/dashboard/support" className="btn btn-outline" style={{ alignSelf: 'flex-start' }}>
              {t.support.newTicket}
            </NextLink>
          </section>
        </aside>
      </div>
    </div>
  );
}
