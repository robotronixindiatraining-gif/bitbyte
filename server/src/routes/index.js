import cookieParser from 'cookie-parser';
import express, { Router } from 'express';
import { ERROR_CODES } from '@bitbyte/shared';
import { createAdminResourcesController } from '../controllers/adminResourcesController.js';
import { createAdministratorsController } from '../controllers/administratorsController.js';
import { createAuditLogController } from '../controllers/auditLogController.js';
import { createAuthController } from '../controllers/authController.js';
import { createContentController } from '../controllers/contentController.js';
import { createPublicController } from '../controllers/publicController.js';
import { loadSession } from '../middleware/auth.js';
import { originCheck } from '../middleware/originCheck.js';
import { AppError } from '../utils/AppError.js';
import { adminRouter } from './admin/index.js';
import { authRouter } from './auth.routes.js';
import { healthRouter } from './health.routes.js';
import { publicLeadRouter, publicRouter } from './public/index.js';

/**
 * Router mounted at /api/v1.
 * - /public: anonymous, published content only.
 * - /auth and /admin: origin-checked (CSRF) and cookie-session aware; /admin is super_admin only.
 */
export function apiRouter({ config, db, services, limiters }) {
  const router = Router();
  const publicController = createPublicController(services);
  router.use(
    publicLeadRouter({
      controller: publicController,
      limiters,
      allowedOrigins: config.allowedOrigins,
    }),
  );
  router.use(express.json({ limit: config.jsonBodyLimit }));
  router.use(healthRouter({ db }));

  router.use('/public', publicRouter({ controller: publicController, limiters }));

  const authenticated = Router();
  authenticated.use(
    originCheck({
      allowedOrigins: config.allowedOrigins,
      allowMultipart: (req) => req.method === 'POST' && req.path === '/admin/media',
    }),
  );
  authenticated.use(cookieParser());
  authenticated.use(loadSession({ config, sessions: services.sessions }));
  authenticated.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  authenticated.use(
    '/auth',
    authRouter({ controller: createAuthController({ config, ...services }), limiters }),
  );
  authenticated.use(
    '/admin',
    adminRouter({
      controllers: {
        administrators: createAdministratorsController(services),
        auditLogs: createAuditLogController(),
        content: createContentController(services),
        resources: createAdminResourcesController(services),
      },
      limiters,
      cache: services.cache,
    }),
  );
  router.use(authenticated);

  router.use((_req, _res, next) => {
    next(new AppError(404, ERROR_CODES.NOT_FOUND, 'API route not found.'));
  });
  return router;
}
