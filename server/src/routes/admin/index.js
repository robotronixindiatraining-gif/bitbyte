import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  ADMIN_STATUSES,
  ERROR_CODES,
  emailSchema,
  objectIdSchema,
  passwordSchema,
} from '@bitbyte/shared';
import { MAX_UPLOAD_BYTES } from '../../media/processImage.js';
import { requireStepUp, requireSuperAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../utils/AppError.js';
import { contentRoutes } from './contentRoutes.js';
import { resourceRoutes } from './resourceRoutes.js';

const idParams = z.object({ id: objectIdSchema }).strict();
const auditQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    action: z
      .string()
      .regex(/^[a-z0-9_.]+$/)
      .max(60)
      .optional(),
    actor: objectIdSchema.optional(),
    entityType: z
      .string()
      .regex(/^[a-z_]+$/)
      .max(40)
      .optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strict();

/**
 * Declarative admin route table. Every route is mounted behind `requireSuperAdmin()` at the
 * router level, so no handler can forget the check; `stepUp` marks sensitive actions (D-039).
 * Tests iterate this table to prove every route rejects unauthenticated requests.
 */
export function adminRouteTable({ administrators, auditLogs, content, resources }) {
  return [
    ...contentRoutes(content),
    ...resourceRoutes(resources),
    { method: 'get', path: '/administrators', handler: administrators.list },
    {
      method: 'post',
      path: '/administrators',
      stepUp: true,
      schemas: {
        body: z
          .object({
            name: z.string().trim().min(1).max(80),
            email: emailSchema,
            temporaryPassword: passwordSchema.optional(),
          })
          .strict(),
      },
      handler: administrators.create,
    },
    {
      method: 'patch',
      path: '/administrators/:id',
      stepUp: true,
      schemas: {
        params: idParams,
        body: z
          .object({
            name: z.string().trim().min(1).max(80).optional(),
            status: z.enum(ADMIN_STATUSES).optional(),
          })
          .strict(),
      },
      handler: administrators.update,
    },
    {
      method: 'delete',
      path: '/administrators/:id',
      stepUp: true,
      schemas: { params: idParams },
      handler: administrators.remove,
    },
    {
      method: 'post',
      path: '/administrators/:id/reset-password',
      stepUp: true,
      schemas: {
        params: idParams,
        body: z.object({ temporaryPassword: passwordSchema.optional() }).strict(),
      },
      handler: administrators.resetPassword,
    },
    {
      method: 'post',
      path: '/administrators/:id/reset-2fa',
      stepUp: true,
      schemas: { params: idParams },
      handler: administrators.resetTwoFactor,
    },
    {
      method: 'post',
      path: '/administrators/:id/revoke-sessions',
      schemas: { params: idParams },
      handler: administrators.revokeSessions,
    },
    { method: 'get', path: '/audit-logs', schemas: { query: auditQuery }, handler: auditLogs.list },
  ];
}

/** Single image in memory (never written to disk unverified); limits per API_REFERENCE.md §5.5. */
function uploadMiddleware() {
  const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10, fieldSize: 1024, parts: 12 },
  }).single('file');
  return (req, res, next) => {
    if (!req.is('multipart/form-data')) {
      return next(
        new AppError(
          415,
          ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
          'Send the image as multipart/form-data.',
        ),
      );
    }
    return parse(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new AppError(413, ERROR_CODES.PAYLOAD_TOO_LARGE, 'Images must be 10 MB or smaller.'),
        );
      }
      if (err instanceof multer.MulterError) {
        return next(
          new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Request validation failed.', [
            { path: err.field ?? 'file', message: 'Send one image in the "file" field' },
          ]),
        );
      }
      return next(new AppError(400, ERROR_CODES.BAD_REQUEST, 'Malformed upload.'));
    });
  };
}

/** `stepUp` may depend on the request (e.g. only some settings keys). */
function conditionalStepUp(predicate) {
  const check = requireStepUp();
  return (req, res, next) => (predicate(req) ? check(req, res, next) : next());
}

/**
 * Any admin write may change what visitors see, so the public read cache is cleared before
 * and after it (unpublishing therefore takes effect immediately).
 */
function clearPublicCacheOnWrite(cache) {
  return (req, res, next) => {
    if (!cache || req.method === 'GET' || req.method === 'HEAD') return next();
    cache.clear();
    res.on('finish', () => cache.clear());
    return next();
  };
}

/** /api/v1/admin — super_admin only. */
export function adminRouter({ controllers, limiters, cache }) {
  const router = Router();
  router.use(requireSuperAdmin(), limiters.admin, clearPublicCacheOnWrite(cache));
  for (const route of adminRouteTable(controllers)) {
    const chain = [];
    if (route.stepUp === true) chain.push(requireStepUp());
    else if (typeof route.stepUp === 'function') chain.push(conditionalStepUp(route.stepUp));
    if (route.upload) chain.push(limiters.uploads, uploadMiddleware());
    if (route.schemas) chain.push(validate(route.schemas));
    router[route.method](route.path, ...chain, route.handler);
  }
  return router;
}
