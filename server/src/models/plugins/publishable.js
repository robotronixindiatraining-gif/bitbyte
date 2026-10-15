import mongoose from 'mongoose';
import { LINK_ENTITY_KINDS, findPlaceholders } from '@bitbyte/shared';

const { Schema } = mongoose;
const OBJECT_ID = /^[a-f\d]{24}$/i;

export const PUBLISH_STATUSES = Object.freeze(['draft', 'published', 'archived']);

/** Keys whose ObjectId values reference other collections (used to derive `entityRefs`). */
const REFERENCE_KEYS = {
  services: 'service',
  relatedProjects: 'project',
  projects: 'project',
  project: 'project',
  technologies: 'taxonomy',
  category: 'taxonomy',
  items: 'testimonial',
};
const MEDIA_KEYS = new Set(['media', 'ogImage']);

const isId = (value) => typeof value === 'string' && OBJECT_ID.test(value);

/**
 * Collect media and entity references from content (drafts and published snapshots), so
 * "where used" and safe deletion are cheap index lookups (D-013).
 * @param {unknown[]} contents
 */
export function collectReferences(contents) {
  const media = new Set();
  const entities = new Map();
  const addEntity = (kind, id) => entities.set(`${kind}:${id}`, { kind, id });

  const walk = (value, key) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isId(item) && REFERENCE_KEYS[key]) addEntity(REFERENCE_KEYS[key], item);
        else walk(item, key);
      }
      return;
    }
    if (isId(value)) {
      if (MEDIA_KEYS.has(key)) media.add(value);
      else if (REFERENCE_KEYS[key]) addEntity(REFERENCE_KEYS[key], value);
      return;
    }
    if (value === null || typeof value !== 'object') return;
    if (
      LINK_ENTITY_KINDS.includes(value.kind) &&
      isId(value.id) &&
      Object.keys(value).length === 2
    ) {
      addEntity(value.kind, value.id);
      return;
    }
    for (const [childKey, child] of Object.entries(value)) walk(child, childKey);
  };
  contents.forEach((content) => walk(content, null));

  return {
    media: [...media].map((id) => new mongoose.Types.ObjectId(id)),
    entities: [...entities.values()].map(({ kind, id }) => ({
      kind,
      id: new mongoose.Types.ObjectId(id),
    })),
  };
}

function describeIssues(error) {
  return error.issues
    .slice(0, 10)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

/**
 * Draft/published dual-state fields and validation (D-009, docs/DATABASE_SCHEMA.md §2.1).
 * @param {import('mongoose').Schema} schema
 * @param {{ schemaFor: (doc: any, mode: 'draft' | 'publish') => import('zod').ZodType }} options
 */
export function publishable(schema, { schemaFor }) {
  schema.add({
    status: { type: String, enum: PUBLISH_STATUSES, default: 'draft', required: true },
    draft: { type: Schema.Types.Mixed, default: () => ({}) },
    published: { type: Schema.Types.Mixed, default: null },
    hasUnpublishedChanges: { type: Boolean, default: true },
    revision: { type: Number, default: 1, min: 1 },
    publishedRevision: { type: Number, default: null },
    firstPublishedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    mediaRefs: { type: [{ type: Schema.Types.ObjectId, ref: 'Media' }], default: [] },
    entityRefs: {
      type: [new Schema({ kind: String, id: Schema.Types.ObjectId }, { _id: false })],
      default: [],
    },
    placeholders: { type: [String], default: [] },
    /** Stable identifier for seeded documents (idempotent seeding). */
    seedKey: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  });

  schema.index({ status: 1 });
  schema.index({ mediaRefs: 1 });
  schema.index({ 'entityRefs.id': 1 });
  schema.index(
    { seedKey: 1 },
    { unique: true, partialFilterExpression: { seedKey: { $type: 'string' } } },
  );

  schema.pre('validate', function validateContent() {
    const draftResult = schemaFor(this, 'draft').safeParse(this.draft ?? {});
    if (!draftResult.success) this.invalidate('draft', describeIssues(draftResult.error));

    if (this.published !== null && this.published !== undefined) {
      const publishedResult = schemaFor(this, 'publish').safeParse(this.published);
      if (!publishedResult.success)
        this.invalidate('published', describeIssues(publishedResult.error));
    }
    if (this.status === 'draft' && this.published) {
      this.invalidate('status', 'A published snapshot exists, so the status cannot be "draft"');
    }
    if (this.status === 'published' && !this.published) {
      this.invalidate('status', 'Nothing has been published yet');
    }

    this.placeholders = [...new Set(findPlaceholders(this.draft).map((p) => p.token))];
    const refs = collectReferences([this.draft, this.published]);
    this.mediaRefs = refs.media;
    this.entityRefs = refs.entities;
  });
}
