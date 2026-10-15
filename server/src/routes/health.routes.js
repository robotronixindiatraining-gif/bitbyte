import { Router } from 'express';
import { DB_STATES, ERROR_CODES } from '@bitbyte/shared';
import { AppError } from '../utils/AppError.js';

/**
 * Liveness and readiness (D-041). Neither exposes versions, hosts or configuration.
 * @param {{ db: { getState: () => string } }} deps
 */
export function healthRouter({ db }) {
  const router = Router();

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/health', (_req, res) => {
    res.json({ data: { status: 'ok', db: db.getState() } });
  });

  router.get('/health/ready', (_req, res) => {
    const state = db.getState();
    if (state !== DB_STATES.UP) {
      throw new AppError(503, ERROR_CODES.SERVICE_UNAVAILABLE, 'Service is not ready.', {
        db: state,
      });
    }
    res.json({ data: { status: 'ready', db: state } });
  });

  return router;
}
