import { toSafeAdmin } from '../services/authService.js';
import { generateTemporaryPassword } from '../security/passwords.js';
import { requestContext } from './requestContext.js';

export function createAdministratorsController({ admins }) {
  return {
    async list(_req, res) {
      res.json({ data: await admins.list() });
    },

    /** The temporary password is returned once only when the server generated it. */
    async create(req, res) {
      const { name, email, temporaryPassword } = req.validated.body;
      const password = temporaryPassword ?? generateTemporaryPassword();
      const admin = await admins.create(
        req.auth.admin,
        { name, email, temporaryPassword: password },
        requestContext(req),
      );
      res
        .status(201)
        .set('Cache-Control', 'no-store')
        .json({
          data: {
            admin: toSafeAdmin(admin),
            ...(temporaryPassword ? {} : { temporaryPassword: password }),
          },
        });
    },

    async update(req, res) {
      const admin = await admins.update(
        req.auth.admin,
        req.validated.params.id,
        req.validated.body,
        requestContext(req),
      );
      res.json({ data: toSafeAdmin(admin) });
    },

    async remove(req, res) {
      await admins.remove(req.auth.admin, req.validated.params.id, requestContext(req));
      res.status(204).end();
    },

    async resetPassword(req, res) {
      const provided = req.validated.body.temporaryPassword;
      const password = provided ?? generateTemporaryPassword();
      await admins.resetPassword(
        req.auth.admin,
        req.validated.params.id,
        { temporaryPassword: password },
        requestContext(req),
      );
      res
        .set('Cache-Control', 'no-store')
        .json({ data: provided ? { reset: true } : { reset: true, temporaryPassword: password } });
    },

    async resetTwoFactor(req, res) {
      await admins.resetTwoFactor(req.auth.admin, req.validated.params.id, requestContext(req));
      res.json({ data: { reset: true } });
    },

    async revokeSessions(req, res) {
      await admins.revokeSessions(req.auth.admin, req.validated.params.id, requestContext(req));
      res.status(204).end();
    },
  };
}
