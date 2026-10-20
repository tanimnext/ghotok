/**
 * Error codes returned by the API, with messages in both languages.
 * The API sends `{ error: <message in the request language>, code, fields }`;
 * clients may also translate `code` themselves.
 */
const L = (en, bn) => ({ en, bn });

export const ERRORS = {
  // generic
  BAD_REQUEST: L('Please check the highlighted fields.', 'চিহ্নিত ঘরগুলো দেখুন।'),
  VALIDATION: L('Please check the highlighted fields.', 'চিহ্নিত ঘরগুলো দেখুন।'),
  UNAUTHORIZED: L('Please log in.', 'অনুগ্রহ করে লগইন করুন।'),
  FORBIDDEN: L('You do not have permission to do this.', 'এই কাজের অনুমতি আপনার নেই।'),
  NOT_FOUND: L('Not found.', 'পাওয়া যায়নি।'),
  CONFLICT: L('This already exists.', 'এটি আগে থেকেই আছে।'),
  RATE_LIMITED: L(
    'Too many attempts. Please wait a little and try again.',
    'অনেকবার চেষ্টা করা হয়েছে। একটু পরে আবার চেষ্টা করুন।'
  ),
  INTERNAL: L('Something went wrong. Please try again.', 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।'),
  ROUTE_NOT_FOUND: L('Route not found.', 'রুট পাওয়া যায়নি।'),
  INVALID_ID: L('Invalid id.', 'আইডি সঠিক নয়।'),
  FILE_TOO_LARGE: L('File is too large (max 5 MB).', 'ফাইলটি অনেক বড় (সর্বোচ্চ ৫ এমবি)।'),
  FILE_TYPE: L('Only JPG, PNG, WEBP or PDF files are allowed.', 'শুধু JPG, PNG, WEBP বা PDF ফাইল দেওয়া যাবে।'),
  FILE_INVALID: L('This file does not look like a valid image or PDF.', 'ফাইলটি সঠিক ছবি বা PDF মনে হচ্ছে না।'),
  FILE_REQUIRED: L('Choose a file to upload.', 'আপলোড করার জন্য একটি ফাইল বাছাই করুন।'),

  // auth
  ACCOUNT_SUSPENDED: L(
    'Your account is suspended. Please contact support.',
    'আপনার অ্যাকাউন্ট স্থগিত। সাপোর্টে যোগাযোগ করুন।'
  ),
  ACCOUNT_DELETED: L('This account was deleted.', 'এই অ্যাকাউন্টটি মুছে ফেলা হয়েছে।'),
  INVALID_CREDENTIALS: L('Wrong email/mobile or password.', 'ইমেইল/মোবাইল বা পাসওয়ার্ড ভুল।'),
  EMAIL_TAKEN: L('An account with this email already exists.', 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে।'),
  PHONE_TAKEN: L('An account with this mobile number already exists.', 'এই মোবাইল নম্বরে আগেই অ্যাকাউন্ট আছে।'),
  RESET_INVALID: L('This link is invalid or has expired.', 'এই লিংকটি সঠিক নয় অথবা মেয়াদ শেষ।'),
  OTP_INVALID: L('The code is wrong or has expired.', 'কোডটি ভুল অথবা মেয়াদ শেষ।'),
  OTP_TOO_SOON: L('Please wait before asking for another code.', 'আরেকটি কোড চাওয়ার আগে একটু অপেক্ষা করুন।'),
  OTP_TOO_MANY: L('Too many wrong codes. Ask for a new one.', 'অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড চান।'),
  NO_PHONE: L('Add a mobile number to your account first.', 'আগে অ্যাকাউন্টে একটি মোবাইল নম্বর যোগ করুন।'),
  NO_EMAIL: L('Add an email address to your account first.', 'আগে অ্যাকাউন্টে একটি ইমেইল যোগ করুন।'),
  GOOGLE_DISABLED: L('Google sign-in is not available right now.', 'এই মুহূর্তে Google দিয়ে লগইন করা যাচ্ছে না।'),
  GOOGLE_INVALID: L('Google sign-in failed. Please try again.', 'Google দিয়ে লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'),
  WRONG_PASSWORD: L('Current password is wrong.', 'বর্তমান পাসওয়ার্ড ভুল।'),

  // biodata
  BIODATA_NOT_FOUND: L('This biodata is not available.', 'এই বায়োডাটাটি পাওয়া যাচ্ছে না।'),
  BIODATA_REQUIRED: L('Create your biodata first.', 'আগে আপনার বায়োডাটা তৈরি করুন।'),
  BIODATA_DELETED_EXISTS: L(
    'Your previous biodata was deleted. Ask for it to be restored instead.',
    'আপনার আগের বায়োডাটা মুছে ফেলা হয়েছে। নতুন না করে পুনরুদ্ধারের অনুরোধ করুন।'
  ),
  BIODATA_INCOMPLETE: L('Some required information is missing.', 'কিছু প্রয়োজনীয় তথ্য বাকি আছে।'),
  BIODATA_ALREADY_APPROVED: L('Your biodata is already approved.', 'আপনার বায়োডাটা ইতিমধ্যে অনুমোদিত।'),
  OWN_BIODATA: L('This is your own biodata.', 'এটি আপনার নিজের বায়োডাটা।'),
  OWN_BIODATA_REQUIRED: L(
    'Your own biodata must be approved before you can send proposals.',
    'প্রস্তাব পাঠাতে আগে আপনার নিজের বায়োডাটা অনুমোদিত হতে হবে।'
  ),
  SAME_TYPE_PROPOSAL: L(
    'You can only send proposals to the opposite biodata type.',
    'শুধু বিপরীত ধরনের বায়োডাটায় প্রস্তাব পাঠানো যায়।'
  ),
  PROPOSAL_EXISTS: L('You already sent a proposal to this biodata.', 'এই বায়োডাটায় আপনি আগেই প্রস্তাব পাঠিয়েছেন।'),
  PROPOSAL_ANSWERED: L('This proposal was already answered.', 'এই প্রস্তাবের উত্তর আগেই দেওয়া হয়েছে।'),
  REPORT_EXISTS: L(
    'You already have an open report for this biodata.',
    'এই বায়োডাটার বিরুদ্ধে আপনার একটি রিপোর্ট খোলা আছে।'
  ),
  RESTORE_PENDING: L(
    'A restore request is already waiting for review.',
    'পুনরুদ্ধারের একটি অনুরোধ ইতিমধ্যে অপেক্ষায় আছে।'
  ),
  NID_VERIFIED: L('Your NID is already verified.', 'আপনার এনআইডি ইতিমধ্যে যাচাইকৃত।'),

  // billing
  INSUFFICIENT_CONNECTIONS: L('Not enough connections.', 'যথেষ্ট কানেকশন নেই।'),
  TRX_USED: L('This transaction ID has already been submitted.', 'এই ট্রান্সজেকশন আইডি আগেই জমা দেওয়া হয়েছে।'),
  TOO_MANY_PENDING: L(
    'You already have payments waiting for verification.',
    'আপনার কয়েকটি পেমেন্ট ইতিমধ্যে যাচাইয়ের অপেক্ষায় আছে।'
  ),
  PAYMENT_NOT_PENDING: L('This payment is not waiting for review.', 'এই পেমেন্টটি রিভিউয়ের অপেক্ষায় নেই।'),
  BKASH_DISABLED: L('Online bKash payment is not available right now.', 'এই মুহূর্তে অনলাইন বিকাশ পেমেন্ট চালু নেই।'),
  REFUND_NOT_ELIGIBLE: L('This contact is not eligible for a refund.', 'এই যোগাযোগের জন্য রিফান্ড প্রযোজ্য নয়।'),
  REFUND_PENDING: L('A refund request is already waiting for review.', 'একটি রিফান্ড অনুরোধ ইতিমধ্যে অপেক্ষায় আছে।'),
  REFUND_NOT_PENDING: L('This refund request is not pending.', 'এই রিফান্ড অনুরোধটি অপেক্ষমাণ নয়।'),

  // support
  TOO_MANY_TICKETS: L(
    'You have too many open tickets. Please wait for a reply.',
    'আপনার অনেকগুলো টিকিট খোলা আছে। উত্তরের অপেক্ষা করুন।'
  ),
  TICKET_CLOSED: L('This ticket is closed. Open a new one.', 'এই টিকিটটি বন্ধ। নতুন টিকিট খুলুন।'),

  // admin
  SELF_ACTION: L('You cannot do this to your own account.', 'নিজের অ্যাকাউন্টে এটি করা যাবে না।'),
  NOTE_REQUIRED: L('Write a note for the user.', 'ব্যবহারকারীর জন্য একটি মন্তব্য লিখুন।'),
};

/** Messages for field-level validation codes. */
export const FIELD_ERRORS = {
  required: L('Required', 'আবশ্যক'),
  too_long: L('Too long', 'অনেক বড়'),
  too_short: L('Too short', 'অনেক ছোট'),
  too_small: L('Too small', 'অনেক কম'),
  too_large: L('Too large', 'অনেক বেশি'),
  invalid_email: L('Enter a valid email', 'সঠিক ইমেইল দিন'),
  invalid_phone: L('Enter a valid Bangladeshi mobile number', 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন'),
  invalid_number: L('Enter a number', 'একটি সংখ্যা দিন'),
  invalid_choice: L('Choose one of the options', 'একটি অপশন বাছাই করুন'),
  invalid_date: L('Enter a valid date', 'সঠিক তারিখ দিন'),
  invalid_list: L('Invalid list', 'তালিকা সঠিক নয়'),
  invalid: L('Invalid value', 'মান সঠিক নয়'),
  underage: L('Minimum legal age is 18 for brides and 21 for grooms', 'আইনত ন্যূনতম বয়স পাত্রীর ১৮ ও পাত্রের ২১'),
  same_as_own: L('Guardian number cannot be your own number', 'অভিভাবকের নম্বর আপনার নিজের নম্বর হতে পারবে না'),
  range: L('"To" must be greater than "from"', '"পর্যন্ত" অবশ্যই "থেকে" এর চেয়ে বড় হতে হবে'),
  mismatch: L('Does not match the selection above', 'উপরের বাছাইয়ের সাথে মিলছে না'),
  wrong_password: L('Password is wrong', 'পাসওয়ার্ড ভুল'),
};

export const errorMessage = (code, lang = 'en') => (ERRORS[code] || ERRORS.INTERNAL)[lang === 'bn' ? 'bn' : 'en'];
export const fieldErrorMessage = (code, lang = 'en') =>
  (FIELD_ERRORS[code] || FIELD_ERRORS.invalid)[lang === 'bn' ? 'bn' : 'en'];
