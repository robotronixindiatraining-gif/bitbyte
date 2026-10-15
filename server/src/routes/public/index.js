import { Router } from 'express';
import { z } from 'zod';
import { slugSchema } from '@bitbyte/shared';
import { validate } from '../../middleware/validate.js';

/** /api/v1/public — published content only (Stage 04: services; the rest in Stage 05). */
export function publicRouter({ controller, limiters }) {
  const router = Router();
  router.use(limiters.public, (_req, res, next) => {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    next();
  });
  router.get(
    '/services',
    validate({
      query: z
        .object({
          featured: z
            .enum(['true', 'false'])
            .transform((v) => v === 'true')
            .optional(),
        })
        .strict(),
    }),
    controller.listServices,
  );
  router.get(
    '/services/:slug',
    validate({ params: z.object({ slug: slugSchema }).strict() }),
    controller.getService,
  );
  return router;
}
