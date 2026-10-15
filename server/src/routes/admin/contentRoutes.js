import { z } from 'zod';
import { SETTINGS_KEYS } from '@bitbyte/shared';
import { STEP_UP_SETTINGS } from '../../controllers/contentController.js';
import { ORDERING_KEYS } from '../../models/Ordering.js';
import { PUBLISH_STATUSES } from '../../models/plugins/publishable.js';
import { LIST_SORTS } from '../../services/contentService.js';
import { draftObject, idParams, limit, page, revision, revisionBody, search } from './schemas.js';

/** Collection path → content kind (API_REFERENCE.md §5.1). */
export const CONTENT_RESOURCES = Object.freeze({
  pages: 'page',
  services: 'service',
  projects: 'project',
  testimonials: 'testimonial',
  jobs: 'job',
});

const listQuery = z
  .object({
    page,
    limit: limit(),
    status: z.enum(PUBLISH_STATUSES).optional(),
    q: search,
    sort: z.enum(LIST_SORTS).optional(),
  })
  .strict();
const createBody = z.object({ draft: draftObject }).strict();
const draftBody = z.object({ revision, draft: draftObject }).strict();
const publishBody = z.object({ revision, note: z.string().trim().max(200).optional() }).strict();
const restoreParams = z
  .object({ id: idParams.shape.id, rev: z.coerce.number().int().min(1) })
  .strict();
const settingsParams = z.object({ key: z.enum(SETTINGS_KEYS) }).strict();
const settingsRestoreParams = settingsParams
  .extend({ rev: z.coerce.number().int().min(1) })
  .strict();
const orderingParams = z.object({ key: z.enum(ORDERING_KEYS) }).strict();
const orderingDraftBody = z.object({ revision, ids: z.array(idParams.shape.id).max(500) }).strict();
const permissionBody = z
  .object({ confirmed: z.boolean(), note: z.string().trim().max(500).optional() })
  .strict();
const consentBody = permissionBody
  .extend({ method: z.enum(['email', 'document', 'other']).optional() })
  .strict();

/** Routes for publishable collections, settings, orderings and previews. */
export function contentRoutes(content) {
  const routes = [];
  for (const [resource, kind] of Object.entries(CONTENT_RESOURCES)) {
    const c = content[kind];
    const base = `/${resource}`;
    routes.push(
      { method: 'get', path: base, schemas: { query: listQuery }, handler: c.list },
      { method: 'post', path: base, schemas: { body: createBody }, handler: c.create },
      { method: 'get', path: `${base}/:id`, schemas: { params: idParams }, handler: c.get },
      {
        method: 'put',
        path: `${base}/:id/draft`,
        schemas: { params: idParams, body: draftBody },
        handler: c.saveDraft,
      },
      {
        method: 'post',
        path: `${base}/:id/publish`,
        schemas: { params: idParams, body: publishBody },
        handler: c.publish,
      },
      {
        method: 'post',
        path: `${base}/:id/unpublish`,
        schemas: { params: idParams, body: revisionBody },
        handler: c.unpublish,
      },
      {
        method: 'post',
        path: `${base}/:id/discard-draft`,
        schemas: { params: idParams, body: revisionBody },
        handler: c.discardDraft,
      },
      {
        method: 'get',
        path: `${base}/:id/revisions`,
        schemas: { params: idParams },
        handler: c.revisions,
      },
      {
        method: 'post',
        path: `${base}/:id/revisions/:rev/restore`,
        schemas: { params: restoreParams, body: revisionBody },
        handler: c.restore,
      },
      { method: 'delete', path: `${base}/:id`, schemas: { params: idParams }, handler: c.remove },
    );
  }
  routes.push(
    {
      method: 'put',
      path: '/projects/:id/permission',
      schemas: { params: idParams, body: permissionBody },
      handler: content.project.confirm,
    },
    {
      method: 'put',
      path: '/testimonials/:id/consent',
      schemas: { params: idParams, body: consentBody },
      handler: content.testimonial.confirm,
    },

    { method: 'get', path: '/settings', handler: content.settings.list },
    {
      method: 'get',
      path: '/settings/:key',
      schemas: { params: settingsParams },
      handler: content.settings.get,
    },
    {
      method: 'put',
      path: '/settings/:key/draft',
      schemas: { params: settingsParams, body: draftBody },
      handler: content.settings.saveDraft,
    },
    {
      method: 'post',
      path: '/settings/:key/publish',
      // Retention periods and lead-notification recipients govern personal data (D-032, D-039).
      stepUp: (req) => STEP_UP_SETTINGS.includes(req.params.key),
      schemas: { params: settingsParams, body: publishBody },
      handler: content.settings.publish,
    },
    {
      method: 'post',
      path: '/settings/:key/discard-draft',
      schemas: { params: settingsParams, body: revisionBody },
      handler: content.settings.discardDraft,
    },
    {
      method: 'get',
      path: '/settings/:key/revisions',
      schemas: { params: settingsParams },
      handler: content.settings.revisions,
    },
    {
      method: 'post',
      path: '/settings/:key/revisions/:rev/restore',
      schemas: { params: settingsRestoreParams, body: revisionBody },
      handler: content.settings.restore,
    },

    {
      method: 'get',
      path: '/orderings/:key',
      schemas: { params: orderingParams },
      handler: content.ordering.get,
    },
    {
      method: 'put',
      path: '/orderings/:key/draft',
      schemas: { params: orderingParams, body: orderingDraftBody },
      handler: content.ordering.saveDraft,
    },
    {
      method: 'post',
      path: '/orderings/:key/publish',
      schemas: { params: orderingParams, body: publishBody },
      handler: content.ordering.publish,
    },
    {
      method: 'post',
      path: '/orderings/:key/discard-draft',
      schemas: { params: orderingParams, body: revisionBody },
      handler: content.ordering.discardDraft,
    },

    { method: 'get', path: '/preview/site', handler: content.previewSite },
    {
      method: 'get',
      path: '/preview/pages/:id',
      schemas: { params: idParams },
      handler: content.page.preview,
    },
    {
      method: 'get',
      path: '/preview/services/:id',
      schemas: { params: idParams },
      handler: content.service.preview,
    },
    {
      method: 'get',
      path: '/preview/projects/:id',
      schemas: { params: idParams },
      handler: content.project.preview,
    },
    {
      method: 'get',
      path: '/preview/jobs/:id',
      schemas: { params: idParams },
      handler: content.job.preview,
    },
  );
  return routes;
}
