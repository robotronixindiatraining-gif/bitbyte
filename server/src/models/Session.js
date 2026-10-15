import mongoose from 'mongoose';
import { SESSION_STAGES } from '@bitbyte/shared';

const { Schema } = mongoose;

/** Server-side admin session (D-011, D-039). Only the SHA-256 hash of the cookie token is stored. */
const sessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    stage: { type: String, enum: Object.values(SESSION_STAGES), required: true },
    mfaAttempts: { type: Number, default: 0, min: 0 },
    stepUpAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: () => new Date() },
    absoluteExpiresAt: { type: Date, required: true },
    /** min(lastSeenAt + idle, absoluteExpiresAt); MongoDB removes the document after this (TTL). */
    expiresAt: { type: Date, required: true },
    ipHash: { type: String, default: null },
    userAgent: { type: String, maxlength: 300, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ admin: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.models.Session ?? mongoose.model('Session', sessionSchema);
