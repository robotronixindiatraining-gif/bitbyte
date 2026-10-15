import express, { Router } from 'express';
import { z } from 'zod';
import { leadSubmissionSchema, slugSchema } from '@bitbyte/shared';
import { originCheck } from '../../middleware/originCheck.js';
import { validate } from '../../middleware/validate.js';

/** Lead submissions are small; anything larger is rejected before parsing (413). */
export const LEAD_BODY_LIMIT = '16kb';

const flag = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();
const slugParams = z.object({ slug: slugSchema }).strict();
const empty = z.object({}).strict();

/**
 * Public routes that must run before the API's general JSON parser (their own body limit).
 * POST /public/leads: origin check + X-Requested-With (CSRF, D-012), per-IP limits, strict schema.
 */
export function publicLeadRouter({ controller, limiters, allowedOrigins }) {
  const router = Router();
  router.post(
    '/public/leads',
    limiters.public,
    originCheck({ allowedOrigins }),
    limiters.leadsPerHour,
    limiters.leadsPerDay,
    express.json({ limit: LEAD_BODY_LIMIT }),
    (_req, res, next) => {
      res.set('Cache-Control', 'no-store');
      next();
    },
    validate({ body: leadSubmissionSchema }),
    controller.submitLead,
  );
  return router;
}

/** /api/v1/public — published content only (API_REFERENCE.md §3). */
export function publicRouter({ controller, limiters }) {
  const router = Router();
  router.use(limiters.public, (_req, res, next) => {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    next();
  });
  router.get('/site', validate({ query: empty }), controller.site);
  router.get(
    '/resolve',
    validate({
      query: z
        .object({
          path: z
            .string()
            .max(300)
            .regex(/^\/[^\s]*$/),
        })
        .strict(),
    }),
    controller.resolve,
  );
  router.get(
    '/pages/:slug',
    validate({
      params: z.object({ slug: z.union([z.literal('home'), slugSchema]) }).strict(),
      query: empty,
    }),
    controller.page,
  );
  router.get(
    '/services',
    validate({ query: z.object({ featured: flag }).strict() }),
    controller.listServices,
  );
  router.get(
    '/services/:slug',
    validate({ params: slugParams, query: empty }),
    controller.getService,
  );
  router.get(
    '/projects',
    validate({
      query: z
        .object({
          category: slugSchema.optional(),
          technology: slugSchema.optional(),
          featured: flag,
          page: z.coerce.number().int().min(1).max(1000).default(1),
          limit: z.coerce.number().int().min(1).max(48).default(12),
        })
        .strict(),
    }),
    controller.listProjects,
  );
  router.get(
    '/projects/:slug',
    validate({ params: slugParams, query: empty }),
    controller.getProject,
  );
  router.get(
    '/taxonomies',
    validate({ query: z.object({ type: z.enum(['projectCategory', 'technology']) }).strict() }),
    controller.listTaxonomies,
  );
  router.get(
    '/testimonials',
    validate({ query: z.object({ featured: flag }).strict() }),
    controller.listTestimonials,
  );
  router.get('/jobs', validate({ query: empty }), controller.listJobs);
  router.get('/jobs/:slug', validate({ params: slugParams, query: empty }), controller.getJob);
  return router;
}
