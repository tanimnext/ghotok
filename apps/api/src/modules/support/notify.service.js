/**
 * Notifications: an in-app record for every event, plus an email when the user has an address.
 * Templates are bilingual; the email uses the user's preferred language.
 */
import { Notification } from './support.models.js';
import { User } from '../auth/user.model.js';
import { sendMail } from '../../services/mailer.js';
import { env } from '../../config/env.js';

const L = (en, bn) => ({ en, bn });

export const TEMPLATES = {
  biodata_approved: {
    title: L('Your biodata is approved', 'আপনার বায়োডাটা অনুমোদিত হয়েছে'),
    body: L('It is now visible in search results.', 'এখন এটি সার্চ ফলাফলে দেখা যাবে।'),
    email: true,
  },
  biodata_rejected: {
    title: L('Your biodata was not approved', 'আপনার বায়োডাটা অনুমোদিত হয়নি'),
    body: L('Open your biodata to read the reviewer note.', 'রিভিউয়ারের মন্তব্য পড়তে বায়োডাটা খুলুন।'),
    email: true,
  },
  biodata_changes_requested: {
    title: L('Corrections needed on your biodata', 'আপনার বায়োডাটায় সংশোধন দরকার'),
    body: L(
      'Update the fields mentioned by the reviewer and submit again.',
      'রিভিউয়ারের উল্লেখ করা তথ্য ঠিক করে আবার জমা দিন।'
    ),
    email: true,
  },
  nid_verified: {
    title: L('NID verified', 'এনআইডি যাচাই সম্পন্ন'),
    body: L('Your biodata now shows the verified badge.', 'আপনার বায়োডাটায় এখন যাচাইকৃত ব্যাজ দেখা যাবে।'),
  },
  nid_rejected: {
    title: L('NID could not be verified', 'এনআইডি যাচাই করা যায়নি'),
    body: L('Please upload a clear photo of your NID again.', 'অনুগ্রহ করে এনআইডির স্পষ্ট ছবি আবার আপলোড করুন।'),
  },
  payment_approved: {
    title: L('Payment verified', 'পেমেন্ট যাচাই সম্পন্ন'),
    body: L('Connections have been added to your balance.', 'আপনার ব্যালেন্সে কানেকশন যোগ হয়েছে।'),
    email: true,
  },
  payment_rejected: {
    title: L('Payment could not be verified', 'পেমেন্ট যাচাই করা যায়নি'),
    body: L('Check the transaction ID or contact support.', 'ট্রান্সজেকশন আইডি দেখুন অথবা সাপোর্টে যোগাযোগ করুন।'),
    email: true,
  },
  proposal_received: {
    title: L('You received a proposal', 'আপনি একটি প্রস্তাব পেয়েছেন'),
    body: L('A family is interested in your biodata.', 'একটি পরিবার আপনার বায়োডাটায় আগ্রহী।'),
    email: true,
  },
  proposal_accepted: {
    title: L('Your proposal was accepted', 'আপনার প্রস্তাব গৃহীত হয়েছে'),
    body: L('You can now see the guardian contact.', 'এখন আপনি অভিভাবকের যোগাযোগ দেখতে পারবেন।'),
    email: true,
  },
  proposal_declined: {
    title: L('Your proposal was declined', 'আপনার প্রস্তাব গৃহীত হয়নি'),
    body: L('Keep looking — the right match is out there.', 'খোঁজ চালিয়ে যান, সঠিক মানুষ অবশ্যই আছেন।'),
  },
  refund_approved: {
    title: L('Refund approved', 'রিফান্ড অনুমোদিত'),
    body: L('The connection was returned to your balance.', 'কানেকশনটি আপনার ব্যালেন্সে ফেরত দেওয়া হয়েছে।'),
    email: true,
  },
  refund_rejected: {
    title: L('Refund request declined', 'রিফান্ড অনুরোধ গৃহীত হয়নি'),
    body: L('See the note from our team in your dashboard.', 'ড্যাশবোর্ডে আমাদের টিমের মন্তব্য দেখুন।'),
  },
  connections_adjusted: {
    title: L('Your connection balance changed', 'আপনার কানেকশন ব্যালেন্স পরিবর্তিত হয়েছে'),
    body: L('Our team adjusted your balance.', 'আমাদের টিম আপনার ব্যালেন্স সমন্বয় করেছে।'),
  },
  recovery_approved: {
    title: L('Your biodata was restored', 'আপনার বায়োডাটা পুনরুদ্ধার হয়েছে'),
    body: L('It is back and will be reviewed again.', 'এটি ফিরে এসেছে এবং আবার রিভিউ করা হবে।'),
    email: true,
  },
  recovery_declined: {
    title: L('Restore request declined', 'পুনরুদ্ধারের অনুরোধ গৃহীত হয়নি'),
    body: L('Contact support if you have questions.', 'প্রশ্ন থাকলে সাপোর্টে যোগাযোগ করুন।'),
  },
  ticket_replied: {
    title: L('Support replied to your ticket', 'আপনার টিকিটে সাপোর্ট উত্তর দিয়েছে'),
    body: L('Open the ticket to read the reply.', 'উত্তর পড়তে টিকিটটি খুলুন।'),
    email: true,
  },
  report_resolved: {
    title: L('Your report was reviewed', 'আপনার রিপোর্ট রিভিউ করা হয়েছে'),
    body: L('Thank you for helping keep Ghotok safe.', 'ঘটককে নিরাপদ রাখতে সাহায্যের জন্য ধন্যবাদ।'),
  },
  account_suspended: {
    title: L('Your account was suspended', 'আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে'),
    body: L('Contact support for details.', 'বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।'),
    email: true,
  },
};

export async function notify(userId, type, link) {
  const t = TEMPLATES[type];
  if (!t) throw new Error(`Unknown notification type ${type}`);
  const n = await Notification.create({ user: userId, type, title: t.title, body: t.body, link });
  if (t.email) {
    const user = await User.findById(userId).select('email name preferredLang').lean();
    if (user?.email) {
      const lang = user.preferredLang === 'en' ? 'en' : 'bn';
      await sendMail({
        to: user.email,
        subject: `Ghotok: ${t.title[lang]}`,
        text: `${user.name},\n\n${t.title[lang]}\n${t.body[lang]}\n\n${env.webUrl}${link || '/dashboard'}\n\n${lang === 'bn' ? 'ঘটক' : 'Ghotok'}`,
      });
    }
  }
  return n;
}
