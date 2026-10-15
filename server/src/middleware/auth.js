import { ERROR_CODES, ROLES, SESSION_STAGES } from '@bitbyte/shared';
import { AppError } from '../utils/AppError.js';

const STEP_UP_WINDOW_MS = 5 * 60_000;

/** Cookie options for the session token: never readable by JavaScript, first-party only. */
export function sessionCookieOptions(config) {
  return { httpOnly: true, secure: config.session.secureCookie, sameSite: 'strict', path: '/' };
}

export function setSessionCookie(res, config, token) {
  res.cookie(config.session.cookieName, token, sessionCookieOptions(config));
}

export function clearSessionCookie(res, config) {
  res.clearCookie(config.session.cookieName, sessionCookieOptions(config));
}

/** Resolve the session cookie (if any) to `req.auth = { session, admin }`. */
export function loadSession({ config, sessions }) {
  return async (req, _res, next) => {
    const token = req.cookies?.[config.session.cookieName];
    req.auth = token ? await sessions.resolve(token) : null;
    next();
  };
}

const unauthenticated = () =>
  new AppError(401, ERROR_CODES.UNAUTHENTICATED, 'Sign in to continue.');

/** Require a session in one of the given stages. */
export function requireStage(...stages) {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthenticated());
    if (!stages.includes(req.auth.session.stage)) {
      if (req.auth.session.stage === SESSION_STAGES.ENROLLMENT) {
        return next(
          new AppError(
            403,
            ERROR_CODES.MFA_ENROLLMENT_REQUIRED,
            'Set up two-factor authentication to continue.',
          ),
        );
      }
      return next(unauthenticated());
    }
    return next();
  };
}

/**
 * Full access: an `active` (password + second factor) session of an active super_admin.
 * Unless `allowPasswordChange` is set, admins who must change their password are blocked.
 */
export function requireSuperAdmin({ allowPasswordChange = false } = {}) {
  const active = requireStage(SESSION_STAGES.ACTIVE);
  return (req, res, next) =>
    active(req, res, (err) => {
      if (err) return next(err);
      const { admin } = req.auth;
      if (admin.role !== ROLES.SUPER_ADMIN || admin.status !== 'active') {
        return next(new AppError(403, ERROR_CODES.FORBIDDEN, 'Not allowed.'));
      }
      if (admin.mustChangePassword && !allowPasswordChange) {
        return next(
          new AppError(
            403,
            ERROR_CODES.PASSWORD_CHANGE_REQUIRED,
            'Change your password to continue.',
          ),
        );
      }
      return next();
    });
}

/** Sensitive actions need password + TOTP re-authentication within the last 5 minutes (D-039). */
export function requireStepUp() {
  return (req, _res, next) => {
    const stepUpAt = req.auth?.session.stepUpAt;
    if (!stepUpAt || Date.now() - stepUpAt.getTime() > STEP_UP_WINDOW_MS) {
      return next(
        new AppError(
          403,
          ERROR_CODES.STEP_UP_REQUIRED,
          'Confirm your password and code to continue.',
        ),
      );
    }
    return next();
  };
}
