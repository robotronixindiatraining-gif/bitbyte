import { Router } from 'express';
import { z } from 'zod';
import {
  SESSION_STAGES,
  emailSchema,
  objectIdSchema,
  passwordSchema,
  recoveryCodeSchema,
  totpCodeSchema,
} from '@bitbyte/shared';
import { requireStage, requireStepUp, requireSuperAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const { ACTIVE, ENROLLMENT, MFA_PENDING } = SESSION_STAGES;
const anyPassword = z.string().min(1).max(128);

const schemas = {
  login: z.object({ email: emailSchema, password: anyPassword }).strict(),
  verify: z
    .object({ code: totpCodeSchema.optional(), recoveryCode: recoveryCodeSchema.optional() })
    .strict()
    .refine(
      (b) => Boolean(b.code) !== Boolean(b.recoveryCode),
      'Provide either a code or a recovery code',
    ),
  code: z.object({ code: totpCodeSchema }).strict(),
  stepUp: z.object({ password: anyPassword, code: totpCodeSchema }).strict(),
  changePassword: z
    .object({ currentPassword: anyPassword, newPassword: passwordSchema, code: totpCodeSchema })
    .strict(),
  sessionId: z.object({ id: objectIdSchema }).strict(),
};

/** /api/v1/auth — the only sign-in surface; there is no registration (D-004). */
export function authRouter({ controller, limiters }) {
  const router = Router();
  router.post(
    '/login',
    limiters.loginPerIp,
    limiters.loginPerAccount,
    validate({ body: schemas.login }),
    controller.login,
  );
  router.post(
    '/login/verify',
    limiters.mfaPerIp,
    requireStage(MFA_PENDING),
    validate({ body: schemas.verify }),
    controller.verify,
  );
  router.post('/2fa/enroll/start', requireStage(ENROLLMENT, ACTIVE), controller.enrollStart);
  router.post(
    '/2fa/enroll/confirm',
    limiters.mfaPerIp,
    requireStage(ENROLLMENT, ACTIVE),
    validate({ body: schemas.code }),
    controller.enrollConfirm,
  );
  router.post(
    '/step-up',
    limiters.mfaPerIp,
    requireSuperAdmin({ allowPasswordChange: true }),
    validate({ body: schemas.stepUp }),
    controller.stepUp,
  );
  router.post(
    '/2fa/recovery-codes',
    requireSuperAdmin(),
    requireStepUp(),
    controller.regenerateRecoveryCodes,
  );
  router.post(
    '/change-password',
    limiters.mfaPerIp,
    requireSuperAdmin({ allowPasswordChange: true }),
    validate({ body: schemas.changePassword }),
    controller.changePassword,
  );
  router.post('/logout', controller.logout);
  router.get('/session', requireStage(MFA_PENDING, ENROLLMENT, ACTIVE), controller.session);
  router.get('/sessions', requireSuperAdmin(), controller.listSessions);
  router.delete(
    '/sessions/:id',
    requireSuperAdmin(),
    validate({ params: schemas.sessionId }),
    controller.revokeSession,
  );
  return router;
}
