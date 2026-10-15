import { Router } from 'express';
import { z } from 'zod';
import { ADMIN_STATUSES, emailSchema, objectIdSchema, passwordSchema } from '@bitbyte/shared';
import { requireStepUp, requireSuperAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

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
export function adminRouteTable({ administrators, auditLogs }) {
  return [
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

/** /api/v1/admin — super_admin only. */
export function adminRouter({ controllers, limiters }) {
  const router = Router();
  router.use(requireSuperAdmin(), limiters.admin);
  for (const route of adminRouteTable(controllers)) {
    const chain = [];
    if (route.stepUp) chain.push(requireStepUp());
    if (route.schemas) chain.push(validate(route.schemas));
    router[route.method](route.path, ...chain, route.handler);
  }
  return router;
}
