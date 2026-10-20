import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetType: String,
    targetId: mongoose.Schema.Types.ObjectId,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);
auditSchema.index({ createdAt: -1 });
auditSchema.index({ action: 1 });
export const AuditLog = mongoose.model('AuditLog', auditSchema);

/** Record a staff action. Never throws — auditing must not break the action itself. */
export async function audit(actorId, action, targetType, targetId, meta) {
  try {
    return await AuditLog.create({ actor: actorId, action, targetType, targetId, meta });
  } catch {
    return null;
  }
}
