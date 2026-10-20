/**
 * Bilingual labels for workflow states (biodata review, payments, tickets…).
 * Used by the website, the admin panel and notification texts.
 */
const L = (en, bn) => ({ en, bn });

export const STATUS = {
  biodata: {
    draft: L('Draft', 'খসড়া'),
    pending: L('Under review', 'রিভিউ চলছে'),
    approved: L('Approved', 'অনুমোদিত'),
    rejected: L('Not approved', 'অনুমোদিত হয়নি'),
    changes_requested: L('Corrections needed', 'সংশোধন দরকার'),
  },
  nid: {
    none: L('Not uploaded', 'আপলোড হয়নি'),
    submitted: L('Waiting for verification', 'যাচাইয়ের অপেক্ষায়'),
    verified: L('Verified', 'যাচাইকৃত'),
    rejected: L('Not accepted', 'গৃহীত হয়নি'),
  },
  payment: {
    initiated: L('Started', 'শুরু হয়েছে'),
    pending: L('Waiting for verification', 'যাচাইয়ের অপেক্ষায়'),
    approved: L('Verified', 'যাচাইকৃত'),
    rejected: L('Rejected', 'বাতিল'),
    failed: L('Failed', 'ব্যর্থ'),
    cancelled: L('Cancelled', 'বাতিল করা হয়েছে'),
  },
  refund: {
    pending: L('Under review', 'রিভিউ চলছে'),
    approved: L('Approved', 'অনুমোদিত'),
    rejected: L('Declined', 'প্রত্যাখ্যাত'),
  },
  ticket: { open: L('Open', 'খোলা'), answered: L('Answered', 'উত্তর দেওয়া হয়েছে'), closed: L('Closed', 'বন্ধ') },
  report: {
    open: L('Open', 'খোলা'),
    reviewing: L('Reviewing', 'রিভিউ চলছে'),
    resolved: L('Resolved', 'সমাধান হয়েছে'),
    dismissed: L('Dismissed', 'বাতিল'),
  },
  proposal: {
    pending: L('Pending', 'অপেক্ষমাণ'),
    accepted: L('Accepted', 'গৃহীত'),
    declined: L('Declined', 'প্রত্যাখ্যাত'),
    withdrawn: L('Withdrawn', 'প্রত্যাহার করা'),
  },
  ledger: {
    purchase: L('Purchase', 'ক্রয়'),
    unlock: L('Contact unlocked', 'যোগাযোগ আনলক'),
    admin_grant: L('Added by Ghotok', 'ঘটক যোগ করেছে'),
    admin_revoke: L('Removed by Ghotok', 'ঘটক বাদ দিয়েছে'),
    refund: L('Refund', 'রিফান্ড'),
    signup_bonus: L('Welcome bonus', 'স্বাগতম বোনাস'),
  },
  user: { active: L('Active', 'সক্রিয়'), suspended: L('Suspended', 'স্থগিত'), deleted: L('Deleted', 'মুছে ফেলা') },
  contact: { new: L('New', 'নতুন'), replied: L('Replied', 'উত্তর দেওয়া হয়েছে'), closed: L('Closed', 'বন্ধ') },
  recovery: {
    none: L('None', 'নেই'),
    pending: L('Waiting', 'অপেক্ষমাণ'),
    approved: L('Restored', 'পুনরুদ্ধার হয়েছে'),
    declined: L('Declined', 'প্রত্যাখ্যাত'),
  },
  role: {
    user: L('User', 'ব্যবহারকারী'),
    support: L('Support / reviewer', 'সাপোর্ট / রিভিউয়ার'),
    admin: L('Admin', 'অ্যাডমিন'),
    superadmin: L('Super admin', 'সুপার অ্যাডমিন'),
  },
};

/** statusLabel('payment', 'pending', 'bn') → 'যাচাইয়ের অপেক্ষায়' */
export const statusLabel = (kind, value, lang = 'en') =>
  STATUS[kind]?.[value]?.[lang === 'bn' ? 'bn' : 'en'] ?? value ?? '';

/** [[value, label]] pairs for tabs and selects. */
export const statusOptions = (kind, lang) =>
  Object.keys(STATUS[kind] || {}).map((v) => [v, statusLabel(kind, v, lang)]);
