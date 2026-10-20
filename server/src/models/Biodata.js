import mongoose from 'mongoose';
import {
  BIODATA_TYPES, MARITAL_STATUS, RELIGIONS, COMPLEXIONS, BLOOD_GROUPS, EDUCATION_MEDIUM, EDUCATION_LEVELS,
  OCCUPATIONS, ECONOMIC_STATUS, GUARDIAN_RELATIONS, DISTRICTS, DIVISIONS, values,
} from '../constants.js';

const { Schema } = mongoose;
const en = (list) => ({ type: String, enum: [...values(list), null, ''] });
const enArr = (list) => ({ type: [{ type: String, enum: values(list) }], default: undefined });

export const BIODATA_STATUS = ['draft', 'pending', 'approved', 'rejected', 'changes_requested'];

const educationEntry = new Schema(
  { level: en(EDUCATION_LEVELS), institution: String, subject: String, year: Number, result: String },
  { _id: false }
);

const biodataSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    biodataNo: { type: Number, unique: true, sparse: true },
    type: { type: String, enum: values(BIODATA_TYPES), required: true },

    status: { type: String, enum: BIODATA_STATUS, default: 'draft', index: true },
    reviewNote: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    submittedAt: Date,
    approvedAt: Date,

    hidden: { type: Boolean, default: false },
    hiddenReason: String,

    deletedAt: { type: Date, default: null, index: true },
    deleteReason: String,
    deleteNote: String,
    recovery: {
      status: { type: String, enum: ['none', 'pending', 'approved', 'declined'], default: 'none' },
      note: String,
      requestedAt: Date,
      decidedAt: Date,
      decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    nid: {
      fileKey: String,
      status: { type: String, enum: ['none', 'submitted', 'verified', 'rejected'], default: 'none' },
      note: String,
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: Date,
    },
    photoKey: String,

    general: {
      maritalStatus: en(MARITAL_STATUS),
      dateOfBirth: Date,
      heightInches: { type: Number, min: 48, max: 90 },
      weightKg: { type: Number, min: 30, max: 200 },
      complexion: en(COMPLEXIONS),
      bloodGroup: en(BLOOD_GROUPS),
      religion: en(RELIGIONS),
      community: { type: String, maxlength: 80 },
      nationality: { type: String, default: 'Bangladeshi', maxlength: 40 },
    },
    address: {
      permanentDivision: { type: String, enum: [...values(DIVISIONS), null, ''] },
      permanentDistrict: { type: String, enum: [...values(DISTRICTS), null, ''] },
      permanentArea: { type: String, maxlength: 120 },
      presentDivision: { type: String, enum: [...values(DIVISIONS), null, ''] },
      presentDistrict: { type: String, enum: [...values(DISTRICTS), null, ''] },
      presentArea: { type: String, maxlength: 120 },
      livesAbroad: Boolean,
      presentCountry: { type: String, maxlength: 60 },
      grewUpAt: { type: String, maxlength: 200 },
    },
    education: {
      medium: en(EDUCATION_MEDIUM),
      highestLevel: en(EDUCATION_LEVELS),
      entries: { type: [educationEntry], default: [] },
      other: { type: String, maxlength: 500 },
    },
    family: {
      fatherAlive: Boolean,
      fatherOccupation: { type: String, maxlength: 200 },
      motherAlive: Boolean,
      motherOccupation: { type: String, maxlength: 200 },
      brothers: { type: Number, min: 0, max: 20 },
      brothersInfo: { type: String, maxlength: 500 },
      sisters: { type: Number, min: 0, max: 20 },
      sistersInfo: { type: String, maxlength: 500 },
      economicStatus: en(ECONOMIC_STATUS),
      details: { type: String, maxlength: 1000 },
    },
    personal: {
      about: { type: String, maxlength: 1500 },
      hobbies: { type: String, maxlength: 500 },
      religiousPractice: { type: String, maxlength: 500 },
      healthNotes: { type: String, maxlength: 500 },
      smokes: Boolean,
      diet: { type: String, maxlength: 100 },
    },
    occupation: {
      type: en(OCCUPATIONS),
      title: { type: String, maxlength: 120 },
      details: { type: String, maxlength: 500 },
      monthlyIncome: { type: String, maxlength: 60 },
    },
    marriage: {
      guardiansAgree: Boolean,
      previousMarriageInfo: { type: String, maxlength: 500 },
      children: { type: Number, min: 0, max: 15 },
      willingToRelocate: Boolean,
      careerAfterMarriage: { type: String, maxlength: 300 },
      thoughts: { type: String, maxlength: 1000 },
    },
    expectation: {
      ageMin: { type: Number, min: 18, max: 80 },
      ageMax: { type: Number, min: 18, max: 80 },
      heightMin: { type: Number, min: 48, max: 90 },
      heightMax: { type: Number, min: 48, max: 90 },
      religions: enArr(RELIGIONS),
      maritalStatuses: enArr(MARITAL_STATUS),
      complexions: enArr(COMPLEXIONS),
      educationMin: en(EDUCATION_LEVELS),
      occupations: enArr(OCCUPATIONS),
      districts: enArr(DISTRICTS),
      economicStatuses: enArr(ECONOMIC_STATUS),
      qualities: { type: String, maxlength: 1000 },
    },
    // PRIVATE: revealed only to the owner, staff, and users who unlocked it.
    contact: {
      candidateName: { type: String, maxlength: 80 },
      guardianName: { type: String, maxlength: 80 },
      guardianRelation: en(GUARDIAN_RELATIONS),
      guardianPhone: { type: String, maxlength: 20 },
      guardianPhone2: { type: String, maxlength: 20 },
      email: { type: String, maxlength: 120 },
    },
    pledge: {
      truthful: Boolean,
      guardiansKnow: Boolean,
      acceptsTerms: Boolean,
    },

    stats: {
      views: { type: Number, default: 0 },
      favorites: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

biodataSchema.index({ status: 1, hidden: 1, deletedAt: 1, type: 1, approvedAt: -1 });
biodataSchema.index({ 'general.dateOfBirth': 1 });
biodataSchema.index({ 'address.permanentDistrict': 1 });
biodataSchema.index({ 'general.religion': 1 });

biodataSchema.virtual('code').get(function code() {
  return this.biodataNo ? `GH-${this.biodataNo}` : null;
});

biodataSchema.methods.isPublic = function isPublic() {
  return this.status === 'approved' && !this.hidden && !this.deletedAt;
};

export const PRIVATE_FIELDS = ['contact', 'nid', 'photoKey', 'owner', 'reviewNote', 'reviewedBy', 'deleteReason', 'deleteNote', 'recovery', 'pledge'];

export function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/** Shape a biodata for public display (no private data, no exact birth date). */
export function toPublic(b) {
  const o = typeof b.toObject === 'function' ? b.toObject({ virtuals: true }) : { ...b };
  for (const f of PRIVATE_FIELDS) delete o[f];
  const age = ageFromDob(o.general?.dateOfBirth);
  if (o.general) {
    o.general = { ...o.general, age, birthYear: o.general.dateOfBirth ? new Date(o.general.dateOfBirth).getFullYear() : null };
    delete o.general.dateOfBirth;
  }
  o.code = o.biodataNo ? `GH-${o.biodataNo}` : null;
  o.nidVerified = b.nid?.status === 'verified';
  o.hasPhoto = Boolean(b.photoKey);
  delete o.__v;
  delete o.id;
  return o;
}

/** Short card for lists. */
export function toCard(b) {
  const age = ageFromDob(b.general?.dateOfBirth);
  return {
    _id: b._id,
    code: b.biodataNo ? `GH-${b.biodataNo}` : null,
    biodataNo: b.biodataNo,
    type: b.type,
    age,
    maritalStatus: b.general?.maritalStatus,
    religion: b.general?.religion,
    heightInches: b.general?.heightInches,
    complexion: b.general?.complexion,
    permanentDistrict: b.address?.permanentDistrict,
    presentDistrict: b.address?.presentDistrict,
    highestLevel: b.education?.highestLevel,
    occupation: b.occupation?.type,
    occupationTitle: b.occupation?.title,
    nidVerified: b.nid?.status === 'verified',
    approvedAt: b.approvedAt,
  };
}

export const Biodata = mongoose.model('Biodata', biodataSchema);
