import { SESSION_STAGES } from '@bitbyte/shared';
import { clearSessionCookie, setSessionCookie } from '../middleware/auth.js';
import { STEP_UP_WINDOW_MS, toSafeAdmin } from '../services/authService.js';
import { requestContext } from './requestContext.js';

export function createAuthController({ config, auth, sessions }) {
  return {
    async login(req, res) {
      const { email, password } = req.validated.body;
      const { token, stage } = await auth.login({ email, password }, requestContext(req));
      setSessionCookie(res, config, token);
      res.json({ data: { stage } });
    },

    async verify(req, res) {
      const { token } = await auth.verifySecondFactor(
        req.auth,
        req.validated.body,
        requestContext(req),
      );
      setSessionCookie(res, config, token);
      const fresh = await sessions.resolve(token);
      res.json({ data: { stage: SESSION_STAGES.ACTIVE, admin: toSafeAdmin(fresh.admin) } });
    },

    async enrollStart(req, res) {
      const result = await auth.startEnrollment(req.auth);
      res.set('Cache-Control', 'no-store').json({ data: result });
    },

    async enrollConfirm(req, res) {
      const { token, recoveryCodes } = await auth.confirmEnrollment(
        req.auth,
        req.validated.body,
        requestContext(req),
      );
      setSessionCookie(res, config, token);
      res
        .set('Cache-Control', 'no-store')
        .json({ data: { stage: SESSION_STAGES.ACTIVE, recoveryCodes } });
    },

    async stepUp(req, res) {
      const result = await auth.stepUp(req.auth, req.validated.body, requestContext(req));
      res.json({ data: result });
    },

    async regenerateRecoveryCodes(req, res) {
      const result = await auth.regenerateRecoveryCodes(req.auth, requestContext(req));
      res.set('Cache-Control', 'no-store').json({ data: result });
    },

    async changePassword(req, res) {
      const { token } = await auth.changePassword(
        req.auth,
        req.validated.body,
        requestContext(req),
      );
      setSessionCookie(res, config, token);
      res.status(204).end();
    },

    async logout(req, res) {
      if (req.auth) await auth.logout(req.auth, requestContext(req));
      clearSessionCookie(res, config);
      res.status(204).end();
    },

    session(req, res) {
      const { session, admin } = req.auth;
      res.json({
        data: {
          stage: session.stage,
          admin: toSafeAdmin(admin),
          stepUpValidUntil: session.stepUpAt
            ? new Date(session.stepUpAt.getTime() + STEP_UP_WINDOW_MS)
            : null,
          expiresAt: session.expiresAt,
        },
      });
    },

    async listSessions(req, res) {
      const list = await sessions.listForAdmin(req.auth.admin._id);
      res.json({
        data: list.map((s) => ({
          id: String(s._id),
          current: String(s._id) === String(req.auth.session._id),
          createdAt: s.createdAt,
          lastSeenAt: s.lastSeenAt,
          userAgent: s.userAgent,
        })),
      });
    },

    async revokeSession(req, res) {
      await sessions.revokeOwn(req.auth.admin._id, req.validated.params.id);
      res.status(204).end();
    },
  };
}
