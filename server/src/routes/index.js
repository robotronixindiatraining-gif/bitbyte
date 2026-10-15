import express, { Router } from 'express';
import { ERROR_CODES } from '@bitbyte/shared';
import { AppError } from '../utils/AppError.js';
import { healthRouter } from './health.routes.js';

/**
 * Router mounted at /api/v1. Public, auth and admin routers are added in Stages 04–05.
 * @param {{ db: { getState: () => string }, jsonBodyLimit: string }} deps
 */
export function apiRouter({ db, jsonBodyLimit }) {
  const router = Router();
  router.use(express.json({ limit: jsonBodyLimit }));
  router.use(healthRouter({ db }));
  router.use((_req, _res, next) => {
    next(new AppError(404, ERROR_CODES.NOT_FOUND, 'API route not found.'));
  });
  return router;
}
