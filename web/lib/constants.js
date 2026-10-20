// Shared option lists (copy of server/src/constants.js — keep in sync).

const opt = (value, en, bn) => ({ value, en, bn });

export const BIODATA_TYPES = [opt('groom', 'Groom', 'পাত্র'), opt('bride', 'Bride', 'পাত্রী')];

export const MARITAL_STATUS = [
  opt('never_married', 'Never married', 'অবিবাহিত'),
  opt('divorced', 'Divorced', 'ডিভোর্সড'),
  opt('widowed', 'Widowed', 'বিধবা/বিপত্নীক'),
  opt('separated', 'Separated', 'আলাদা থাকেন'),
];

export const RELIGIONS = [
  opt('hindu', 'Hindu', 'হিন্দু'),
  opt('muslim', 'Muslim', 'মুসলিম'),
  opt('christian', 'Christian', 'খ্রিস্টান'),
  opt('buddhist', 'Buddhist', 'বৌদ্ধ'),
  opt('other', 'Other', 'অন্যান্য'),
];

export const COMPLEXIONS = [
  opt('very_fair', 'Very fair', 'উজ্জ্বল ফর্সা'),
  opt('fair', 'Fair', 'ফর্সা'),
  opt('wheatish', 'Wheatish', 'উজ্জ্বল শ্যামলা'),
  opt('wheatish_dark', 'Wheatish dark', 'শ্যামলা'),
  opt('dark', 'Dark', 'কালো'),
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => opt(b, b, b));

export const EDUCATION_MEDIUM = [
  opt('general', 'General (Bangla medium)', 'জেনারেল (বাংলা মাধ্যম)'),
  opt('english', 'English medium', 'ইংরেজি মাধ্যম'),
  opt('madrasa', 'Madrasa', 'মাদ্রাসা'),
  opt('technical', 'Technical / vocational', 'কারিগরি'),
];

export const EDUCATION_LEVELS = [
  opt('below_ssc', 'Below SSC', 'এসএসসির নিচে'),
  opt('ssc', 'SSC / O level / Dakhil', 'এসএসসি / ও লেভেল / দাখিল'),
  opt('hsc', 'HSC / A level / Alim', 'এইচএসসি / এ লেভেল / আলিম'),
  opt('diploma', 'Diploma', 'ডিপ্লোমা'),
  opt('bachelor', 'Bachelor / Honours / Fazil', 'স্নাতক / অনার্স / ফাজিল'),
  opt('masters', 'Masters / Kamil', 'স্নাতকোত্তর / কামিল'),
  opt('mbbs', 'MBBS / BDS', 'এমবিবিএস / বিডিএস'),
  opt('phd', 'PhD', 'পিএইচডি'),
];

export const OCCUPATIONS = [
  opt('student', 'Student', 'শিক্ষার্থী'),
  opt('govt_job', 'Government job', 'সরকারি চাকরি'),
  opt('private_job', 'Private job', 'বেসরকারি চাকরি'),
  opt('business', 'Business', 'ব্যবসা'),
  opt('doctor', 'Doctor', 'ডাক্তার'),
  opt('engineer', 'Engineer', 'ইঞ্জিনিয়ার'),
  opt('teacher', 'Teacher', 'শিক্ষক'),
  opt('lawyer', 'Lawyer', 'আইনজীবী'),
  opt('freelancer', 'Freelancer', 'ফ্রিল্যান্সার'),
  opt('expatriate', 'Expatriate', 'প্রবাসী'),
  opt('homemaker', 'Homemaker', 'গৃহিণী'),
  opt('not_working', 'Not working', 'কর্মরত নন'),
  opt('other', 'Other', 'অন্যান্য'),
];

export const ECONOMIC_STATUS = [
  opt('lower', 'Lower class', 'নিম্নবিত্ত'),
  opt('lower_middle', 'Lower middle class', 'নিম্ন মধ্যবিত্ত'),
  opt('middle', 'Middle class', 'মধ্যবিত্ত'),
  opt('upper_middle', 'Upper middle class', 'উচ্চ মধ্যবিত্ত'),
  opt('upper', 'Upper class', 'উচ্চবিত্ত'),
];

export const GUARDIAN_RELATIONS = [
  opt('father', 'Father', 'বাবা'),
  opt('mother', 'Mother', 'মা'),
  opt('brother', 'Brother', 'ভাই'),
  opt('sister', 'Sister', 'বোন'),
  opt('uncle', 'Uncle', 'চাচা/মামা'),
  opt('aunt', 'Aunt', 'চাচী/খালা/ফুফু'),
  opt('other', 'Other', 'অন্যান্য'),
];

export const PAYMENT_METHODS = [opt('bkash', 'bKash', 'বিকাশ'), opt('nagad', 'Nagad', 'নগদ'), opt('rocket', 'Rocket', 'রকেট')];

export const REPORT_REASONS = [
  opt('fake_info', 'Fake or wrong information', 'ভুয়া বা ভুল তথ্য'),
  opt('no_response', 'Guardian does not respond', 'অভিভাবক সাড়া দেন না'),
  opt('wrong_number', 'Wrong or unreachable number', 'ভুল বা বন্ধ নম্বর'),
  opt('already_married', 'Already married', 'ইতিমধ্যে বিবাহিত'),
  opt('inappropriate', 'Inappropriate behaviour', 'অনুচিত আচরণ'),
  opt('money_request', 'Asked for money', 'টাকা চেয়েছে'),
  opt('other', 'Other', 'অন্যান্য'),
];

export const HIDE_REASONS = [
  opt('talks_ongoing', 'Marriage talks are ongoing', 'বিয়ের কথাবার্তা চলছে'),
  opt('break', 'Taking a break', 'কিছুদিন বিরতি'),
  opt('privacy', 'Privacy reasons', 'গোপনীয়তার কারণে'),
  opt('other', 'Other', 'অন্যান্য'),
];

export const DELETE_REASONS = [
  opt('married_here', 'Got married through Ghotok', 'ঘটকের মাধ্যমে বিয়ে হয়েছে'),
  opt('married_elsewhere', 'Got married elsewhere', 'অন্যভাবে বিয়ে হয়েছে'),
  opt('not_interested', 'No longer interested', 'আর আগ্রহী নই'),
  opt('privacy', 'Privacy concerns', 'গোপনীয়তার উদ্বেগ'),
  opt('other', 'Other', 'অন্যান্য'),
];

export const DIVISIONS = [
  { value: 'dhaka', en: 'Dhaka', bn: 'ঢাকা', districts: [
    ['dhaka', 'Dhaka', 'ঢাকা'], ['gazipur', 'Gazipur', 'গাজীপুর'], ['narayanganj', 'Narayanganj', 'নারায়ণগঞ্জ'],
    ['narsingdi', 'Narsingdi', 'নরসিংদী'], ['manikganj', 'Manikganj', 'মানিকগঞ্জ'], ['munshiganj', 'Munshiganj', 'মুন্সিগঞ্জ'],
    ['tangail', 'Tangail', 'টাঙ্গাইল'], ['kishoreganj', 'Kishoreganj', 'কিশোরগঞ্জ'], ['faridpur', 'Faridpur', 'ফরিদপুর'],
    ['gopalganj', 'Gopalganj', 'গোপালগঞ্জ'], ['madaripur', 'Madaripur', 'মাদারীপুর'], ['rajbari', 'Rajbari', 'রাজবাড়ী'],
    ['shariatpur', 'Shariatpur', 'শরীয়তপুর'],
  ] },
  { value: 'chattogram', en: 'Chattogram', bn: 'চট্টগ্রাম', districts: [
    ['chattogram', 'Chattogram', 'চট্টগ্রাম'], ['coxsbazar', "Cox's Bazar", 'কক্সবাজার'], ['cumilla', 'Cumilla', 'কুমিল্লা'],
    ['feni', 'Feni', 'ফেনী'], ['noakhali', 'Noakhali', 'নোয়াখালী'], ['lakshmipur', 'Lakshmipur', 'লক্ষ্মীপুর'],
    ['chandpur', 'Chandpur', 'চাঁদপুর'], ['brahmanbaria', 'Brahmanbaria', 'ব্রাহ্মণবাড়িয়া'], ['rangamati', 'Rangamati', 'রাঙ্গামাটি'],
    ['khagrachhari', 'Khagrachhari', 'খাগড়াছড়ি'], ['bandarban', 'Bandarban', 'বান্দরবান'],
  ] },
  { value: 'rajshahi', en: 'Rajshahi', bn: 'রাজশাহী', districts: [
    ['rajshahi', 'Rajshahi', 'রাজশাহী'], ['bogura', 'Bogura', 'বগুড়া'], ['pabna', 'Pabna', 'পাবনা'],
    ['sirajganj', 'Sirajganj', 'সিরাজগঞ্জ'], ['naogaon', 'Naogaon', 'নওগাঁ'], ['natore', 'Natore', 'নাটোর'],
    ['chapainawabganj', 'Chapai Nawabganj', 'চাঁপাইনবাবগঞ্জ'], ['joypurhat', 'Joypurhat', 'জয়পুরহাট'],
  ] },
  { value: 'khulna', en: 'Khulna', bn: 'খুলনা', districts: [
    ['khulna', 'Khulna', 'খুলনা'], ['jashore', 'Jashore', 'যশোর'], ['satkhira', 'Satkhira', 'সাতক্ষীরা'],
    ['bagerhat', 'Bagerhat', 'বাগেরহাট'], ['kushtia', 'Kushtia', 'কুষ্টিয়া'], ['jhenaidah', 'Jhenaidah', 'ঝিনাইদহ'],
    ['magura', 'Magura', 'মাগুরা'], ['narail', 'Narail', 'নড়াইল'], ['chuadanga', 'Chuadanga', 'চুয়াডাঙ্গা'],
    ['meherpur', 'Meherpur', 'মেহেরপুর'],
  ] },
  { value: 'barishal', en: 'Barishal', bn: 'বরিশাল', districts: [
    ['barishal', 'Barishal', 'বরিশাল'], ['patuakhali', 'Patuakhali', 'পটুয়াখালী'], ['bhola', 'Bhola', 'ভোলা'],
    ['pirojpur', 'Pirojpur', 'পিরোজপুর'], ['barguna', 'Barguna', 'বরগুনা'], ['jhalokati', 'Jhalokati', 'ঝালকাঠি'],
  ] },
  { value: 'sylhet', en: 'Sylhet', bn: 'সিলেট', districts: [
    ['sylhet', 'Sylhet', 'সিলেট'], ['moulvibazar', 'Moulvibazar', 'মৌলভীবাজার'], ['habiganj', 'Habiganj', 'হবিগঞ্জ'],
    ['sunamganj', 'Sunamganj', 'সুনামগঞ্জ'],
  ] },
  { value: 'rangpur', en: 'Rangpur', bn: 'রংপুর', districts: [
    ['rangpur', 'Rangpur', 'রংপুর'], ['dinajpur', 'Dinajpur', 'দিনাজপুর'], ['kurigram', 'Kurigram', 'কুড়িগ্রাম'],
    ['gaibandha', 'Gaibandha', 'গাইবান্ধা'], ['nilphamari', 'Nilphamari', 'নীলফামারী'], ['lalmonirhat', 'Lalmonirhat', 'লালমনিরহাট'],
    ['thakurgaon', 'Thakurgaon', 'ঠাকুরগাঁও'], ['panchagarh', 'Panchagarh', 'পঞ্চগড়'],
  ] },
  { value: 'mymensingh', en: 'Mymensingh', bn: 'ময়মনসিংহ', districts: [
    ['mymensingh', 'Mymensingh', 'ময়মনসিংহ'], ['jamalpur', 'Jamalpur', 'জামালপুর'], ['netrokona', 'Netrokona', 'নেত্রকোনা'],
    ['sherpur', 'Sherpur', 'শেরপুর'],
  ] },
].map((d) => ({ ...d, districts: d.districts.map(([value, en, bn]) => ({ value, en, bn })) }));

export const DISTRICTS = DIVISIONS.flatMap((d) => d.districts.map((x) => ({ ...x, division: d.value })));

export const values = (list) => list.map((o) => o.value);

export const ROLES = ['user', 'support', 'admin', 'superadmin'];
// support = reviewer/support desk; admin = support + payments; superadmin = everything incl. roles
export const STAFF_ROLES = ['support', 'admin', 'superadmin'];
