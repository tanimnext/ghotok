import mongoose from 'mongoose';

/**
 * Short-lived secrets: email verification links, password-reset links and SMS one-time codes.
 * Only a SHA-256 hash of the secret is stored. Expired documents are removed by a TTL index.
 */
const tokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    purpose: { type: String, enum: ['email_verify', 'password_reset', 'phone_verify', 'phone_reset'], required: true },
    target: String, // phone or email the secret was sent to
    secretHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ purpose: 1, secretHash: 1 });

export const AuthToken = mongoose.model('AuthToken', tokenSchema);
