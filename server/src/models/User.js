import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 20 },
    passwordHash: { type: String, required: true, select: false },
    gender: { type: String, enum: ['male', 'female'], required: true },
    role: { type: String, enum: ROLES, default: 'user', index: true },
    connections: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    suspendReason: String,
    preferredLang: { type: String, enum: ['en', 'bn'], default: 'bn' },
    lastLoginAt: Date,
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
userSchema.index({ name: 'text', email: 'text', phone: 'text' });

userSchema.methods.setPassword = async function setPassword(pw) {
  this.passwordHash = await bcrypt.hash(pw, 12);
};
userSchema.methods.checkPassword = function checkPassword(pw) {
  return bcrypt.compare(pw, this.passwordHash);
};
userSchema.methods.isStaff = function isStaff() {
  return this.role !== 'user';
};
userSchema.methods.toSafe = function toSafe() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    gender: this.gender,
    role: this.role,
    connections: this.connections,
    status: this.status,
    preferredLang: this.preferredLang,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
