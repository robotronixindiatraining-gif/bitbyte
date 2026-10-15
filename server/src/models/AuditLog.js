import mongoose from 'mongoose';

const { Schema } = mongoose;
export const AUDIT_OUTCOMES = Object.freeze(['attempted', 'succeeded', 'failed', 'denied']);
const RETENTION_SECONDS = 730 * 24 * 60 * 60; // 24 months

/**
 * Append-only record of privileged and security-relevant actions (docs/DATABASE_SCHEMA.md §3.14).
 * Never contains passwords, secrets, codes, tokens or lead personal data.
 */
const auditLogSchema = new Schema(
  {
    at: { type: Date, default: () => new Date(), required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    actorEmail: { type: String, maxlength: 254, default: null },
    action: { type: String, required: true, match: /^[a-z0-9_]+\.[a-z0-9_]+$/, maxlength: 60 },
    outcome: { type: String, enum: AUDIT_OUTCOMES, required: true },
    entityType: { type: String, maxlength: 40, default: null },
    entityId: { type: Schema.Types.ObjectId, default: null },
    summary: { type: String, maxlength: 300, default: null },
    meta: { type: Schema.Types.Mixed, default: undefined },
    ipHash: { type: String, default: null },
    requestId: { type: String, maxlength: 128, default: null },
  },
  { versionKey: false },
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, at: -1 });
auditLogSchema.index({ actor: 1, at: -1 });
auditLogSchema.index({ at: 1 }, { expireAfterSeconds: RETENTION_SECONDS, name: 'at_ttl' });

export const AuditLog =
  mongoose.models.AuditLog ?? mongoose.model('AuditLog', auditLogSchema, 'auditLogs');
