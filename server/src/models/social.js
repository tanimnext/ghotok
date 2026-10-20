import mongoose from 'mongoose';

const { Schema } = mongoose;
const ref = (model, required = false) => ({ type: Schema.Types.ObjectId, ref: model, required });

const favoriteSchema = new Schema(
  {
    user: ref('User', true),
    biodata: ref('Biodata', true),
    kind: { type: String, enum: ['like', 'dislike'], required: true },
  },
  { timestamps: true }
);
favoriteSchema.index({ user: 1, biodata: 1 }, { unique: true });
favoriteSchema.index({ biodata: 1, kind: 1 });
export const Favorite = mongoose.model('Favorite', favoriteSchema);

export const PROPOSAL_STATUS = ['pending', 'accepted', 'declined', 'withdrawn'];
const proposalSchema = new Schema(
  {
    from: ref('User', true),
    fromBiodata: ref('Biodata', true),
    to: ref('User', true),
    toBiodata: ref('Biodata', true),
    message: { type: String, maxlength: 500 },
    status: { type: String, enum: PROPOSAL_STATUS, default: 'pending', index: true },
    respondedAt: Date,
  },
  { timestamps: true }
);
proposalSchema.index({ from: 1, toBiodata: 1 }, { unique: true });
proposalSchema.index({ to: 1, createdAt: -1 });
export const Proposal = mongoose.model('Proposal', proposalSchema);

const viewSchema = new Schema({
  biodata: ref('Biodata', true),
  day: { type: String, required: true }, // YYYY-MM-DD (Asia/Dhaka)
  viewerKey: { type: String, required: true },
  at: { type: Date, default: Date.now },
});
viewSchema.index({ biodata: 1, day: 1, viewerKey: 1 }, { unique: true });
export const ProfileView = mongoose.model('ProfileView', viewSchema);
