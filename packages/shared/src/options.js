/**
 * Option lists used across the API, website and admin panel.
 * Every option has a stable `value` (stored in the database) and English/Bangla labels.
 * Never rename a `value` once data exists — add a new one and migrate instead.
 */
import { DIVISIONS as GEO } from './generated/locations.js';

/** @typedef {{ value: string, en: string, bn: string }} Option */

const o = (value, en, bn) => ({ value, en, bn });

export const BIODATA_TYPES = [o('groom', 'Groom', 'পাত্র'), o('bride', 'Bride', 'পাত্রী')];

export const GENDERS = [o('male', 'Male', 'পুরুষ'), o('female', 'Female', 'নারী')];

export const MARITAL_STATUS = [
  o('never_married', 'Never married', 'অবিবাহিত'),
  o('married', 'Married', 'বিবাহিত'),
  o('divorced', 'Divorced', 'ডিভোর্সড'),
  o('widowed', 'Widow / Widower', 'বিধবা / বিপত্নীক'),
  o('separated', 'Separated', 'আলাদা থাকেন'),
];

/** Gender-aware label for "widowed": widow for brides, widower for grooms. */
export const WIDOWED_LABEL = { groom: o('widowed', 'Widower', 'বিপত্নীক'), bride: o('widowed', 'Widow', 'বিধবা') };

export const RELIGIONS = [
  o('hindu', 'Hindu', 'হিন্দু'),
  o('muslim', 'Muslim', 'মুসলিম'),
  o('christian', 'Christian', 'খ্রিস্টান'),
  o('buddhist', 'Buddhist', 'বৌদ্ধ'),
  o('other', 'Other', 'অন্যান্য'),
];

export const COMPLEXIONS = [
  o('very_fair', 'Very fair', 'উজ্জ্বল ফর্সা'),
  o('fair', 'Fair', 'ফর্সা'),
  o('wheatish', 'Wheatish', 'উজ্জ্বল শ্যামলা'),
  o('wheatish_dark', 'Wheatish dark', 'শ্যামলা'),
  o('dark', 'Dark', 'কালো'),
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => o(b, b, b));

export const EDUCATION_MEDIUM = [
  o('general', 'General (Bangla medium)', 'জেনারেল (বাংলা মাধ্যম)'),
  o('english', 'English medium', 'ইংরেজি মাধ্যম'),
  o('english_version', 'English version', 'ইংলিশ ভার্সন'),
  o('madrasa_alia', 'Alia madrasa', 'আলিয়া মাদ্রাসা'),
  o('madrasa_qawmi', 'Qawmi madrasa', 'কওমি মাদ্রাসা'),
  o('technical', 'Technical / vocational', 'কারিগরি'),
];

/** Ordered from lowest to highest — search uses this order for "minimum education". */
export const EDUCATION_LEVELS = [
  o('below_ssc', 'Below SSC', 'এসএসসির নিচে'),
  o('ssc', 'SSC / O level / Dakhil', 'এসএসসি / ও লেভেল / দাখিল'),
  o('hsc', 'HSC / A level / Alim', 'এইচএসসি / এ লেভেল / আলিম'),
  o('diploma', 'Diploma', 'ডিপ্লোমা'),
  o('bachelor', 'Bachelor / Honours / Fazil', 'স্নাতক / অনার্স / ফাজিল'),
  o('masters', 'Masters / Kamil', 'স্নাতকোত্তর / কামিল'),
  o('mbbs', 'MBBS / BDS', 'এমবিবিএস / বিডিএস'),
  o('phd', 'PhD', 'পিএইচডি'),
];

export const OCCUPATIONS = [
  o('student', 'Student', 'শিক্ষার্থী'),
  o('medical_student', 'MBBS / BDS student', 'এমবিবিএস / বিডিএস শিক্ষার্থী'),
  o('govt_job', 'Government job', 'সরকারি চাকরি'),
  o('private_job', 'Private job', 'বেসরকারি চাকরি'),
  o('business', 'Business', 'ব্যবসা'),
  o('doctor', 'Doctor', 'ডাক্তার'),
  o('engineer', 'Engineer', 'ইঞ্জিনিয়ার'),
  o('teacher', 'Teacher', 'শিক্ষক'),
  o('religious_teacher', 'Religious teacher / clergy', 'ধর্মীয় শিক্ষক / ধর্মগুরু'),
  o('lawyer', 'Lawyer', 'আইনজীবী'),
  o('freelancer', 'Freelancer', 'ফ্রিল্যান্সার'),
  o('expatriate', 'Expatriate', 'প্রবাসী'),
  o('homemaker', 'Homemaker', 'গৃহিণী'),
  o('not_working', 'Not working', 'কর্মরত নন'),
  o('other', 'Other', 'অন্যান্য'),
];

export const ECONOMIC_STATUS = [
  o('lower', 'Lower class', 'নিম্নবিত্ত'),
  o('lower_middle', 'Lower middle class', 'নিম্ন মধ্যবিত্ত'),
  o('middle', 'Middle class', 'মধ্যবিত্ত'),
  o('upper_middle', 'Upper middle class', 'উচ্চ মধ্যবিত্ত'),
  o('upper', 'Upper class', 'উচ্চবিত্ত'),
];

/** Special categories families can filter on. Shown publicly only if the owner selects them. */
export const CATEGORIES = [
  o('disability', 'Person with disability', 'প্রতিবন্ধী'),
  o('infertile', 'Infertile', 'সন্তান ধারণে অক্ষম'),
  o('orphan', 'Orphan', 'এতিম'),
  o('converted', 'Converted to current religion', 'ধর্মান্তরিত'),
];

export const GUARDIAN_RELATIONS = [
  o('father', 'Father', 'বাবা'),
  o('mother', 'Mother', 'মা'),
  o('brother', 'Brother', 'ভাই'),
  o('sister', 'Sister', 'বোন'),
  o('uncle', 'Uncle', 'চাচা / মামা'),
  o('aunt', 'Aunt', 'চাচী / খালা / ফুফু'),
  o('grandparent', 'Grandparent', 'দাদা / দাদি / নানা / নানি'),
  o('other', 'Other', 'অন্যান্য'),
];

export const YES_NO_MAYBE = [
  o('yes', 'Yes', 'হ্যাঁ'),
  o('no', 'No', 'না'),
  o('discuss', 'Open to discuss', 'আলোচনা সাপেক্ষে'),
];

export const PRAYER_FREQUENCY = [
  o('always', 'Regularly, every day', 'নিয়মিত, প্রতিদিন'),
  o('mostly', 'Most of the time', 'বেশিরভাগ সময়'),
  o('sometimes', 'Sometimes', 'মাঝে মাঝে'),
  o('rarely', 'Rarely', 'কদাচিৎ'),
];

export const ISLAMIC_SCHOOLS = [
  o('hanafi', 'Hanafi', 'হানাফি'),
  o('maliki', 'Maliki', 'মালিকি'),
  o('shafii', "Shafi'i", 'শাফেয়ী'),
  o('hanbali', 'Hanbali', 'হাম্বলি'),
  o('ahle_hadis', 'Ahle Hadis / Salafi', 'আহলে হাদিস / সালাফি'),
  o('other', 'Other', 'অন্যান্য'),
];

export const COVERAGE = [o('niqab', 'Niqab', 'নিকাব'), o('hijab', 'Hijab', 'হিজাব'), o('none', 'No', 'না')];

export const CHRISTIAN_DENOMINATIONS = [
  o('catholic', 'Catholic', 'ক্যাথলিক'),
  o('protestant', 'Protestant', 'প্রোটেস্ট্যান্ট'),
  o('baptist', 'Baptist', 'ব্যাপটিস্ট'),
  o('other', 'Other', 'অন্যান্য'),
];

export const PAYMENT_METHODS = [
  o('bkash', 'bKash', 'বিকাশ'),
  o('nagad', 'Nagad', 'নগদ'),
  o('rocket', 'Rocket', 'রকেট'),
];

export const REPORT_REASONS = [
  o('fake_info', 'Fake or wrong information', 'ভুয়া বা ভুল তথ্য'),
  o('no_response', 'Guardian does not respond', 'অভিভাবক সাড়া দেন না'),
  o('wrong_number', 'Wrong or unreachable number', 'ভুল বা বন্ধ নম্বর'),
  o('already_married', 'Already married', 'ইতিমধ্যে বিবাহিত'),
  o('inappropriate', 'Inappropriate behaviour', 'অনুচিত আচরণ'),
  o('money_request', 'Asked for money', 'টাকা চেয়েছে'),
  o('minor', 'The person may be under age', 'ব্যক্তির বয়স কম হতে পারে'),
  o('other', 'Other', 'অন্যান্য'),
];

export const HIDE_REASONS = [
  o('talks_ongoing', 'Marriage talks are ongoing', 'বিয়ের কথাবার্তা চলছে'),
  o('break', 'Taking a break', 'কিছুদিন বিরতি'),
  o('privacy', 'Privacy reasons', 'গোপনীয়তার কারণে'),
  o('other', 'Other', 'অন্যান্য'),
];

export const DELETE_REASONS = [
  o('married_here', 'Got married through Ghotok', 'ঘটকের মাধ্যমে বিয়ে হয়েছে'),
  o('married_elsewhere', 'Got married elsewhere', 'অন্যভাবে বিয়ে হয়েছে'),
  o('not_interested', 'No longer interested', 'আর আগ্রহী নই'),
  o('privacy', 'Privacy concerns', 'গোপনীয়তার উদ্বেগ'),
  o('other', 'Other', 'অন্যান্য'),
];

export const TICKET_CATEGORIES = [
  o('account', 'Account', 'অ্যাকাউন্ট'),
  o('biodata', 'Biodata', 'বায়োডাটা'),
  o('payment', 'Payment', 'পেমেন্ট'),
  o('report', 'Report', 'রিপোর্ট'),
  o('other', 'Other', 'অন্যান্য'),
];

/** Countries Bangladeshis most often live in, plus "other". */
export const COUNTRIES = [
  o('bangladesh', 'Bangladesh', 'বাংলাদেশ'),
  o('saudi_arabia', 'Saudi Arabia', 'সৌদি আরব'),
  o('uae', 'United Arab Emirates', 'সংযুক্ত আরব আমিরাত'),
  o('qatar', 'Qatar', 'কাতার'),
  o('kuwait', 'Kuwait', 'কুয়েত'),
  o('oman', 'Oman', 'ওমান'),
  o('bahrain', 'Bahrain', 'বাহরাইন'),
  o('malaysia', 'Malaysia', 'মালয়েশিয়া'),
  o('singapore', 'Singapore', 'সিঙ্গাপুর'),
  o('japan', 'Japan', 'জাপান'),
  o('south_korea', 'South Korea', 'দক্ষিণ কোরিয়া'),
  o('india', 'India', 'ভারত'),
  o('united_kingdom', 'United Kingdom', 'যুক্তরাজ্য'),
  o('ireland', 'Ireland', 'আয়ারল্যান্ড'),
  o('italy', 'Italy', 'ইতালি'),
  o('germany', 'Germany', 'জার্মানি'),
  o('france', 'France', 'ফ্রান্স'),
  o('portugal', 'Portugal', 'পর্তুগাল'),
  o('usa', 'United States', 'যুক্তরাষ্ট্র'),
  o('canada', 'Canada', 'কানাডা'),
  o('australia', 'Australia', 'অস্ট্রেলিয়া'),
  o('new_zealand', 'New Zealand', 'নিউজিল্যান্ড'),
  o('other', 'Other country', 'অন্য দেশ'),
];

// ---------- Locations ----------
export const DIVISIONS = GEO;
export const DISTRICTS = GEO.flatMap((d) => d.districts.map(({ upazilas, ...x }) => ({ ...x, division: d.value })));
export const UPAZILAS = GEO.flatMap((d) =>
  d.districts.flatMap((x) => x.upazilas.map((u) => ({ ...u, district: x.value, division: d.value })))
);
export const districtsOf = (division) =>
  division ? GEO.find((d) => d.value === division)?.districts.map(({ upazilas, ...x }) => x) || [] : DISTRICTS;
export const upazilasOf = (district) => UPAZILAS.filter((u) => u.district === district);
export const divisionOfDistrict = (district) => DISTRICTS.find((d) => d.value === district)?.division;
export const districtOfUpazila = (upazila) => UPAZILAS.find((u) => u.value === upazila)?.district;

// ---------- Roles ----------
export const ROLES = ['user', 'support', 'admin', 'superadmin'];
export const ROLE_RANK = { user: 0, support: 1, admin: 2, superadmin: 3 };
export const hasRole = (role, min) => (ROLE_RANK[role] ?? 0) >= ROLE_RANK[min];

/** All named lists, for lookups like `label('religion', 'hindu', 'bn')`. */
export const LISTS = {
  type: BIODATA_TYPES,
  gender: GENDERS,
  marital: MARITAL_STATUS,
  religion: RELIGIONS,
  complexion: COMPLEXIONS,
  blood: BLOOD_GROUPS,
  medium: EDUCATION_MEDIUM,
  education: EDUCATION_LEVELS,
  occupation: OCCUPATIONS,
  economic: ECONOMIC_STATUS,
  category: CATEGORIES,
  relation: GUARDIAN_RELATIONS,
  yesNoMaybe: YES_NO_MAYBE,
  prayer: PRAYER_FREQUENCY,
  islamicSchool: ISLAMIC_SCHOOLS,
  coverage: COVERAGE,
  denomination: CHRISTIAN_DENOMINATIONS,
  method: PAYMENT_METHODS,
  report: REPORT_REASONS,
  hide: HIDE_REASONS,
  delete: DELETE_REASONS,
  ticketCategory: TICKET_CATEGORIES,
  country: COUNTRIES,
  division: GEO,
  district: DISTRICTS,
  upazila: UPAZILAS,
};

export const values = (list) => list.map((x) => x.value);
