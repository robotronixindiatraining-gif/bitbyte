import mongoose from 'mongoose';

const { Schema } = mongoose;
export const REVISION_ENTITY_TYPES = Object.freeze([
  'settings',
  'page',
  'service',
  'project',
  'testimonial',
  'job',
  'ordering',
]);

/** Snapshot of each published version (rollback). The latest 25 per entity are kept. */
const revisionSchema = new Schema(
  {
    entityType: { type: String, enum: REVISION_ENTITY_TYPES, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    revision: { type: Number, required: true, min: 1 },
    snapshot: { type: Schema.Types.Mixed, required: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    publishedAt: { type: Date, default: () => new Date() },
    note: { type: String, maxlength: 200, default: '' },
    /** Media referenced by this snapshot: media in recent revisions cannot be deleted (restore safety). */
    mediaRefs: { type: [{ type: Schema.Types.ObjectId, ref: 'Media' }], default: [] },
  },
  { versionKey: false },
);
revisionSchema.index({ entityType: 1, entityId: 1, publishedAt: -1 });
revisionSchema.index({ mediaRefs: 1, publishedAt: -1 });

export const Revision = mongoose.models.Revision ?? mongoose.model('Revision', revisionSchema);
