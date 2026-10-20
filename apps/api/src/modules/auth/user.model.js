import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '@ghotok/shared';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 20 },
    emailVerifiedAt: Date,
    phoneVerifiedAt: Date,
    googleId: { type: String, select: false },
    passwordHash: { type: String, select: false },
    passwordSetAt: Date,
    gender: { type: String, enum: ['male', 'female'], required: true },
    role: { type: String, enum: ROLES, default: 'user', index: true },
    connections: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active', index: true },
    suspendReason: String,
    deletedAt: Date,
    deleteReason: String,
    formerEmail: { type: String, select: false },
    formerPhone: { type: String, select: false },
    preferredLang: { type: String, enum: ['en', 'bn'], default: 'bn' },
    lastLoginAt: Date,
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
userSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } });

userSchema.methods.setPassword = async function setPassword(pw) {
  this.passwordHash = await bcrypt.hash(pw, 12);
  this.passwordSetAt = new Date();
};
userSchema.methods.checkPassword = function checkPassword(pw) {
  return this.passwordHash ? bcrypt.compare(pw, this.passwordHash) : Promise.resolve(false);
};
/** Invalidate every JWT issued so far (password change, role change, suspension…). */
userSchema.methods.revokeTokens = function revokeTokens() {
  this.tokenVersion = (this.tokenVersion || 0) + 1;
};
userSchema.methods.toSafe = function toSafe() {
  return {
    id: this._id,
    name: this.name,
    email: this.email || null,
    phone: this.phone || null,
    emailVerified: Boolean(this.emailVerifiedAt),
    phoneVerified: Boolean(this.phoneVerifiedAt),
    hasPassword: Boolean(this.passwordSetAt),
    gender: this.gender,
    role: this.role,
    connections: this.connections,
    status: this.status,
    preferredLang: this.preferredLang,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
