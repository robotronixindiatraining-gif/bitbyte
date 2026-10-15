import { ERROR_CODES } from '@bitbyte/shared';
import { AppError } from '../utils/AppError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection for cookie-authenticated, state-changing requests (D-012):
 * 1. the Origin (or, failing that, Referer) must be an allowed origin;
 * 2. `X-Requested-With: fetch` must be present — a custom header forces a CORS preflight, which
 *    cross-site pages cannot pass because the API sends no CORS headers;
 * 3. request bodies must be JSON.
 * SameSite=Strict session cookies are the first line of defence; this is the second.
 *
 * @param {{ allowedOrigins: readonly string[] }} options
 */
export function originCheck({ allowedOrigins }) {
  const allowed = new Set(allowedOrigins);
  const reject = (message) => new AppError(403, ERROR_CODES.ORIGIN_REJECTED, message);

  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    let origin = req.get('Origin');
    if (!origin) {
      const referer = req.get('Referer');
      try {
        origin = referer ? new URL(referer).origin : null;
      } catch {
        origin = null;
      }
    }
    if (!origin || !allowed.has(origin)) return next(reject('Request origin is not allowed.'));
    if (req.get('X-Requested-With') !== 'fetch') return next(reject('Missing request header.'));

    const hasBody = Number(req.get('Content-Length') ?? 0) > 0 || req.get('Transfer-Encoding');
    if (hasBody && !req.is('application/json')) {
      return next(
        new AppError(415, ERROR_CODES.UNSUPPORTED_MEDIA_TYPE, 'Request body must be JSON.'),
      );
    }
    return next();
  };
}
