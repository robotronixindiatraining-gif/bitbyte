import mongoose from 'mongoose';
import {
  ERROR_CODES,
  checkTemplateRules,
  contentSchema,
  findPlaceholders,
  formatZodIssues,
  isReservedSlug,
} from '@bitbyte/shared';
import {
  JobOpening,
  Media,
  Page,
  Project,
  Redirect,
  Revision,
  Service,
  Taxonomy,
  Testimonial,
} from '../models/index.js';
import { collectReferences } from '../models/plugins/publishable.js';
import { AppError } from '../utils/AppError.js';

const REVISIONS_KEPT = 25;

/** Content kinds managed through draft → publish (settings and orderings follow in Stage 05). */
export const CONTENT_KINDS = {
  service: {
    Model: Service,
    schemaType: 'service',
    revisionType: 'service',
    path: (s) => `/${s}`,
    topLevel: true,
  },
  page: {
    Model: Page,
    schemaType: 'page',
    revisionType: 'page',
    path: (s) => (s ? `/${s}` : '/'),
    topLevel: true,
  },
  project: {
    Model: Project,
    schemaType: 'project',
    revisionType: 'project',
    path: (s) => `/portfolio/${s}`,
  },
  job: { Model: JobOpening, schemaType: 'job', revisionType: 'job', path: (s) => `/careers/${s}` },
  testimonial: { Model: Testimonial, schemaType: 'testimonial', revisionType: 'testimonial' },
};

const REFERENCE_MODELS = {
  service: Service,
  project: Project,
  testimonial: Testimonial,
  job: JobOpening,
  page: Page,
};

function kindConfig(kind) {
  const config = CONTENT_KINDS[kind];
  if (!config) throw new Error(`Unknown content kind: ${kind}`);
  return config;
}

function validationError(error, prefix) {
  return new AppError(
    422,
    ERROR_CODES.VALIDATION_ERROR,
    'Content validation failed.',
    formatZodIssues(error, prefix),
  );
}

/** Derived fields stored alongside every draft save (mirrors the model's pre-validate hook). */
function derivedFields(draft, published) {
  const refs = collectReferences([draft, published]);
  return {
    placeholders: [...new Set(findPlaceholders(draft).map((p) => p.token))],
    mediaRefs: refs.media,
    entityRefs: refs.entities,
  };
}

/**
 * Draft/publish workflow (D-009, D-010, D-015, D-038; docs/DATABASE_SCHEMA.md §2.1).
 * Writes are atomic single-document updates guarded by the `revision` concurrency token.
 */
export function createContentService({ audit, context }) {
  /** Fail closed (D-045): if the audit entry cannot be written, the action does not happen. */
  async function beginAudit(event) {
    try {
      return await audit.begin(event);
    } catch {
      throw new AppError(
        503,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'The action could not be recorded. Please try again.',
      );
    }
  }

  /** Services and custom pages share one top-level slug namespace (D-038). */
  async function assertSlugAvailable(kind, slug, excludeId) {
    const { topLevel } = kindConfig(kind);
    const taken = {
      $or: [{ slug }, { 'draft.slug': slug }],
      _id: mongoose.trusted({ $ne: excludeId }),
    };
    const conflict = (message) =>
      new AppError(409, ERROR_CODES.SLUG_TAKEN, message, [{ path: 'draft.slug', message }]);

    if (topLevel) {
      if (slug && isReservedSlug(slug)) throw conflict('This address is reserved.');
      const [service, page] = await Promise.all([Service.exists(taken), Page.exists(taken)]);
      if (service || page) throw conflict('This address is already used by a page or service.');
      if (slug && (await Redirect.exists({ fromPath: `/${slug}`, enabled: true }))) {
        throw conflict('This address is used by a redirect.');
      }
      return;
    }
    if (await kindConfig(kind).Model.exists(taken))
      throw conflict('This address is already in use.');
  }

  async function create(kind, actor, { draft, template, system = false, seedKey } = {}) {
    const { Model, schemaType } = kindConfig(kind);
    const parsed = contentSchema(schemaType, 'draft').safeParse(draft ?? {});
    if (!parsed.success) throw validationError(parsed.error, 'draft');
    const doc = new Model({
      draft: parsed.data,
      status: 'draft',
      createdBy: actor?._id ?? null,
      updatedBy: actor?._id ?? null,
      seedKey,
      ...(template ? { template, system } : {}),
    });
    if ('slug' in Model.schema.paths) {
      const slug = parsed.data.slug ?? (kind === 'page' ? '' : undefined);
      if (slug === undefined)
        throw validationError({ issues: [{ path: ['slug'], message: 'Required' }] }, 'draft');
      await assertSlugAvailable(kind, slug, doc._id);
      doc.slug = slug;
    }
    await doc.save();
    return doc;
  }

  /** Save a draft if `revision` matches; otherwise 409 EDIT_CONFLICT (nothing is overwritten). */
  async function saveDraft(kind, id, actor, { revision, draft }) {
    const { Model, schemaType } = kindConfig(kind);
    const parsed = contentSchema(schemaType, 'draft').safeParse(draft ?? {});
    if (!parsed.success) throw validationError(parsed.error, 'draft');
    const current = await Model.findById(id);
    if (!current) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');
    if (parsed.data.slug !== undefined && parsed.data.slug !== current.slug) {
      if (current.system) {
        throw new AppError(
          409,
          ERROR_CODES.INVALID_STATE,
          'The address of a system page cannot change.',
        );
      }
      await assertSlugAvailable(kind, parsed.data.slug, current._id);
    }

    const result = await Model.updateOne(
      { _id: id, revision },
      {
        $set: {
          draft: parsed.data,
          hasUnpublishedChanges: true,
          updatedBy: actor?._id ?? null,
          ...derivedFields(parsed.data, current.published),
        },
        $inc: { revision: 1 },
      },
    );
    if (result.matchedCount === 0) throw await conflict(Model, id);
    return Model.findById(id);
  }

  async function conflict(Model, id) {
    const latest = await Model.findById(id, { revision: 1, updatedBy: 1, updatedAt: 1 });
    if (!latest) return new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');
    return new AppError(409, ERROR_CODES.EDIT_CONFLICT, 'This item changed since you opened it.', {
      currentRevision: latest.revision,
      updatedBy: latest.updatedBy ? String(latest.updatedBy) : null,
      updatedAt: latest.updatedAt,
    });
  }

  async function assertReferencesPublished(doc) {
    const missing = [];
    for (const ref of doc.entityRefs) {
      if (ref.kind === 'taxonomy') {
        if (!(await Taxonomy.exists({ _id: ref.id }))) missing.push(`taxonomy:${ref.id}`);
        continue;
      }
      const Model = REFERENCE_MODELS[ref.kind];
      if (Model && !(await Model.exists({ _id: ref.id, status: 'published' })))
        missing.push(`${ref.kind}:${ref.id}`);
    }
    for (const mediaId of doc.mediaRefs) {
      if (!(await Media.exists({ _id: mediaId }))) missing.push(`media:${mediaId}`);
    }
    if (missing.length > 0) {
      throw new AppError(
        409,
        ERROR_CODES.REFERENCE_NOT_PUBLISHED,
        'Publish or replace the referenced items first.',
        missing.map((ref) => ({ ref })),
      );
    }
  }

  /** Validate strictly, enforce the publish rules, then make the draft live atomically. */
  async function publish(kind, id, actor, { revision, note = '' }, ctx = {}) {
    const { Model, schemaType, revisionType, path } = kindConfig(kind);
    const doc = await Model.findById(id);
    if (!doc) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');
    if (doc.revision !== revision) throw await conflict(Model, id);

    const strict = contentSchema(schemaType, 'publish').safeParse(doc.draft ?? {});
    if (!strict.success) throw validationError(strict.error, 'draft');

    const placeholders = findPlaceholders(doc.draft, 'draft');
    if (placeholders.length > 0) {
      throw new AppError(
        409,
        ERROR_CODES.PLACEHOLDERS_PRESENT,
        'Replace all [CONFIRM …] placeholders before publishing.',
        placeholders,
      );
    }
    if (kind === 'testimonial' && !doc.consent?.confirmed) {
      throw new AppError(
        409,
        ERROR_CODES.CONSENT_REQUIRED,
        'Record the person’s consent before publishing.',
      );
    }
    if (kind === 'project' && !doc.permission?.confirmed) {
      throw new AppError(
        409,
        ERROR_CODES.CONSENT_REQUIRED,
        'Record the client’s permission before publishing.',
      );
    }
    if (kind === 'page') {
      const problems = checkTemplateRules(doc.template, strict.data.sections ?? []);
      if (problems.length > 0) {
        throw new AppError(
          422,
          ERROR_CODES.VALIDATION_ERROR,
          'The page does not meet its template rules.',
          problems.map((p) => ({ ...p, path: `draft.${p.path}` })),
        );
      }
    }
    await assertReferencesPublished(doc);

    const newSlug = 'slug' in Model.schema.paths ? (strict.data.slug ?? doc.slug) : undefined;
    if (newSlug !== undefined && newSlug !== doc.slug)
      await assertSlugAvailable(kind, newSlug, doc._id);

    const entry = await beginAudit({
      actor,
      action: 'content.publish',
      entityType: kind,
      entityId: doc._id,
      meta: { revision },
      context: context(ctx),
    });
    const now = new Date();
    const result = await Model.updateOne(
      { _id: doc._id, revision },
      {
        $set: {
          published: strict.data,
          status: 'published',
          publishedRevision: revision,
          publishedAt: now,
          publishedBy: actor?._id ?? null,
          firstPublishedAt: doc.firstPublishedAt ?? now,
          hasUnpublishedChanges: false,
          ...(newSlug !== undefined ? { slug: newSlug } : {}),
          ...derivedFields(doc.draft, strict.data),
        },
      },
    );
    if (result.matchedCount === 0) {
      await entry.complete('failed');
      throw await conflict(Model, id);
    }

    await Revision.create({
      entityType: revisionType,
      entityId: doc._id,
      revision,
      snapshot: { slug: newSlug ?? null, content: strict.data },
      publishedBy: actor?._id ?? null,
      publishedAt: now,
      note,
    });
    const stale = await Revision.find({ entityType: revisionType, entityId: doc._id })
      .sort({ publishedAt: -1 })
      .skip(REVISIONS_KEPT)
      .select('_id');
    if (stale.length > 0)
      await Revision.deleteMany({ _id: mongoose.trusted({ $in: stale.map((r) => r._id) }) });

    // A published item moved to a new address keeps its old URL working (D-038).
    if (path && doc.firstPublishedAt && newSlug !== undefined && newSlug !== doc.slug) {
      await Redirect.updateOne(
        { fromPath: path(doc.slug) },
        { $set: { toPath: path(newSlug), statusCode: 301, enabled: true, source: 'slug-change' } },
        { upsert: true, runValidators: true },
      );
    }
    await entry.complete('succeeded');
    return Model.findById(doc._id);
  }

  async function unpublish(kind, id, actor, { revision }, ctx = {}) {
    const { Model } = kindConfig(kind);
    const entry = await beginAudit({
      actor,
      action: 'content.unpublish',
      entityType: kind,
      entityId: mongoose.isValidObjectId(id) ? id : null,
      context: context(ctx),
    });
    const result = await Model.updateOne(
      { _id: id, revision, status: 'published' },
      { $set: { status: 'archived', updatedBy: actor?._id ?? null } },
    );
    if (result.matchedCount === 0) {
      await entry.complete('failed');
      const doc = await Model.findById(id);
      if (!doc) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');
      if (doc.status !== 'published')
        throw new AppError(409, ERROR_CODES.INVALID_STATE, 'This item is not published.');
      throw await conflict(Model, id);
    }
    await entry.complete('succeeded');
    return Model.findById(id);
  }

  return { create, saveDraft, publish, unpublish, assertSlugAvailable };
}
