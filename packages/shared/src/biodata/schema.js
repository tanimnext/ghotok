/**
 * The biodata definition — the single source of truth for every biodata field.
 *
 * It drives:
 *  - the Mongoose model (apps/api)           → buildMongooseDefinition()
 *  - input whitelisting and coercion (api)    → sanitizeBiodataInput()
 *  - submission rules (api + web)             → submissionProblems()
 *  - the 11-step form (web) and admin editor  → @ghotok/ui BiodataForm
 *  - public and admin read views              → @ghotok/ui BiodataView
 *
 * To add a field: add it here, run the tests, and it appears everywhere.
 *
 * Field properties
 *  key        storage key inside the section
 *  type       text | textarea | number | select | multiselect | yesno | date | height | entries
 *  label      { en, bn } or { groom: {en,bn}, bride: {en,bn} } for gendered wording
 *  options    name of a list in LISTS (select / multiselect)
 *  required   needed before the biodata can be submitted for review
 *  max        maxlength (text) or maximum (number); min for numbers
 *  showIf     (biodata) => boolean — field is ignored when false
 *  dependsOn  key of the field whose value filters this select (location cascades)
 *  private    never shown publicly (only owner, staff, and contacts that were unlocked)
 *  help       { en, bn } hint under the input
 */

const L = (en, bn) => ({ en, bn });
const G = (groom, bride) => ({ groom, bride });

const isMuslim = (b) => b?.general?.religion === 'muslim';
const isHindu = (b) => b?.general?.religion === 'hindu';
const isChristian = (b) => b?.general?.religion === 'christian';
const isBuddhist = (b) => b?.general?.religion === 'buddhist';
const isGroom = (b) => b?.type === 'groom';
const isBride = (b) => b?.type === 'bride';
const notFirstMarriage = (b) => Boolean(b?.general?.maritalStatus) && b.general.maritalStatus !== 'never_married';
const inBangladesh = (b) => !b?.address?.livesAbroad;
const abroad = (b) => Boolean(b?.address?.livesAbroad);

export const SECTIONS = [
  {
    key: 'general',
    title: L('General information', 'সাধারণ তথ্য'),
    step: L('General', 'সাধারণ'),
    fields: [
      {
        key: 'maritalStatus',
        type: 'select',
        options: 'marital',
        required: true,
        label: L('Marital status', 'বৈবাহিক অবস্থা'),
      },
      {
        key: 'dateOfBirth',
        type: 'date',
        required: true,
        private: true,
        label: L('Date of birth', 'জন্মতারিখ'),
        help: L('Only your age and birth month are shown publicly.', 'পাবলিকভাবে শুধু বয়স ও জন্মমাস দেখানো হয়।'),
      },
      { key: 'heightInches', type: 'height', required: true, min: 48, max: 90, label: L('Height', 'উচ্চতা') },
      { key: 'weightKg', type: 'number', min: 30, max: 200, unit: 'kg', label: L('Weight (kg)', 'ওজন (কেজি)') },
      { key: 'complexion', type: 'select', options: 'complexion', label: L('Complexion', 'গায়ের রং') },
      { key: 'bloodGroup', type: 'select', options: 'blood', label: L('Blood group', 'রক্তের গ্রুপ') },
      { key: 'religion', type: 'select', options: 'religion', required: true, label: L('Religion', 'ধর্ম') },
      { key: 'community', type: 'text', max: 80, label: L('Community / sect', 'সম্প্রদায় / গোত্র') },
      { key: 'nationality', type: 'text', max: 40, label: L('Nationality', 'জাতীয়তা') },
      {
        key: 'categories',
        type: 'multiselect',
        options: 'category',
        label: L('Special categories (optional)', 'বিশেষ ক্যাটাগরি (ঐচ্ছিক)'),
        help: L(
          'Select only if it applies. Families can search by these.',
          'প্রযোজ্য হলেই বাছাই করুন। পরিবারগুলো এগুলো দিয়ে খুঁজতে পারে।'
        ),
      },
    ],
  },
  {
    key: 'address',
    title: L('Address', 'ঠিকানা'),
    step: L('Address', 'ঠিকানা'),
    fields: [
      {
        key: 'permanentDivision',
        type: 'select',
        options: 'division',
        label: L('Permanent division', 'স্থায়ী বিভাগ'),
      },
      {
        key: 'permanentDistrict',
        type: 'select',
        options: 'district',
        dependsOn: 'permanentDivision',
        required: true,
        label: L('Permanent district', 'স্থায়ী জেলা'),
      },
      {
        key: 'permanentUpazila',
        type: 'select',
        options: 'upazila',
        dependsOn: 'permanentDistrict',
        label: L('Permanent upazila', 'স্থায়ী উপজেলা'),
      },
      { key: 'permanentArea', type: 'text', max: 120, label: L('Area / village name', 'এলাকা / গ্রামের নাম') },
      { key: 'livesAbroad', type: 'yesno', label: L('Do you live abroad?', 'আপনি কি প্রবাসে থাকেন?') },
      {
        key: 'presentCountry',
        type: 'select',
        options: 'country',
        showIf: abroad,
        required: true,
        label: L('Country you live in', 'যে দেশে থাকেন'),
      },
      {
        key: 'presentDivision',
        type: 'select',
        options: 'division',
        showIf: inBangladesh,
        label: L('Present division', 'বর্তমান বিভাগ'),
      },
      {
        key: 'presentDistrict',
        type: 'select',
        options: 'district',
        dependsOn: 'presentDivision',
        showIf: inBangladesh,
        required: true,
        label: L('Present district', 'বর্তমান জেলা'),
      },
      {
        key: 'presentUpazila',
        type: 'select',
        options: 'upazila',
        dependsOn: 'presentDistrict',
        showIf: inBangladesh,
        label: L('Present upazila', 'বর্তমান উপজেলা'),
      },
      { key: 'presentArea', type: 'text', max: 120, label: L('Present area / city', 'বর্তমান এলাকা / শহর') },
      { key: 'grewUpAt', type: 'textarea', max: 200, label: L('Where did you grow up?', 'কোথায় বড় হয়েছেন?') },
    ],
  },
  {
    key: 'education',
    title: L('Education', 'শিক্ষাগত যোগ্যতা'),
    step: L('Education', 'শিক্ষা'),
    fields: [
      {
        key: 'medium',
        type: 'select',
        options: 'medium',
        required: true,
        label: L('Education method', 'শিক্ষার মাধ্যম'),
      },
      {
        key: 'highestLevel',
        type: 'select',
        options: 'education',
        required: true,
        label: L('Highest education', 'সর্বোচ্চ শিক্ষাগত যোগ্যতা'),
      },
      {
        key: 'entries',
        type: 'entries',
        maxItems: 8,
        label: L('Education history', 'শিক্ষার বিবরণ'),
        itemFields: [
          { key: 'level', type: 'select', options: 'education', label: L('Level', 'স্তর') },
          { key: 'institution', type: 'text', max: 120, label: L('Institution', 'প্রতিষ্ঠান') },
          { key: 'subject', type: 'text', max: 120, label: L('Group / subject', 'বিভাগ / বিষয়') },
          { key: 'year', type: 'number', min: 1960, max: 2040, label: L('Passing year', 'পাসের সাল') },
          { key: 'result', type: 'text', max: 40, label: L('Result', 'ফলাফল') },
        ],
      },
      {
        key: 'religiousEducation',
        type: 'textarea',
        max: 300,
        label: L('Religious education (if any)', 'ধর্মীয় শিক্ষা (যদি থাকে)'),
      },
      {
        key: 'other',
        type: 'textarea',
        max: 500,
        label: L('Other education or training', 'অন্যান্য শিক্ষা বা প্রশিক্ষণ'),
      },
    ],
  },
  {
    key: 'family',
    title: L('Family information', 'পারিবারিক তথ্য'),
    step: L('Family', 'পরিবার'),
    fields: [
      { key: 'fatherAlive', type: 'yesno', label: L('Is your father alive?', 'বাবা কি জীবিত?') },
      { key: 'fatherOccupation', type: 'textarea', max: 300, label: L("Father's occupation", 'বাবার পেশা') },
      { key: 'motherAlive', type: 'yesno', label: L('Is your mother alive?', 'মা কি জীবিত?') },
      { key: 'motherOccupation', type: 'textarea', max: 300, label: L("Mother's occupation", 'মায়ের পেশা') },
      { key: 'brothers', type: 'number', min: 0, max: 20, label: L('Number of brothers', 'ভাইয়ের সংখ্যা') },
      { key: 'brothersInfo', type: 'textarea', max: 500, label: L('About your brothers', 'ভাইদের সম্পর্কে') },
      { key: 'sisters', type: 'number', min: 0, max: 20, label: L('Number of sisters', 'বোনের সংখ্যা') },
      { key: 'sistersInfo', type: 'textarea', max: 500, label: L('About your sisters', 'বোনদের সম্পর্কে') },
      { key: 'unclesOccupation', type: 'textarea', max: 300, label: L("Uncles' occupations", 'চাচা / মামাদের পেশা') },
      {
        key: 'economicStatus',
        type: 'select',
        options: 'economic',
        required: true,
        label: L('Family economic status', 'পারিবারিক আর্থিক অবস্থা'),
      },
      { key: 'houseType', type: 'textarea', max: 300, label: L('Type of house you live in', 'বর্তমান বাসস্থানের ধরন') },
      {
        key: 'assets',
        type: 'textarea',
        max: 500,
        label: L('Family land, business or other assets', 'পরিবারের জমি, ব্যবসা বা অন্যান্য সম্পদ'),
      },
      {
        key: 'religiousEnvironment',
        type: 'textarea',
        max: 500,
        label: L("Family's religious practice", 'পরিবারের ধর্মীয় পরিবেশ'),
      },
      {
        key: 'details',
        type: 'textarea',
        max: 1000,
        label: L('Anything else about your family', 'পরিবার সম্পর্কে আরও কিছু'),
      },
    ],
  },
  {
    key: 'personal',
    title: L('Personal information', 'ব্যক্তিগত তথ্য'),
    step: L('Personal', 'ব্যক্তিগত'),
    fields: [
      { key: 'about', type: 'textarea', max: 1500, label: L('About yourself', 'নিজের সম্পর্কে') },
      {
        key: 'clothing',
        type: 'textarea',
        max: 300,
        label: L('What do you usually wear outside?', 'বাইরে সাধারণত কী ধরনের পোশাক পরেন?'),
      },
      {
        key: 'hobbies',
        type: 'textarea',
        max: 800,
        label: L('Hobbies, likes, dislikes and dreams', 'শখ, পছন্দ-অপছন্দ ও স্বপ্ন'),
      },
      {
        key: 'healthNotes',
        type: 'textarea',
        max: 500,
        label: L('Any physical or mental health condition?', 'কোনো শারীরিক বা মানসিক অসুস্থতা আছে?'),
      },
      { key: 'smokes', type: 'yesno', label: L('Do you smoke?', 'ধূমপান করেন?') },
      { key: 'diet', type: 'text', max: 100, label: L('Diet', 'খাদ্যাভ্যাস') },
    ],
  },
  {
    key: 'faith',
    title: L('Religious practice', 'ধর্মীয় অনুশীলন'),
    step: L('Faith', 'ধর্ম'),
    fields: [
      {
        key: 'prayer',
        type: 'select',
        options: 'prayer',
        showIf: isMuslim,
        label: L('Do you pray five times a day?', 'পাঁচ ওয়াক্ত নামাজ পড়েন?'),
      },
      {
        key: 'islamicSchool',
        type: 'select',
        options: 'islamicSchool',
        showIf: isMuslim,
        label: L('Which madhhab do you follow?', 'কোন মাযহাব অনুসরণ করেন?'),
      },
      {
        key: 'recitesQuran',
        type: 'yesno',
        showIf: isMuslim,
        label: L('Can you recite the Quran correctly?', 'শুদ্ধভাবে কুরআন তিলাওয়াত করতে পারেন?'),
      },
      {
        key: 'followsMahram',
        type: 'yesno',
        showIf: isMuslim,
        label: L('Do you observe mahram / non-mahram?', 'মাহরাম / নন-মাহরাম মেনে চলেন?'),
      },
      {
        key: 'coverage',
        type: 'select',
        options: 'coverage',
        showIf: (b) => isMuslim(b) && isBride(b),
        label: L('Do you wear hijab or niqab?', 'হিজাব বা নিকাব পরেন?'),
      },
      {
        key: 'beard',
        type: 'yesno',
        showIf: (b) => isMuslim(b) && isGroom(b),
        label: L('Do you keep a beard?', 'দাড়ি রাখেন?'),
      },
      { key: 'gotra', type: 'text', max: 80, showIf: isHindu, label: L('Gotra', 'গোত্র') },
      {
        key: 'worship',
        type: 'textarea',
        max: 300,
        showIf: (b) => isHindu(b) || isBuddhist(b),
        label: L('Worship and religious practice', 'পূজা-অর্চনা ও ধর্মীয় অনুশীলন'),
      },
      {
        key: 'denomination',
        type: 'select',
        options: 'denomination',
        showIf: isChristian,
        label: L('Denomination', 'সম্প্রদায় (ডিনোমিনেশন)'),
      },
      {
        key: 'churchAttendance',
        type: 'yesno',
        showIf: isChristian,
        label: L('Do you attend church regularly?', 'নিয়মিত চার্চে যান?'),
      },
      {
        key: 'details',
        type: 'textarea',
        max: 800,
        label: L('Tell families about your religious life', 'আপনার ধর্মীয় জীবন সম্পর্কে লিখুন'),
      },
    ],
  },
  {
    key: 'occupation',
    title: L('Occupation', 'পেশা'),
    step: L('Occupation', 'পেশা'),
    fields: [
      { key: 'type', type: 'select', options: 'occupation', required: true, label: L('Profession', 'পেশা') },
      { key: 'title', type: 'text', max: 120, label: L('Job title / role', 'পদবি / কাজ') },
      { key: 'details', type: 'textarea', max: 500, label: L('Description of your work', 'পেশার বিস্তারিত বিবরণ') },
      { key: 'monthlyIncome', type: 'text', max: 60, label: L('Monthly income', 'মাসিক আয়') },
    ],
  },
  {
    key: 'marriage',
    title: L('Marriage related', 'বিয়ে সংক্রান্ত তথ্য'),
    step: L('Marriage', 'বিয়ে'),
    fields: [
      {
        key: 'guardiansAgree',
        type: 'yesno',
        required: true,
        label: L('Do your guardians agree to this marriage?', 'আপনার অভিভাবক কি এই বিয়েতে রাজি?'),
      },
      {
        key: 'previousMarriageInfo',
        type: 'textarea',
        max: 500,
        showIf: notFirstMarriage,
        label: L('About your previous marriage', 'আগের বিয়ে সম্পর্কে'),
      },
      {
        key: 'children',
        type: 'number',
        min: 0,
        max: 15,
        showIf: notFirstMarriage,
        label: L('Number of children', 'সন্তানের সংখ্যা'),
      },
      {
        key: 'studyAfterMarriage',
        type: 'select',
        options: 'yesNoMaybe',
        label: G(
          L('Will you allow your wife to study after marriage?', 'বিয়ের পর স্ত্রীকে পড়াশোনা করতে দেবেন?'),
          L('Do you want to continue studying after marriage?', 'বিয়ের পর পড়াশোনা চালিয়ে যেতে চান?')
        ),
      },
      {
        key: 'jobAfterMarriage',
        type: 'select',
        options: 'yesNoMaybe',
        label: G(
          L('Will you allow your wife to work after marriage?', 'বিয়ের পর স্ত্রীকে চাকরি করতে দেবেন?'),
          L('Do you want to work after marriage?', 'বিয়ের পর চাকরি করতে চান?')
        ),
      },
      {
        key: 'livingAfterMarriage',
        type: 'textarea',
        max: 300,
        label: G(
          L('Where will you live with your wife after marriage?', 'বিয়ের পর স্ত্রীকে নিয়ে কোথায় থাকবেন?'),
          L('Where would you like to live after marriage?', 'বিয়ের পর কোথায় থাকতে চান?')
        ),
      },
      {
        key: 'expectsDowry',
        type: 'yesno',
        showIf: isGroom,
        label: L(
          "Would you or your family expect any gift or dowry from the bride's family?",
          'আপনি বা আপনার পরিবার কি পাত্রীপক্ষের কাছে কোনো উপহার বা যৌতুক আশা করেন?'
        ),
      },
      { key: 'willingToRelocate', type: 'yesno', label: L('Willing to relocate?', 'অন্যত্র যেতে রাজি?') },
      {
        key: 'thoughts',
        type: 'textarea',
        max: 1000,
        label: L('Why are you getting married? Your thoughts on marriage', 'কেন বিয়ে করছেন? বিয়ে নিয়ে আপনার ভাবনা'),
      },
    ],
  },
  {
    key: 'expectation',
    title: L('Expected partner', 'প্রত্যাশিত জীবনসঙ্গী'),
    step: L('Expected partner', 'প্রত্যাশিত সঙ্গী'),
    fields: [
      { key: 'ageMin', type: 'number', min: 18, max: 80, label: L('Age from', 'বয়স থেকে') },
      { key: 'ageMax', type: 'number', min: 18, max: 80, label: L('Age to', 'বয়স পর্যন্ত') },
      { key: 'heightMin', type: 'height', min: 48, max: 90, label: L('Height from', 'উচ্চতা থেকে') },
      { key: 'heightMax', type: 'height', min: 48, max: 90, label: L('Height to', 'উচ্চতা পর্যন্ত') },
      { key: 'religions', type: 'multiselect', options: 'religion', label: L('Religion', 'ধর্ম') },
      { key: 'maritalStatuses', type: 'multiselect', options: 'marital', label: L('Marital status', 'বৈবাহিক অবস্থা') },
      { key: 'complexions', type: 'multiselect', options: 'complexion', label: L('Complexion', 'গায়ের রং') },
      { key: 'educationMin', type: 'select', options: 'education', label: L('Minimum education', 'ন্যূনতম শিক্ষা') },
      { key: 'occupations', type: 'multiselect', options: 'occupation', label: L('Profession', 'পেশা') },
      { key: 'districts', type: 'multiselect', options: 'district', label: L('District', 'জেলা') },
      {
        key: 'economicStatuses',
        type: 'multiselect',
        options: 'economic',
        label: L('Family economic status', 'পারিবারিক আর্থিক অবস্থা'),
      },
      {
        key: 'qualities',
        type: 'textarea',
        max: 1000,
        label: L('Qualities you are looking for', 'যে গুণগুলো খুঁজছেন'),
      },
    ],
  },
  {
    key: 'contact',
    private: true,
    title: L('Contact information', 'যোগাযোগের তথ্য'),
    step: L('Contact', 'যোগাযোগ'),
    help: L(
      'This section is private. It is shown only to families who unlock your biodata with a connection, or whose proposal you accept.',
      'এই অংশটি গোপন। শুধু যারা কানেকশন দিয়ে আনলক করবেন অথবা যাদের প্রস্তাব আপনি গ্রহণ করবেন, তারাই দেখবেন।'
    ),
    fields: [
      {
        key: 'candidateName',
        type: 'text',
        max: 80,
        label: G(L("Groom's full name", 'পাত্রের পূর্ণ নাম'), L("Bride's full name", 'পাত্রীর পূর্ণ নাম')),
      },
      { key: 'guardianName', type: 'text', max: 80, required: true, label: L("Guardian's name", 'অভিভাবকের নাম') },
      {
        key: 'guardianRelation',
        type: 'select',
        options: 'relation',
        required: true,
        label: L('Relationship with guardian', 'অভিভাবকের সাথে সম্পর্ক'),
      },
      {
        key: 'guardianPhone',
        type: 'phone',
        required: true,
        label: L("Guardian's mobile number", 'অভিভাবকের মোবাইল নম্বর'),
        help: L('Must be a guardian’s number, not your own.', 'অভিভাবকের নম্বর দিন, নিজের নয়।'),
      },
      { key: 'guardianPhone2', type: 'phone', label: L('Another guardian number', 'অভিভাবকের আরেকটি নম্বর') },
      { key: 'email', type: 'email', max: 120, label: L('Email to receive biodatas', 'বায়োডাটা পাওয়ার জন্য ইমেইল') },
    ],
  },
  {
    key: 'pledge',
    private: true,
    title: L('Pledge', 'অঙ্গীকার'),
    step: L('Pledge', 'অঙ্গীকার'),
    fields: [
      {
        key: 'guardiansKnow',
        type: 'check',
        required: true,
        label: L(
          'My guardians know I am submitting this biodata to Ghotok.',
          'আমার অভিভাবক জানেন যে আমি ঘটকে বায়োডাটা জমা দিচ্ছি।'
        ),
      },
      {
        key: 'truthful',
        type: 'check',
        required: true,
        label: L('All information I gave is true.', 'আমার দেওয়া সব তথ্য সত্য।'),
      },
      {
        key: 'acceptsTerms',
        type: 'check',
        required: true,
        label: L(
          'If I give false information, Ghotok is not responsible, and my biodata may be removed. I accept the terms and privacy policy.',
          'মিথ্যা তথ্য দিলে ঘটক দায়ী থাকবে না এবং আমার বায়োডাটা সরিয়ে দেওয়া হতে পারে। আমি শর্তাবলী ও গোপনীয়তা নীতি মেনে নিচ্ছি।'
        ),
      },
    ],
  },
];

/** Form steps in order. "photo" is a non-data step handled by the UI. */
export const FORM_STEPS = [
  'general',
  'address',
  'education',
  'family',
  'personal',
  'faith',
  'occupation',
  'marriage',
  'expectation',
  'contact',
  'photo',
  'pledge',
];

export const SECTION_KEYS = SECTIONS.map((s) => s.key);
export const sectionByKey = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));

/** Resolve a label that may be gendered. */
export function fieldLabel(field, lang = 'en', type) {
  const l = field.label || {};
  if (l.groom || l.bride) return (l[type] || l.groom || l.bride)[lang];
  return l[lang] || l.en || field.key;
}

/** Is this field active for this biodata (its showIf passes)? */
export const isActive = (field, biodata) => (field.showIf ? Boolean(field.showIf(biodata || {})) : true);
