import { requestContext } from './requestContext.js';

/** Admin JSON view of a publishable document (API_REFERENCE.md §5.1). */
export function presentDocument(kind, doc, usage) {
  const value = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(value._id),
    kind,
    key: value.key ?? undefined,
    slug: value.slug ?? undefined,
    template: value.template ?? undefined,
    system: value.system ?? undefined,
    status: value.status,
    revision: value.revision,
    hasUnpublishedChanges: value.hasUnpublishedChanges,
    placeholders: value.placeholders ?? [],
    draft: value.draft ?? {},
    published: value.published ?? null,
    publishedRevision: value.publishedRevision ?? null,
    publishedAt: value.publishedAt ?? null,
    firstPublishedAt: value.firstPublishedAt ?? null,
    consent: kind === 'testimonial' ? (value.consent ?? null) : undefined,
    permission: kind === 'project' ? (value.permission ?? null) : undefined,
    references: usage,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

/** Settings whose publication changes how personal data is handled need a fresh step-up. */
export const STEP_UP_SETTINGS = Object.freeze(['privacy', 'leadForm']);

/**
 * Handlers for publishable collections (pages, services, projects, testimonials, jobs),
 * settings (by key) and orderings (by key). Every write goes through contentService, which
 * validates, checks the revision and audits.
 */
export function createContentController({ content, preview }) {
  const actorOf = (req) => req.auth.admin;

  function forKind(kind) {
    return {
      async list(req, res) {
        const { items, meta } = await content.list(kind, req.validated.query);
        res.json({ data: items, meta });
      },
      async create(req, res) {
        const doc = await content.create(
          kind,
          actorOf(req),
          { draft: req.validated.body.draft, ...(kind === 'page' ? { template: 'custom' } : {}) },
          requestContext(req),
        );
        res.status(201).json({ data: presentDocument(kind, doc, []) });
      },
      async get(req, res) {
        const { doc, usage } = await content.get(kind, req.validated.params.id);
        res.json({ data: presentDocument(kind, doc, usage) });
      },
      async saveDraft(req, res) {
        const doc = await content.saveDraft(
          kind,
          req.validated.params.id,
          actorOf(req),
          req.validated.body,
          requestContext(req),
        );
        res.json({ data: presentDocument(kind, doc, undefined) });
      },
      async publish(req, res) {
        const doc = await content.publish(
          kind,
          req.validated.params.id,
          actorOf(req),
          req.validated.body,
          requestContext(req),
        );
        res.json({ data: presentDocument(kind, doc, undefined) });
      },
      async unpublish(req, res) {
        const doc = await content.unpublish(
          kind,
          req.validated.params.id,
          actorOf(req),
          req.validated.body,
          requestContext(req),
        );
        res.json({ data: presentDocument(kind, doc, undefined) });
      },
      async discardDraft(req, res) {
        const doc = await content.discardDraft(
          kind,
          req.validated.params.id,
          actorOf(req),
          req.validated.body,
          requestContext(req),
        );
        res.json({ data: presentDocument(kind, doc, undefined) });
      },
      async revisions(req, res) {
        res.json({ data: await content.listRevisions(kind, req.validated.params.id) });
      },
      async restore(req, res) {
        const doc = await content.restoreRevision(
          kind,
          req.validated.params.id,
          actorOf(req),
          { revision: req.validated.body.revision, restore: req.validated.params.rev },
          requestContext(req),
        );
        res.json({ data: presentDocument(kind, doc, undefined) });
      },
      async remove(req, res) {
        await content.remove(kind, req.validated.params.id, actorOf(req), requestContext(req));
        res.status(204).end();
      },
      async confirm(req, res) {
        const doc = await content.setConfirmation(
          kind,
          req.validated.params.id,
          actorOf(req),
          req.validated.body,
          requestContext(req),
        );
        res.json({ data: presentDocument(kind, doc, undefined) });
      },
      async preview(req, res) {
        noindex(res);
        res.json({ data: await preview.item(kind, req.validated.params.id) });
      },
    };
  }

  /** Settings and orderings are addressed by key; the same workflow applies. */
  function forKeyed(kind) {
    const idOf = async (req) => (await content.findByKey(kind, req.validated.params.key))._id;
    return {
      async list(_req, res) {
        const { items } = await content.list(kind, { limit: 100 });
        res.json({ data: items });
      },
      async get(req, res) {
        const doc = await content.findByKey(kind, req.validated.params.key);
        const body = presentDocument(kind, doc, undefined);
        if (kind === 'ordering') body.items = await content.orderingItems(doc);
        res.json({ data: body });
      },
      async saveDraft(req, res) {
        const { revision, draft, ids } = req.validated.body;
        const doc = await content.saveDraft(
          kind,
          await idOf(req),
          actorOf(req),
          { revision, draft: kind === 'ordering' ? { ids } : draft },
          requestContext(req),
        );
        res.json({ data: presentDocument(kind, doc, undefined) });
      },
      async publish(req, res) {
        const doc = await content.publish(
          kind,
          await idOf(req),
          actorOf(req),
          req.validated.body,
          requestContext(req),
        );
        res.json({ data: presentDocument(kind, doc, undefined) });
      },
      async discardDraft(req, res) {
        const doc = await content.discardDraft(
          kind,
          await idOf(req),
          actorOf(req),
          req.validated.body,
          requestContext(req),
        );
        res.json({ data: presentDocument(kind, doc, undefined) });
      },
      async revisions(req, res) {
        res.json({ data: await content.listRevisions(kind, await idOf(req)) });
      },
      async restore(req, res) {
        const doc = await content.restoreRevision(
          kind,
          await idOf(req),
          actorOf(req),
          { revision: req.validated.body.revision, restore: req.validated.params.rev },
          requestContext(req),
        );
        res.json({ data: presentDocument(kind, doc, undefined) });
      },
    };
  }

  return {
    page: forKind('page'),
    service: forKind('service'),
    project: forKind('project'),
    testimonial: forKind('testimonial'),
    job: forKind('job'),
    settings: forKeyed('settings'),
    ordering: forKeyed('ordering'),
    async previewSite(_req, res) {
      noindex(res);
      res.json({ data: await preview.site() });
    },
  };
}

function noindex(res) {
  res.set('X-Robots-Tag', 'noindex, nofollow').set('Cache-Control', 'no-store');
}
