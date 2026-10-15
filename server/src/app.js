import express from 'express';
import { pinoHttp } from 'pino-http';
import { API_PREFIX } from '@bitbyte/shared';
import { createServices } from './container.js';
import { createRateLimiters } from './middleware/rateLimits.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { apiRouter } from './routes/index.js';
import { canonicalHost, normalisePaths, siteRouter } from './seo/siteRoutes.js';

/**
 * Express application factory. Kept free of side effects (no listen, no DB connect) so tests
 * can create isolated instances.
 *
 * @param {{
 *   config: ReturnType<typeof import('./config/env.js').loadConfig>,
 *   logger: import('pino').Logger,
 *   db: { getState: () => string },
 *   overrides?: { limits?: object, mailer?: object, audit?: object, mediaStorage?: object,
 *     turnstile?: object, fetch?: typeof fetch, cloudinaryClient?: object },
 * }} deps
 */
export function createApp({ config, logger, db, overrides = {} }) {
  const services = createServices({ config, logger, overrides });
  const limiters = createRateLimiters(overrides.limits);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);

  app.use(requestId());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      autoLogging: { ignore: (req) => req.url.startsWith(`${API_PREFIX}/health`) },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      serializers: {
        // Path only: query strings can carry search terms such as names or e-mail addresses.
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: String(req.url ?? '').split('?')[0],
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(securityHeaders(config));
  app.use(canonicalHost(config.canonicalHost));

  app.use(
    API_PREFIX,
    (_req, res, next) => {
      res.set('X-Robots-Tag', 'noindex');
      next();
    },
    apiRouter({ config, db, services, limiters }),
  );

  app.use(normalisePaths());
  app.use(siteRouter({ config, services, db }));

  app.use(notFound());
  app.use(errorHandler());
  app.locals.services = services;
  return app;
}
