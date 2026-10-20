import NextLink from 'next/link';
import { getPrefs } from '@/lib/server';
import { Mail } from '@/components/Icons';

export async function generateMetadata() {
  const { t } = await getPrefs();
  return { title: t.pages.contactT, alternates: { canonical: '/contact' } };
}

export default async function ContactPage() {
  const { lang, t } = await getPrefs();
  const bn = lang === 'bn';
  return (
    <div className="container stack gap-24" style={{ padding: '48px 28px 0', maxWidth: 860 }}>
      <h1 className="h2">{t.pages.contactT}</h1>
      <p className="lead">{bn ? 'অ্যাকাউন্ট, বায়োডাটা বা পেমেন্ট নিয়ে প্রশ্ন থাকলে লগইন করে সাপোর্ট টিকিট খুলুন — সবচেয়ে দ্রুত উত্তর পাবেন।' : 'For questions about your account, biodata or payments, log in and open a support ticket — that is the fastest way to get an answer.'}</p>
      <div className="grid grid-2">
        <div className="card stack gap-12">
          <h2 className="h3">{t.support.title}</h2>
          <p className="muted">{t.support.sub}</p>
          <NextLink href="/dashboard/support" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>{t.support.newTicket}</NextLink>
        </div>
        <div className="card stack gap-12">
          <h2 className="h3">{bn ? 'ইমেইল' : 'Email'}</h2>
          <a href="mailto:support@ghotok.com.bd" className="row gap-8" style={{ fontWeight: 700, color: 'var(--rose-text)' }}><Mail size={18} />support@ghotok.com.bd</a>
          <p className="small muted">{bn ? '[অফিসের ঠিকানা ও হটলাইন নম্বর এখানে বসান]' : '[Add your office address and hotline number here]'}</p>
        </div>
      </div>
    </div>
  );
}
