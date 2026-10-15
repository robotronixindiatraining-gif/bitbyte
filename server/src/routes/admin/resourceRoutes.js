import { z } from 'zod';
import { LEAD_STATUSES } from '@bitbyte/shared';
import { TAXONOMY_TYPES } from '../../models/Taxonomy.js';
import { idParams, limit, page, queryBoolean, search } from './schemas.js';

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens')
  .max(80);
const sitePath = z
  .string()
  .trim()
  .max(300)
  .regex(/^\/[^\s?#]*$/, 'Must be a site path such as /old-page');
const redirectTarget = z
  .string()
  .trim()
  .max(2048)
  .regex(/^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/, 'A site path (/new-page) or an https:// URL');

const taxonomyCreate = z
  .object({
    type: z.enum(TAXONOMY_TYPES),
    name: z.string().trim().min(1).max(60),
    slug: slug.optional(),
  })
  .strict();
const taxonomyUpdate = z
  .object({ name: z.string().trim().min(1).max(60).optional(), slug: slug.optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to change');

const redirectCreate = z
  .object({
    fromPath: sitePath,
    toPath: redirectTarget,
    statusCode: z.union([z.literal(301), z.literal(302)]).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();
const redirectUpdate = redirectCreate
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to change');

const mediaText = (max) => z.string().trim().max(max);
const mediaFields = {
  alt: mediaText(250),
  caption: mediaText(300),
  credit: mediaText(200),
  licence: mediaText(200),
  folder: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,60}$/, 'Lowercase letters, numbers and hyphens'),
};
/** Multipart fields arrive as strings. */
const mediaUploadFields = z
  .object({
    ...Object.fromEntries(Object.entries(mediaFields).map(([k, v]) => [k, v.optional()])),
    decorative: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  })
  .strict();
const mediaUpdate = z
  .object({
    ...Object.fromEntries(Object.entries(mediaFields).map(([k, v]) => [k, v.optional()])),
    decorative: z.boolean().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to change');

const leadFilters = {
  status: z.enum(LEAD_STATUSES).optional(),
  type: z.enum(['project_enquiry', 'career']).optional(),
  q: search,
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  possibleSpam: queryBoolean,
};
const leadListQuery = z.object({ ...leadFilters, page, limit: limit() }).strict();
const leadExportQuery = z.object(leadFilters).strict();

/** Taxonomies, redirects, media, leads and the dashboard. */
export function resourceRoutes(r) {
  return [
    {
      method: 'get',
      path: '/taxonomies',
      schemas: { query: z.object({ type: z.enum(TAXONOMY_TYPES).optional() }).strict() },
      handler: r.taxonomies.list,
    },
    {
      method: 'post',
      path: '/taxonomies',
      schemas: { body: taxonomyCreate },
      handler: r.taxonomies.create,
    },
    {
      method: 'patch',
      path: '/taxonomies/:id',
      schemas: { params: idParams, body: taxonomyUpdate },
      handler: r.taxonomies.update,
    },
    {
      method: 'delete',
      path: '/taxonomies/:id',
      schemas: { params: idParams },
      handler: r.taxonomies.remove,
    },

    {
      method: 'get',
      path: '/redirects',
      schemas: {
        query: z
          .object({
            q: search,
            source: z.enum(['legacy', 'slug-change', 'manual']).optional(),
            page,
            limit: limit(100, 50),
          })
          .strict(),
      },
      handler: r.redirects.list,
    },
    {
      method: 'post',
      path: '/redirects',
      schemas: { body: redirectCreate },
      handler: r.redirects.create,
    },
    {
      method: 'patch',
      path: '/redirects/:id',
      schemas: { params: idParams, body: redirectUpdate },
      handler: r.redirects.update,
    },
    {
      method: 'delete',
      path: '/redirects/:id',
      schemas: { params: idParams },
      handler: r.redirects.remove,
    },

    {
      method: 'post',
      path: '/media',
      upload: true,
      schemas: { body: mediaUploadFields },
      handler: r.media.upload,
    },
    {
      method: 'get',
      path: '/media',
      schemas: {
        query: z
          .object({ q: search, folder: mediaFields.folder.optional(), page, limit: limit(100, 30) })
          .strict(),
      },
      handler: r.media.list,
    },
    { method: 'get', path: '/media/:id', schemas: { params: idParams }, handler: r.media.get },
    {
      method: 'patch',
      path: '/media/:id',
      schemas: { params: idParams, body: mediaUpdate },
      handler: r.media.update,
    },
    {
      method: 'delete',
      path: '/media/:id',
      schemas: { params: idParams },
      handler: r.media.remove,
    },

    { method: 'get', path: '/leads', schemas: { query: leadListQuery }, handler: r.leads.list },
    // Before /leads/:id so "export.csv" is never read as an id.
    {
      method: 'get',
      path: '/leads/export.csv',
      stepUp: true,
      schemas: { query: leadExportQuery },
      handler: r.leads.exportCsv,
    },
    { method: 'get', path: '/leads/:id', schemas: { params: idParams }, handler: r.leads.get },
    {
      method: 'patch',
      path: '/leads/:id',
      schemas: { params: idParams, body: z.object({ status: z.enum(LEAD_STATUSES) }).strict() },
      handler: r.leads.updateStatus,
    },
    {
      method: 'post',
      path: '/leads/:id/notes',
      schemas: {
        params: idParams,
        body: z.object({ text: z.string().trim().min(1).max(2000) }).strict(),
      },
      handler: r.leads.addNote,
    },
    {
      method: 'post',
      path: '/leads/:id/resend-notification',
      schemas: { params: idParams },
      handler: r.leads.resendNotification,
    },
    {
      method: 'delete',
      path: '/leads/:id',
      stepUp: true,
      schemas: { params: idParams, body: z.object({ confirm: z.string().max(10) }).strict() },
      handler: r.leads.erase,
    },

    { method: 'get', path: '/dashboard', handler: r.dashboard.summary },
  ];
}
