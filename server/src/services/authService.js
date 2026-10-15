import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { ERROR_CODES, SESSION_STAGES } from '@bitbyte/shared';
import { Admin, Session } from '../models/index.js';
import { decryptSecret, encryptSecret, hashIp } from '../security/crypto.js';
import {
  generateTemporaryPassword,
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from '../security/passwords.js';
import {
  buildOtpauthUri,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  matchTotp,
} from '../security/totp.js';
import { AppError } from '../utils/AppError.js';

export const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_BASE_MS = 15 * 60_000;
const LOCKOUT_MAX_MS = 24 * 3_600_000;
const MAX_MFA_ATTEMPTS = 5;
const PENDING_ENROLLMENT_MS = 15 * 60_000;
export const STEP_UP_WINDOW_MS = 5 * 60_000;

const invalidCredentials = () =>
  new AppError(401, ERROR_CODES.INVALID_CREDENTIALS, 'Email or password is incorrect.');
const invalidCode = () =>
  new AppError(401, ERROR_CODES.INVALID_MFA_CODE, 'The code is incorrect or has expired.');
const auditUnavailable = () =>
  new AppError(
    503,
    ERROR_CODES.SERVICE_UNAVAILABLE,
    'The action could not be recorded. Please try again.',
  );

/** Fields that are safe to return to the admin UI. */
export function toSafeAdmin(admin) {
  return {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    mustChangePassword: admin.mustChangePassword,
    twoFactorEnabled: Boolean(admin.twoFactor?.enabled),
    securityAlert: Boolean(admin.securityAlertUntil && admin.securityAlertUntil > new Date()),
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
  };
}

/**
 * Super-admin authentication (D-026, D-027, D-039). A password alone never yields an `active`
 * session: enrolled admins must pass TOTP or a recovery code; others get a restricted
 * `enrollment` session that can only set up two-factor authentication.
 */
export function createAuthService({ config, sessions, audit, notifications }) {
  function requireSecrets() {
    const { totpKey, recoveryCodePepper } = config.secrets;
    if (!totpKey || !recoveryCodePepper) {
      throw new AppError(
        503,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Authentication is not configured (TOTP_ENCRYPTION_KEY, RECOVERY_CODE_PEPPER).',
      );
    }
    return { totpKey, recoveryCodePepper };
  }

  const context = (ctx) => ({
    ipHash: hashIp(ctx.ip, config.secrets.ipHashSalt),
    requestId: ctx.requestId,
  });

  /** Count a failed password/code attempt; lock the account after repeated failures. */
  async function registerFailure(admin, ctx) {
    const updated = await Admin.findOneAndUpdate(
      { _id: admin._id },
      { $inc: { failedLoginCount: 1 } },
      { returnDocument: 'after' },
    );
    if (updated && updated.failedLoginCount >= LOCKOUT_THRESHOLD) {
      const duration = Math.min(LOCKOUT_BASE_MS * 2 ** updated.lockouts, LOCKOUT_MAX_MS);
      await Admin.updateOne(
        { _id: admin._id },
        {
          $set: { lockUntil: new Date(Date.now() + duration), failedLoginCount: 0 },
          $inc: { lockouts: 1 },
        },
      );
      await audit.recordSafely({
        actor: admin,
        action: 'auth.locked',
        outcome: 'succeeded',
        entityType: 'admin',
        entityId: admin._id,
        meta: { minutes: Math.round(duration / 60_000) },
        context: context(ctx),
      });
    }
  }

  const isLocked = (admin) => Boolean(admin.lockUntil && admin.lockUntil > new Date());

  /** Verify a TOTP code with replay protection (the time-step must be newer than the last one). */
  async function consumeTotp(admin, code) {
    const { totpKey } = requireSecrets();
    if (!admin.twoFactor?.enabled || !admin.twoFactor.secretEncrypted) return false;
    const step = matchTotp(decryptSecret(admin.twoFactor.secretEncrypted, totpKey), code);
    if (step === null) return false;
    const result = await Admin.updateOne(
      {
        _id: admin._id,
        $or: [
          { 'twoFactor.lastUsedStep': null },
          { 'twoFactor.lastUsedStep': mongoose.trusted({ $lt: step }) },
        ],
      },
      { $set: { 'twoFactor.lastUsedStep': step } },
    );
    return result.modifiedCount === 1;
  }

  /** Atomically remove a recovery code; succeeds only once per code. */
  async function consumeRecoveryCode(admin, code) {
    const { recoveryCodePepper } = requireSecrets();
    const hash = hashRecoveryCode(code, recoveryCodePepper);
    const result = await Admin.updateOne(
      { _id: admin._id, 'twoFactor.recoveryCodeHashes': hash },
      { $pull: { 'twoFactor.recoveryCodeHashes': hash } },
    );
    return result.modifiedCount === 1;
  }

  async function login({ email, password }, ctx) {
    requireSecrets();
    const admin = await Admin.findOne({ email: String(email).trim().toLowerCase() }).select(
      '+passwordHash +twoFactor',
    );
    if (!admin) {
      await verifyAgainstDummy(password);
      await audit.recordSafely({
        action: 'auth.login_failed',
        outcome: 'failed',
        meta: { reason: 'unknown_account' },
        context: context(ctx),
      });
      throw invalidCredentials();
    }

    const passwordOk = await verifyPassword(admin.passwordHash, password);
    const deniedReason = admin.status !== 'active' ? 'disabled' : isLocked(admin) ? 'locked' : null;
    if (deniedReason || !passwordOk) {
      if (!deniedReason) await registerFailure(admin, ctx);
      await audit.recordSafely({
        actor: admin,
        action: 'auth.login_failed',
        outcome: deniedReason ? 'denied' : 'failed',
        entityType: 'admin',
        entityId: admin._id,
        meta: { reason: deniedReason ?? 'bad_password' },
        context: context(ctx),
      });
      throw invalidCredentials();
    }

    const stage = admin.twoFactor?.enabled ? SESSION_STAGES.MFA_PENDING : SESSION_STAGES.ENROLLMENT;
    const created = await sessions.create({ adminId: admin._id, stage, ...ctx });
    await audit.recordSafely({
      actor: admin,
      action: 'auth.password_verified',
      outcome: 'succeeded',
      entityType: 'admin',
      entityId: admin._id,
      meta: { stage },
      context: context(ctx),
    });
    return { ...created, stage, admin };
  }

  /** Second factor for an `mfa_pending` session → rotates to a full `active` session. */
  async function verifySecondFactor({ session, admin }, { code, recoveryCode }, ctx) {
    if (session.stage !== SESSION_STAGES.MFA_PENDING) {
      throw new AppError(401, ERROR_CODES.UNAUTHENTICATED, 'Sign in again.');
    }
    if (isLocked(admin)) {
      await sessions.revoke(session._id);
      throw invalidCredentials();
    }

    const usedRecoveryCode = Boolean(recoveryCode);
    const ok = usedRecoveryCode
      ? await consumeRecoveryCode(admin, recoveryCode)
      : await consumeTotp(admin, code);

    if (!ok) {
      const updated = await Session.findOneAndUpdate(
        { _id: session._id },
        { $inc: { mfaAttempts: 1 } },
        { returnDocument: 'after' },
      );
      if (!updated || updated.mfaAttempts >= MAX_MFA_ATTEMPTS) await sessions.revoke(session._id);
      await registerFailure(admin, ctx);
      await audit.recordSafely({
        actor: admin,
        action: 'auth.mfa_failed',
        outcome: 'failed',
        entityType: 'admin',
        entityId: admin._id,
        meta: { method: usedRecoveryCode ? 'recovery_code' : 'totp' },
        context: context(ctx),
      });
      throw invalidCode();
    }

    // Fail closed: no audit entry, no session.
    try {
      await audit.record({
        actor: admin,
        action: 'auth.login',
        outcome: 'succeeded',
        entityType: 'admin',
        entityId: admin._id,
        meta: { method: usedRecoveryCode ? 'recovery_code' : 'totp' },
        context: context(ctx),
      });
    } catch {
      throw auditUnavailable();
    }

    await sessions.revoke(session._id);
    const created = await sessions.create({
      adminId: admin._id,
      stage: SESSION_STAGES.ACTIVE,
      ...ctx,
    });
    await Admin.updateOne(
      { _id: admin._id },
      { $set: { failedLoginCount: 0, lockouts: 0, lockUntil: null, lastLoginAt: new Date() } },
    );

    if (usedRecoveryCode) {
      const remaining = (await Admin.findById(admin._id).select('+twoFactor')).twoFactor
        .recoveryCodeHashes.length;
      await notifications.notify({
        affected: admin,
        subject: 'Security alert: a recovery code was used to sign in',
        text: `A recovery code was used to sign in to the BitByte admin as ${admin.email}. ${remaining} recovery codes remain. If this was not you, reset this account's two-factor authentication immediately.`,
      });
    }
    return created;
  }

  /** Start (re-)enrolment: a pending secret that becomes active only after a confirmed code. */
  async function startEnrollment({ session, admin }) {
    const { totpKey } = requireSecrets();
    if (session.stage === SESSION_STAGES.ACTIVE && admin.twoFactor?.enabled) {
      requireRecentStepUp(session);
    }
    const secret = generateTotpSecret();
    await Admin.updateOne(
      { _id: admin._id },
      {
        $set: {
          'twoFactor.pendingSecretEncrypted': encryptSecret(secret, totpKey),
          'twoFactor.pendingCreatedAt': new Date(),
        },
      },
    );
    const otpauthUri = buildOtpauthUri(secret, admin.email);
    return {
      otpauthUri,
      manualEntryKey: secret,
      qrCodeDataUrl: await QRCode.toDataURL(otpauthUri),
    };
  }

  /** Confirm enrolment → activates 2FA, issues recovery codes once, replaces all sessions. */
  async function confirmEnrollment({ admin }, { code }, ctx) {
    const { totpKey, recoveryCodePepper } = requireSecrets();
    const pending = admin.twoFactor?.pendingSecretEncrypted;
    const pendingAt = admin.twoFactor?.pendingCreatedAt;
    if (!pending || !pendingAt || Date.now() - pendingAt.getTime() > PENDING_ENROLLMENT_MS) {
      throw new AppError(409, ERROR_CODES.INVALID_STATE, 'Start two-factor setup again.');
    }
    const secret = decryptSecret(pending, totpKey);
    const step = matchTotp(secret, code);
    if (step === null) {
      await registerFailure(admin, ctx);
      throw invalidCode();
    }

    let entry;
    try {
      entry = await audit.begin({
        actor: admin,
        action: 'auth.2fa_enrolled',
        entityType: 'admin',
        entityId: admin._id,
        meta: { reenrolment: Boolean(admin.twoFactor?.enabled) },
        context: context(ctx),
      });
    } catch {
      throw auditUnavailable();
    }

    const recoveryCodes = generateRecoveryCodes(10);
    const now = new Date();
    await Admin.updateOne(
      { _id: admin._id },
      {
        $set: {
          'twoFactor.enabled': true,
          'twoFactor.secretEncrypted': encryptSecret(secret, totpKey),
          'twoFactor.pendingSecretEncrypted': null,
          'twoFactor.pendingCreatedAt': null,
          'twoFactor.lastUsedStep': step,
          'twoFactor.enrolledAt': now,
          'twoFactor.recoveryCodeHashes': recoveryCodes.map((c) =>
            hashRecoveryCode(c, recoveryCodePepper),
          ),
          'twoFactor.recoveryCodesGeneratedAt': now,
          sessionsValidAfter: now,
          failedLoginCount: 0,
          lastLoginAt: now,
        },
      },
    );
    await sessions.revokeAllForAdmin(admin._id);
    const created = await sessions.create({
      adminId: admin._id,
      stage: SESSION_STAGES.ACTIVE,
      ...ctx,
    });
    await entry.complete('succeeded');
    return { ...created, recoveryCodes };
  }

  function requireRecentStepUp(session) {
    if (!session.stepUpAt || Date.now() - session.stepUpAt.getTime() > STEP_UP_WINDOW_MS) {
      throw new AppError(
        403,
        ERROR_CODES.STEP_UP_REQUIRED,
        'Confirm your password and code to continue.',
      );
    }
  }

  /** Re-authenticate (password + TOTP) for sensitive actions; valid for 5 minutes. */
  async function stepUp({ session, admin }, { password, code }, ctx) {
    const withHash = await Admin.findById(admin._id).select('+passwordHash +twoFactor');
    const ok =
      (await verifyPassword(withHash.passwordHash, password)) &&
      (await consumeTotp(withHash, code));
    if (!ok) {
      await registerFailure(admin, ctx);
      await audit.recordSafely({
        actor: admin,
        action: 'auth.step_up',
        outcome: 'failed',
        entityType: 'admin',
        entityId: admin._id,
        context: context(ctx),
      });
      throw invalidCode();
    }
    const stepUpAt = new Date();
    await Session.updateOne({ _id: session._id }, { $set: { stepUpAt } });
    await audit.recordSafely({
      actor: admin,
      action: 'auth.step_up',
      outcome: 'succeeded',
      entityType: 'admin',
      entityId: admin._id,
      context: context(ctx),
    });
    return { stepUpValidUntil: new Date(stepUpAt.getTime() + STEP_UP_WINDOW_MS) };
  }

  /**
   * Change your own password. The current password AND a current TOTP code are required (an
   * inline re-authentication). All sessions are replaced with one new session.
   */
  async function changePassword({ admin }, { currentPassword, newPassword, code }, ctx) {
    const withHash = await Admin.findById(admin._id).select('+passwordHash +twoFactor');
    const ok =
      (await verifyPassword(withHash.passwordHash, currentPassword)) &&
      (await consumeTotp(withHash, code));
    if (!ok) {
      await registerFailure(admin, ctx);
      throw invalidCode();
    }
    if (newPassword === currentPassword || newPassword.toLowerCase() === admin.email) {
      throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Choose a different password.', [
        { path: 'body.newPassword', message: 'Must differ from the current password and e-mail' },
      ]);
    }
    let entry;
    try {
      entry = await audit.begin({
        actor: admin,
        action: 'auth.password_changed',
        entityType: 'admin',
        entityId: admin._id,
        context: context(ctx),
      });
    } catch {
      throw auditUnavailable();
    }
    const now = new Date();
    await Admin.updateOne(
      { _id: admin._id },
      {
        $set: {
          passwordHash: await hashPassword(newPassword),
          passwordChangedAt: now,
          sessionsValidAfter: now,
          mustChangePassword: false,
        },
      },
    );
    await sessions.revokeAllForAdmin(admin._id);
    const created = await sessions.create({
      adminId: admin._id,
      stage: SESSION_STAGES.ACTIVE,
      ...ctx,
    });
    await entry.complete('succeeded');
    await notifications.notify({
      affected: admin,
      includeOthers: false,
      subject: 'Your BitByte admin password was changed',
      text: `The password for ${admin.email} was changed. If this was not you, contact another administrator immediately.`,
    });
    return created;
  }

  async function regenerateRecoveryCodes({ session, admin }, ctx) {
    const { recoveryCodePepper } = requireSecrets();
    requireRecentStepUp(session);
    let entry;
    try {
      entry = await audit.begin({
        actor: admin,
        action: 'auth.recovery_codes_regenerated',
        entityType: 'admin',
        entityId: admin._id,
        context: context(ctx),
      });
    } catch {
      throw auditUnavailable();
    }
    const codes = generateRecoveryCodes(10);
    await Admin.updateOne(
      { _id: admin._id },
      {
        $set: {
          'twoFactor.recoveryCodeHashes': codes.map((c) => hashRecoveryCode(c, recoveryCodePepper)),
          'twoFactor.recoveryCodesGeneratedAt': new Date(),
        },
      },
    );
    await entry.complete('succeeded');
    await notifications.notify({
      affected: admin,
      includeOthers: false,
      subject: 'Your BitByte admin recovery codes were regenerated',
      text: `New recovery codes were generated for ${admin.email}; the old codes no longer work.`,
    });
    return { recoveryCodes: codes };
  }

  async function logout({ session, admin }, ctx) {
    await sessions.revoke(session._id);
    await audit.recordSafely({
      actor: admin,
      action: 'auth.logout',
      outcome: 'succeeded',
      entityType: 'admin',
      entityId: admin._id,
      context: context(ctx),
    });
  }

  return {
    login,
    verifySecondFactor,
    startEnrollment,
    confirmEnrollment,
    stepUp,
    requireRecentStepUp,
    changePassword,
    regenerateRecoveryCodes,
    logout,
    context,
    generateTemporaryPassword,
  };
}
