import mongoose from 'mongoose';
import {
  ERROR_CODES,
  checkTemplateRules,
  findPlaceholders,
  formatZodIssues,
  isReservedSlug,
  slugSchema,
} from '@bitbyte/shared';
import {
  CONTENT_KINDS,
  ORDERING_TARGETS,
  REFERENCE_MODELS,
  REFERENCING_KINDS,
  displayTitle,
} from '../content/kinds.js';
import { Media, Ordering, Page, Redirect, Revision, Service, Taxonomy } from '../models/index.js';
import { collectReferences } from '../models/plugins/publishable.js';
import { AppError } from '../utils/AppError.js';

const REVISIONS_KEPT = 25;
export const LIST_SORTS = Object.freeze(['-updatedAt', 'updatedAt', 'title']);
const SORTS = {
  '-updatedAt': { updatedAt: -1 },
  updatedAt: { updatedAt: 1 },
  title: { 'draft.title': 1, _id: 1 },
};
const MAX_LIST_LIMIT = 100;

export { CONTENT_KINDS };

function kindConfig(kind) {
  const config = CONTENT_KINDS[kind];
  if (!config) throw new Error(`Unknown content kind: ${kind}`);
  return config;
}

const notFound = () => new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');

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
 * Remove an id from every draft and published order. `published` is null until an ordering is
 * first published, so each list is updated only where it exists.
 */
export async function removeFromAllOrderings(id) {
  const value = String(id);
  await Ordering.updateMany({ 'draft.ids': value }, { $pull: { 'draft.ids': value } });
  await Ordering.updateMany({ 'published.ids': value }, { $pull: { 'published.ids': value } });
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asObjectId = (id) =>
  mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(String(id)) : null;

/**
 * Draft/publish workflow for every publishable kind (D-009, D-010, D-015, D-037, D-038;
 * docs/DATABASE_SCHEMA.md §2.1). Writes are atomic single-document updates guarded by the
 * `revision` concurrency token, so nothing is ever silently overwritten.
 */
export function createContentService({ audit, context, hooks = {} }) {
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

  async function findDoc(kind, id) {
    const { Model } = kindConfig(kind);
    const objectId = asObjectId(id);
    const doc = objectId ? await Model.findById(objectId) : null;
    if (!doc) throw notFound();
    return doc;
  }

  async function findByKey(kind, key) {
    const { Model } = kindConfig(kind);
    let doc = await Model.findOne({ key });
    // Orderings are created on first use (an empty order means "newest first", D-037).
    if (!doc && kind === 'ordering' && ORDERING_TARGETS[key]) {
      await Model.updateOne({ key }, { $setOnInsert: { draft: { ids: [] } } }, { upsert: true });
      doc = await Model.findOne({ key });
    }
    if (!doc) throw notFound();
    return doc;
  }

  /** Every item of an ordering's collection, in draft order; unlisted items follow. */
  async function orderingItems(ordering) {
    const target = ORDERING_TARGETS[ordering.key];
    const Model = target === 'taxonomy' ? Taxonomy : REFERENCE_MODELS[target];
    const filter = target === 'taxonomy' ? { type: 'projectCategory' } : {};
    const docs = await Model.find(filter).sort({ createdAt: -1 }).lean();
    const position = new Map((ordering.draft?.ids ?? []).map((id, index) => [String(id), index]));
    return docs
      .map((doc) => ({
        id: String(doc._id),
        title: target === 'taxonomy' ? doc.name : displayTitle(doc),
        status: target === 'taxonomy' ? 'published' : doc.status,
        inDraftOrder: position.has(String(doc._id)),
        position: position.get(String(doc._id)) ?? Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.position - b.position)
      .map(({ position: _position, ...item }) => item);
  }

  /** Services and custom pages share one top-level slug namespace (D-038). */
  async function assertSlugAvailable(kind, slug, excludeId) {
    const { topLevel, Model, path } = kindConfig(kind);
    // Drafts accept any short string; an address is only ever stored in the canonical form.
    if (!(kind === 'page' && slug === '') && !slugSchema.safeParse(slug).success) {
      throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Content validation failed.', [
        { path: 'draft.slug', message: 'Use lowercase letters, numbers and hyphens' },
      ]);
    }
    // Automatic slug-change redirects give way to new content; manual/legacy ones do not (D-056).
    const redirected = async () =>
      path && slug
        ? Redirect.exists({
            fromPath: path(slug),
            enabled: true,
            source: mongoose.trusted({ $ne: 'slug-change' }),
          })
        : null;
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
    } else if (await Model.exists(taken)) {
      throw conflict('This address is already in use.');
    }
    if (await redirected()) throw conflict('This address is used by a redirect.');
  }

  /** Ordering documents must only list existing items of the right collection. */
  async function assertOrderingIds(orderingKey, ids) {
    const target = ORDERING_TARGETS[orderingKey];
    const Model = target === 'taxonomy' ? Taxonomy : REFERENCE_MODELS[target];
    const filter = { _id: mongoose.trusted({ $in: ids.map(asObjectId).filter(Boolean) }) };
    if (target === 'taxonomy') filter.type = 'projectCategory';
    const found = await Model.countDocuments(filter);
    if (found !== ids.length) {
      throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'The order contains unknown items.', [
        { path: 'draft.ids', message: 'Every id must belong to this list' },
      ]);
    }
  }

  function parseDraft(kind, doc, draft) {
    const parsed = kindConfig(kind)
      .schemaFor(doc, 'draft')
      .safeParse(draft ?? {});
    if (!parsed.success) throw validationError(parsed.error, 'draft');
    return parsed.data;
  }

  async function conflict(Model, id) {
    const latest = await Model.findById(id, { revision: 1, updatedBy: 1, updatedAt: 1 });
    if (!latest) return notFound();
    return new AppError(409, ERROR_CODES.EDIT_CONFLICT, 'This item changed since you opened it.', {
      currentRevision: latest.revision,
      updatedBy: latest.updatedBy ? String(latest.updatedBy) : null,
      updatedAt: latest.updatedAt,
    });
  }

  /** Add a new item to the draft order of its list (D-037); the live order is unchanged. */
  async function appendToOrdering(orderingKey, id) {
    if (!orderingKey) return;
    await Ordering.updateOne(
      { key: orderingKey },
      {
        $push: { 'draft.ids': String(id) },
        $set: { hasUnpublishedChanges: true },
        $inc: { revision: 1 },
      },
      { upsert: true },
    );
  }

  async function removeFromOrderings(id) {
    await removeFromAllOrderings(id);
  }

  /** Paginated admin listing with a status filter and title search. */
  async function list(
    kind,
    { status, q, page = 1, limit = 20, template, sort = '-updatedAt' } = {},
  ) {
    const { Model } = kindConfig(kind);
    const filter = {};
    if (status) filter.status = status;
    if (template) filter.template = template;
    if (q) {
      const pattern = mongoose.trusted({ $regex: escapeRegex(q), $options: 'i' });
      filter.$or = [{ 'draft.title': pattern }, { 'draft.quote': pattern }, { slug: pattern }];
    }
    const size = Math.min(limit, MAX_LIST_LIMIT);
    const [docs, total] = await Promise.all([
      Model.find(filter)
        .sort(SORTS[sort] ?? SORTS['-updatedAt'])
        .skip((page - 1) * size)
        .limit(size)
        .lean(),
      Model.countDocuments(filter),
    ]);
    return {
      items: docs.map((doc) => summarize(kind, doc)),
      meta: { page, limit: size, total, totalPages: Math.ceil(total / size) },
    };
  }

  function summarize(kind, doc) {
    return {
      id: String(doc._id),
      kind,
      title: displayTitle(doc),
      slug: doc.slug ?? null,
      key: doc.key ?? null,
      template: doc.template ?? null,
      system: doc.system ?? false,
      status: doc.status,
      hasUnpublishedChanges: doc.hasUnpublishedChanges,
      placeholders: doc.placeholders?.length ?? 0,
      revision: doc.revision,
      updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
      consentConfirmed: kind === 'testimonial' ? Boolean(doc.consent?.confirmed) : undefined,
      permissionConfirmed: kind === 'project' ? Boolean(doc.permission?.confirmed) : undefined,
      updatedAt: doc.updatedAt,
      publishedAt: doc.publishedAt,
    };
  }

  /** Every document (draft or published state) that references this id. */
  async function findUsages(id) {
    const objectId = asObjectId(id);
    const usages = [];
    for (const kind of REFERENCING_KINDS) {
      const { Model } = kindConfig(kind);
      const docs = await Model.find(
        { 'entityRefs.id': objectId, _id: mongoose.trusted({ $ne: objectId }) },
        { draft: 1, published: 1, key: 1, slug: 1, status: 1 },
      ).lean();
      docs.forEach((doc) =>
        usages.push({ kind, id: String(doc._id), title: displayTitle(doc), status: doc.status }),
      );
    }
    return usages;
  }

  async function get(kind, id) {
    const doc = await findDoc(kind, id);
    const usage = kind === 'settings' || kind === 'ordering' ? [] : await findUsages(doc._id);
    return { doc, usage };
  }

  async function create(kind, actor, { draft, template, system = false, seedKey } = {}, ctx = {}) {
    const { Model, orderingKey, keyed } = kindConfig(kind);
    if (keyed) throw new AppError(409, ERROR_CODES.INVALID_STATE, 'This item cannot be created.');
    const doc = new Model({
      status: 'draft',
      createdBy: actor?._id ?? null,
      updatedBy: actor?._id ?? null,
      seedKey,
      ...(kind === 'page' ? { template: template ?? 'custom', system } : {}),
    });
    doc.draft = parseDraft(kind, doc, draft);
    if ('slug' in Model.schema.paths) {
      const slug = doc.draft.slug ?? (kind === 'page' ? '' : undefined);
      if (slug === undefined) {
        throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Content validation failed.', [
          { path: 'draft.slug', message: 'Required' },
        ]);
      }
      await assertSlugAvailable(kind, slug, doc._id);
      doc.slug = slug;
    }
    await doc.save();
    await appendToOrdering(orderingKey, doc._id);
    await audit.recordSafely({
      actor,
      action: 'content.create',
      outcome: 'succeeded',
      entityType: kind,
      entityId: doc._id,
      context: context(ctx),
    });
    return doc;
  }

  /** Save a draft if `revision` matches; otherwise 409 EDIT_CONFLICT (nothing is overwritten). */
  async function saveDraft(kind, id, actor, { revision, draft }, ctx = {}) {
    const { Model } = kindConfig(kind);
    const current = await findDoc(kind, id);
    const parsed = parseDraft(kind, current, draft);
    if (kind === 'ordering') await assertOrderingIds(current.key, parsed.ids);
    if ('slug' in Model.schema.paths && parsed.slug !== undefined && parsed.slug !== current.slug) {
      if (current.system) {
        throw new AppError(
          409,
          ERROR_CODES.INVALID_STATE,
          'The address of a system page cannot change.',
        );
      }
      await assertSlugAvailable(kind, parsed.slug, current._id);
    }

    const result = await Model.updateOne(
      { _id: current._id, revision },
      {
        $set: {
          draft: parsed,
          hasUnpublishedChanges: true,
          updatedBy: actor?._id ?? null,
          ...derivedFields(parsed, current.published),
        },
        $inc: { revision: 1 },
      },
    );
    if (result.matchedCount === 0) throw await conflict(Model, current._id);
    await audit.recordSafely({
      actor,
      action: 'content.save_draft',
      outcome: 'succeeded',
      entityType: kind,
      entityId: current._id,
      meta: { revision: revision + 1 },
      context: context(ctx),
    });
    return Model.findById(current._id);
  }

  /** Only what the version being published references counts (not the old live version). */
  async function assertReferencesPublished(content) {
    const refs = collectReferences([content]);
    const missing = [];
    for (const ref of refs.entities) {
      if (ref.kind === 'taxonomy') {
        if (!(await Taxonomy.exists({ _id: ref.id }))) missing.push(`taxonomy:${ref.id}`);
        continue;
      }
      const Model = REFERENCE_MODELS[ref.kind];
      if (Model && !(await Model.exists({ _id: ref.id, status: 'published' })))
        missing.push(`${ref.kind}:${ref.id}`);
    }
    for (const mediaId of refs.media) {
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

  /**
   * A published item moved to a new address keeps its old URL working (D-038):
   * - an automatic redirect at the new address is removed (content takes the address back);
   * - redirects that pointed at the old address now point at the new one (no chains);
   * - the old address redirects to the new one (only if the item had been live there).
   */
  async function updateSlugRedirects(oldPath, newPath, wasLive) {
    await Redirect.deleteOne({ fromPath: newPath, source: 'slug-change' });
    await Redirect.updateMany(
      { toPath: oldPath, fromPath: mongoose.trusted({ $ne: newPath }) },
      { $set: { toPath: newPath } },
    );
    if (wasLive) {
      await Redirect.updateOne(
        { fromPath: oldPath },
        { $set: { toPath: newPath, statusCode: 301, enabled: true, source: 'slug-change' } },
        { upsert: true, runValidators: true },
      );
    }
  }

  /** Validate strictly, enforce the publish rules, then make the draft live atomically. */
  async function publish(kind, id, actor, { revision, note = '' }, ctx = {}) {
    const { Model, revisionType, path } = kindConfig(kind);
    const doc = await findDoc(kind, id);
    if (doc.revision !== revision) throw await conflict(Model, doc._id);

    const strict = kindConfig(kind)
      .schemaFor(doc, 'publish')
      .safeParse(doc.draft ?? {});
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
    if (kind === 'ordering') await assertOrderingIds(doc.key, strict.data.ids);
    await assertReferencesPublished(strict.data);

    const newSlug = 'slug' in Model.schema.paths ? (strict.data.slug ?? doc.slug) : undefined;
    if (newSlug !== undefined && newSlug !== doc.slug)
      await assertSlugAvailable(kind, newSlug, doc._id);

    const entry = await beginAudit({
      actor,
      action: 'content.publish',
      entityType: kind,
      entityId: doc._id,
      meta: { revision, key: doc.key ?? null },
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
      throw await conflict(Model, doc._id);
    }

    await Revision.create({
      entityType: revisionType,
      entityId: doc._id,
      revision,
      snapshot: { slug: newSlug ?? null, content: strict.data },
      publishedBy: actor?._id ?? null,
      publishedAt: now,
      note,
      mediaRefs: collectReferences([strict.data]).media,
    });
    const stale = await Revision.find({ entityType: revisionType, entityId: doc._id })
      .sort({ publishedAt: -1 })
      .skip(REVISIONS_KEPT)
      .select('_id');
    if (stale.length > 0)
      await Revision.deleteMany({ _id: mongoose.trusted({ $in: stale.map((r) => r._id) }) });

    if (path && newSlug !== undefined && newSlug !== doc.slug) {
      await updateSlugRedirects(path(doc.slug), path(newSlug), Boolean(doc.firstPublishedAt));
    }
    await entry.complete('succeeded');
    const published = await Model.findById(doc._id);
    await hooks.onPublished?.(kind, published);
    return published;
  }

  async function unpublish(kind, id, actor, { revision }, ctx = {}) {
    const { Model, keyed } = kindConfig(kind);
    const doc = await findDoc(kind, id);
    if (keyed)
      throw new AppError(
        409,
        ERROR_CODES.INVALID_STATE,
        'Settings and orderings cannot be unpublished.',
      );
    if (doc.system)
      throw new AppError(
        409,
        ERROR_CODES.INVALID_STATE,
        'System pages cannot be unpublished; edit them instead.',
      );
    const entry = await beginAudit({
      actor,
      action: 'content.unpublish',
      entityType: kind,
      entityId: doc._id,
      context: context(ctx),
    });
    const result = await Model.updateOne(
      { _id: doc._id, revision, status: 'published' },
      { $set: { status: 'archived', updatedBy: actor?._id ?? null } },
    );
    if (result.matchedCount === 0) {
      await entry.complete('failed');
      if (doc.status !== 'published')
        throw new AppError(409, ERROR_CODES.INVALID_STATE, 'This item is not published.');
      throw await conflict(Model, doc._id);
    }
    await entry.complete('succeeded');
    return Model.findById(doc._id);
  }

  /** Reset the draft to the live version. */
  async function discardDraft(kind, id, actor, { revision }, ctx = {}) {
    const { Model } = kindConfig(kind);
    const doc = await findDoc(kind, id);
    if (!doc.published)
      throw new AppError(
        409,
        ERROR_CODES.INVALID_STATE,
        'There is no published version to return to.',
      );
    const draft = parseDraft(kind, doc, doc.published);
    const result = await Model.updateOne(
      { _id: doc._id, revision },
      {
        $set: {
          draft,
          hasUnpublishedChanges: false,
          updatedBy: actor?._id ?? null,
          ...derivedFields(draft, doc.published),
        },
        $inc: { revision: 1 },
      },
    );
    if (result.matchedCount === 0) throw await conflict(Model, doc._id);
    await audit.recordSafely({
      actor,
      action: 'content.discard_draft',
      outcome: 'succeeded',
      entityType: kind,
      entityId: doc._id,
      context: context(ctx),
    });
    return Model.findById(doc._id);
  }

  async function listRevisions(kind, id) {
    const doc = await findDoc(kind, id);
    const revisions = await Revision.find({
      entityType: kindConfig(kind).revisionType,
      entityId: doc._id,
    })
      .sort({ publishedAt: -1 })
      .select({ revision: 1, publishedAt: 1, publishedBy: 1, note: 1 })
      .lean();
    return revisions.map((r) => ({
      revision: r.revision,
      publishedAt: r.publishedAt,
      publishedBy: r.publishedBy ? String(r.publishedBy) : null,
      note: r.note,
    }));
  }

  /** Copy a revision snapshot into the draft (not live until published again). */
  async function restoreRevision(kind, id, actor, { revision, restore }, ctx = {}) {
    const { Model, revisionType } = kindConfig(kind);
    const doc = await findDoc(kind, id);
    const snapshot = await Revision.findOne({
      entityType: revisionType,
      entityId: doc._id,
      revision: restore,
    }).lean();
    if (!snapshot) throw notFound();
    const content = { ...snapshot.snapshot.content };
    if (doc.system && 'slug' in content) content.slug = doc.slug;
    const draft = parseDraft(kind, doc, content);
    if (kind === 'ordering') await assertOrderingIds(doc.key, draft.ids.filter(Boolean));
    if ('slug' in Model.schema.paths && draft.slug && draft.slug !== doc.slug)
      await assertSlugAvailable(kind, draft.slug, doc._id);
    const entry = await beginAudit({
      actor,
      action: 'content.restore',
      entityType: kind,
      entityId: doc._id,
      meta: { restoredRevision: restore },
      context: context(ctx),
    });
    const result = await Model.updateOne(
      { _id: doc._id, revision },
      {
        $set: {
          draft,
          hasUnpublishedChanges: true,
          updatedBy: actor?._id ?? null,
          ...derivedFields(draft, doc.published),
        },
        $inc: { revision: 1 },
      },
    );
    if (result.matchedCount === 0) {
      await entry.complete('failed');
      throw await conflict(Model, doc._id);
    }
    await entry.complete('succeeded');
    return Model.findById(doc._id);
  }

  /** Delete a draft/archived item that nothing references (D-016 deletion policy). */
  async function remove(kind, id, actor, ctx = {}) {
    const { Model, keyed, revisionType } = kindConfig(kind);
    const doc = await findDoc(kind, id);
    if (keyed || doc.system)
      throw new AppError(409, ERROR_CODES.INVALID_STATE, 'This item cannot be deleted.');
    if (doc.status === 'published') {
      throw new AppError(409, ERROR_CODES.INVALID_STATE, 'Unpublish this item before deleting it.');
    }
    const usage = await findUsages(doc._id);
    if (usage.length > 0)
      throw new AppError(409, ERROR_CODES.IN_USE, 'This item is still referenced.', usage);
    const entry = await beginAudit({
      actor,
      action: 'content.delete',
      entityType: kind,
      entityId: doc._id,
      summary: `Deleted "${displayTitle(doc)}"`.slice(0, 300),
      context: context(ctx),
    });
    await Model.deleteOne({ _id: doc._id });
    await Revision.deleteMany({ entityType: revisionType, entityId: doc._id });
    await removeFromOrderings(doc._id);
    await entry.complete('succeeded');
  }

  /** Record consent (testimonials) or client permission (projects). */
  async function setConfirmation(kind, id, actor, { confirmed, method, note }, ctx = {}) {
    const field = kind === 'testimonial' ? 'consent' : kind === 'project' ? 'permission' : null;
    if (!field) throw new Error(`No confirmation for ${kind}`);
    const doc = await findDoc(kind, id);
    const entry = await beginAudit({
      actor,
      action: kind === 'testimonial' ? 'content.consent' : 'content.permission',
      entityType: kind,
      entityId: doc._id,
      meta: { confirmed },
      context: context(ctx),
    });
    const value = {
      confirmed,
      confirmedAt: confirmed ? new Date() : null,
      confirmedBy: confirmed ? (actor?._id ?? null) : null,
      note: note ?? '',
      ...(field === 'consent' ? { method: confirmed ? (method ?? 'other') : null } : {}),
    };
    // Withdrawing consent/permission also takes the item off the public site.
    const update = { $set: { [field]: value } };
    if (!confirmed && doc.status === 'published') update.$set.status = 'archived';
    await kindConfig(kind).Model.updateOne({ _id: doc._id }, update);
    await entry.complete('succeeded');
    return kindConfig(kind).Model.findById(doc._id);
  }

  return {
    list,
    get,
    findByKey,
    orderingItems,
    findUsages,
    create,
    saveDraft,
    publish,
    unpublish,
    discardDraft,
    listRevisions,
    restoreRevision,
    remove,
    setConfirmation,
    assertSlugAvailable,
    appendToOrdering,
  };
}
