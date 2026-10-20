import { Notification, AuditLog } from '../models/support.js';

// Bilingual message templates for in-app notifications.
const T = {
  biodata_approved: {
    title: { en: 'Your biodata is approved', bn: 'আপনার বায়োডাটা অনুমোদিত হয়েছে' },
    body: { en: 'It is now visible in search results.', bn: 'এখন এটি সার্চ ফলাফলে দেখা যাবে।' },
  },
  biodata_rejected: {
    title: { en: 'Your biodata was not approved', bn: 'আপনার বায়োডাটা অনুমোদিত হয়নি' },
    body: { en: 'Open your biodata to see the reviewer note.', bn: 'রিভিউয়ারের মন্তব্য দেখতে বায়োডাটা খুলুন।' },
  },
  biodata_changes_requested: {
    title: { en: 'Corrections needed on your biodata', bn: 'আপনার বায়োডাটায় সংশোধন দরকার' },
    body: { en: 'Please update the fields mentioned by the reviewer and submit again.', bn: 'রিভিউয়ারের উল্লেখ করা তথ্য ঠিক করে আবার জমা দিন।' },
  },
  nid_verified: {
    title: { en: 'NID verified', bn: 'এনআইডি যাচাই সম্পন্ন' },
    body: { en: 'Your biodata now shows the verified badge.', bn: 'আপনার বায়োডাটায় এখন যাচাইকৃত ব্যাজ দেখা যাবে।' },
  },
  nid_rejected: {
    title: { en: 'NID could not be verified', bn: 'এনআইডি যাচাই করা যায়নি' },
    body: { en: 'Please upload a clear photo of your NID again.', bn: 'অনুগ্রহ করে এনআইডির স্পষ্ট ছবি আবার আপলোড করুন।' },
  },
  payment_approved: {
    title: { en: 'Payment verified', bn: 'পেমেন্ট যাচাই সম্পন্ন' },
    body: { en: 'Connections have been added to your balance.', bn: 'আপনার ব্যালেন্সে কানেকশন যোগ হয়েছে।' },
  },
  payment_rejected: {
    title: { en: 'Payment could not be verified', bn: 'পেমেন্ট যাচাই করা যায়নি' },
    body: { en: 'Check the transaction ID or contact support.', bn: 'ট্রান্সজেকশন আইডি দেখুন অথবা সাপোর্টে যোগাযোগ করুন।' },
  },
  proposal_received: {
    title: { en: 'You received a proposal', bn: 'আপনি একটি প্রস্তাব পেয়েছেন' },
    body: { en: 'A family is interested in your biodata.', bn: 'একটি পরিবার আপনার বায়োডাটায় আগ্রহী।' },
  },
  proposal_accepted: {
    title: { en: 'Your proposal was accepted', bn: 'আপনার প্রস্তাব গৃহীত হয়েছে' },
    body: { en: 'You can now see the guardian contact.', bn: 'এখন আপনি অভিভাবকের যোগাযোগ দেখতে পারবেন।' },
  },
  proposal_declined: {
    title: { en: 'Your proposal was declined', bn: 'আপনার প্রস্তাব গৃহীত হয়নি' },
    body: { en: 'Keep looking — the right match is out there.', bn: 'খোঁজ চালিয়ে যান, সঠিক মানুষ অবশ্যই আছেন।' },
  },
  refund_approved: {
    title: { en: 'Refund approved', bn: 'রিফান্ড অনুমোদিত' },
    body: { en: 'The connection was returned to your balance.', bn: 'কানেকশনটি আপনার ব্যালেন্সে ফেরত দেওয়া হয়েছে।' },
  },
  refund_rejected: {
    title: { en: 'Refund request declined', bn: 'রিফান্ড অনুরোধ গৃহীত হয়নি' },
    body: { en: 'See the note from our team in your dashboard.', bn: 'ড্যাশবোর্ডে আমাদের টিমের মন্তব্য দেখুন।' },
  },
  connections_adjusted: {
    title: { en: 'Your connection balance changed', bn: 'আপনার কানেকশন ব্যালেন্স পরিবর্তিত হয়েছে' },
    body: { en: 'Our team adjusted your balance.', bn: 'আমাদের টিম আপনার ব্যালেন্স সমন্বয় করেছে।' },
  },
  recovery_approved: {
    title: { en: 'Your biodata was restored', bn: 'আপনার বায়োডাটা পুনরুদ্ধার হয়েছে' },
    body: { en: 'It is back and will be reviewed again.', bn: 'এটি ফিরে এসেছে এবং আবার রিভিউ করা হবে।' },
  },
  recovery_declined: {
    title: { en: 'Restore request declined', bn: 'পুনরুদ্ধারের অনুরোধ গৃহীত হয়নি' },
    body: { en: 'Contact support if you have questions.', bn: 'প্রশ্ন থাকলে সাপোর্টে যোগাযোগ করুন।' },
  },
  ticket_replied: {
    title: { en: 'Support replied to your ticket', bn: 'আপনার টিকিটে সাপোর্ট উত্তর দিয়েছে' },
    body: { en: 'Open the ticket to read the reply.', bn: 'উত্তর পড়তে টিকিটটি খুলুন।' },
  },
  report_resolved: {
    title: { en: 'Your report was reviewed', bn: 'আপনার রিপোর্ট রিভিউ করা হয়েছে' },
    body: { en: 'Thank you for helping keep Ghotok safe.', bn: 'ঘটককে নিরাপদ রাখতে সাহায্যের জন্য ধন্যবাদ।' },
  },
};

export async function notify(userId, type, link) {
  const t = T[type];
  if (!t) return null;
  return Notification.create({ user: userId, type, title: t.title, body: t.body, link });
}

export async function audit(actorId, action, targetType, targetId, meta) {
  return AuditLog.create({ actor: actorId, action, targetType, targetId, meta });
}
