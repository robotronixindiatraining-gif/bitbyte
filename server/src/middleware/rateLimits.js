import { ERROR_CODES } from '@bitbyte/shared';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { AppError } from '../utils/AppError.js';

/** Default limits (API_REFERENCE.md §2). Tests may override them. */
export const DEFAULT_LIMITS = Object.freeze({
  loginPerAccount: { windowMs: 15 * 60_000, limit: 5 },
  loginPerIp: { windowMs: 60 * 60_000, limit: 20 },
  mfaPerIp: { windowMs: 15 * 60_000, limit: 30 },
  admin: { windowMs: 5 * 60_000, limit: 600 },
  public: { windowMs: 60_000, limit: 120 },
  uploads: { windowMs: 10 * 60_000, limit: 30 },
  leadsPerHour: { windowMs: 60 * 60_000, limit: 5 },
  leadsPerDay: { windowMs: 24 * 60 * 60_000, limit: 20 },
});

function limiter({ windowMs, limit }, keyGenerator) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator,
    handler: (_req, _res, next) =>
      next(
        new AppError(
          429,
          ERROR_CODES.RATE_LIMITED,
          'Too many requests. Please wait and try again.',
        ),
      ),
  });
}

const ipKey = (req) => ipKeyGenerator(req.ip ?? '');

/** In-memory limiters (single instance; see D-011 for scaling). */
export function createRateLimiters(overrides = {}) {
  const limits = { ...DEFAULT_LIMITS, ...overrides };
  return {
    loginPerAccount: limiter(
      limits.loginPerAccount,
      (req) =>
        `${ipKey(req)}:${String(req.body?.email ?? '')
          .trim()
          .toLowerCase()
          .slice(0, 254)}`,
    ),
    loginPerIp: limiter(limits.loginPerIp, ipKey),
    mfaPerIp: limiter(limits.mfaPerIp, ipKey),
    admin: limiter(limits.admin, (req) =>
      req.auth ? `session:${req.auth.session._id}` : ipKey(req),
    ),
    public: limiter(limits.public, ipKey),
    uploads: limiter(limits.uploads, (req) =>
      req.auth ? `session:${req.auth.session._id}` : ipKey(req),
    ),
    leadsPerHour: limiter(limits.leadsPerHour, ipKey),
    leadsPerDay: limiter(limits.leadsPerDay, ipKey),
  };
}
