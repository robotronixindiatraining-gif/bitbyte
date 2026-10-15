import mongoose from 'mongoose';
import { ERROR_CODES, ROLES } from '@bitbyte/shared';
import { Admin } from '../models/index.js';
import { hashPassword } from '../security/passwords.js';
import { AppError } from '../utils/AppError.js';
import { toSafeAdmin } from './authService.js';

const notFound = () => new AppError(404, ERROR_CODES.NOT_FOUND, 'Administrator not found.');
const auditUnavailable = () =>
  new AppError(
    503,
    ERROR_CODES.SERVICE_UNAVAILABLE,
    'The action could not be recorded. Please try again.',
  );

/**
 * Super-admin account management (D-004, D-039). Every account has the same role; actions on
 * other accounts are audited before they run (fail closed) and the affected admins are notified.
 * `actor` is an Admin document, or the string 'system' for CLI commands.
 */
export function createAdminService({ audit, sessions, notifications, context }) {
  async function beginAudit(actor, action, target, ctx, meta) {
    try {
      return await audit.begin({
        actor,
        action,
        entityType: 'admin',
        entityId: target?._id ?? null,
        summary: target ? `Target: ${target.email}` : null,
        meta,
        context: context(ctx ?? {}),
      });
    } catch {
      throw auditUnavailable();
    }
  }

  async function findTarget(id) {
    const admin = await Admin.findById(id).catch(() => null);
    if (!admin) throw notFound();
    return admin;
  }

  function assertNotSelf(actor, target, message) {
    if (actor !== 'system' && String(actor._id) === String(target._id)) {
      throw new AppError(409, ERROR_CODES.INVALID_STATE, message);
    }
  }

  async function assertNotLastActive(target) {
    if (target.status !== 'active') return;
    const others = await Admin.countDocuments({
      status: 'active',
      _id: mongoose.trusted({ $ne: target._id }),
    });
    if (others === 0) {
      throw new AppError(
        409,
        ERROR_CODES.INVALID_STATE,
        'At least one active administrator must remain.',
      );
    }
  }

  async function list() {
    const admins = await Admin.find().select('+twoFactor').sort({ createdAt: 1 });
    return admins.map(toSafeAdmin);
  }

  /** Create a super admin with a temporary password; 2FA enrolment is forced at first sign-in. */
  async function create(actor, { name, email, temporaryPassword }, ctx) {
    const normalized = email.trim().toLowerCase();
    if (await Admin.exists({ email: normalized })) {
      throw new AppError(
        409,
        ERROR_CODES.EMAIL_TAKEN,
        'An administrator with this e-mail already exists.',
      );
    }
    const entry = await beginAudit(actor, 'admin.create', null, ctx, { email: normalized });
    try {
      const admin = await Admin.create({
        name,
        email: normalized,
        passwordHash: await hashPassword(temporaryPassword),
        role: ROLES.SUPER_ADMIN,
        mustChangePassword: true,
        createdBy: actor === 'system' ? null : actor._id,
      });
      await entry.complete('succeeded', { entityId: admin._id });
      return admin;
    } catch (err) {
      await entry.complete('failed');
      if (err?.code === 11000) {
        throw new AppError(
          409,
          ERROR_CODES.EMAIL_TAKEN,
          'An administrator with this e-mail already exists.',
        );
      }
      throw err;
    }
  }

  async function update(actor, id, { name, status }, ctx) {
    const target = await findTarget(id);
    const changes = {};
    if (name !== undefined) changes.name = name;
    if (status !== undefined && status !== target.status) {
      if (status === 'disabled') {
        assertNotSelf(actor, target, 'You cannot disable your own account.');
        await assertNotLastActive(target);
      }
      changes.status = status;
    }
    if (Object.keys(changes).length === 0) return target;

    const entry = await beginAudit(
      actor,
      status === 'disabled' ? 'admin.disable' : 'admin.update',
      target,
      ctx,
      {
        status: changes.status ?? null,
      },
    );
    if (changes.status === 'disabled') changes.sessionsValidAfter = new Date();
    await Admin.updateOne({ _id: target._id }, { $set: changes });
    if (changes.status === 'disabled') await sessions.revokeAllForAdmin(target._id);
    await entry.complete('succeeded');
    return Admin.findById(target._id).select('+twoFactor');
  }

  async function remove(actor, id, ctx) {
    const target = await findTarget(id);
    assertNotSelf(actor, target, 'You cannot delete your own account.');
    await assertNotLastActive(target);
    const entry = await beginAudit(actor, 'admin.delete', target, ctx);
    await sessions.revokeAllForAdmin(target._id);
    await Admin.deleteOne({ _id: target._id });
    await entry.complete('succeeded');
  }

  /** New temporary password; two-factor stays in place; all sessions end (D-039 #7). */
  async function resetPassword(actor, id, { temporaryPassword }, ctx) {
    const target = await findTarget(id);
    assertNotSelf(actor, target, 'Use "Change password" for your own account.');
    const entry = await beginAudit(actor, 'admin.password_reset', target, ctx);
    const now = new Date();
    await Admin.updateOne(
      { _id: target._id },
      {
        $set: {
          passwordHash: await hashPassword(temporaryPassword),
          passwordChangedAt: now,
          sessionsValidAfter: now,
          mustChangePassword: true,
          failedLoginCount: 0,
          lockUntil: null,
        },
      },
    );
    await sessions.revokeAllForAdmin(target._id);
    await entry.complete('succeeded');
    await notifications.notify({
      affected: target,
      subject: 'Security alert: an administrator password was reset',
      text: `The password for ${target.email} was reset${actor === 'system' ? ' from the server console' : ` by ${actor.email}`}. Two-factor authentication is unchanged. If this was unexpected, investigate immediately.`,
    });
  }

  /** Clear two-factor so the admin re-enrols at next sign-in; the password is unchanged. */
  async function resetTwoFactor(actor, id, ctx) {
    const target = await findTarget(id);
    assertNotSelf(actor, target, 'You cannot reset your own two-factor authentication this way.');
    const entry = await beginAudit(actor, 'admin.2fa_reset', target, ctx);
    const now = new Date();
    await Admin.updateOne(
      { _id: target._id },
      {
        $set: {
          'twoFactor.enabled': false,
          'twoFactor.secretEncrypted': null,
          'twoFactor.pendingSecretEncrypted': null,
          'twoFactor.pendingCreatedAt': null,
          'twoFactor.lastUsedStep': null,
          'twoFactor.enrolledAt': null,
          'twoFactor.recoveryCodeHashes': [],
          'twoFactor.recoveryCodesGeneratedAt': null,
          sessionsValidAfter: now,
        },
      },
    );
    await sessions.revokeAllForAdmin(target._id);
    await entry.complete('succeeded');
    await notifications.notify({
      affected: target,
      subject: 'Security alert: two-factor authentication was reset',
      text: `Two-factor authentication for ${target.email} was reset${actor === 'system' ? ' from the server console' : ` by ${actor.email}`}. The password is unchanged; a new authenticator must be set up at the next sign-in.`,
    });
  }

  async function revokeSessions(actor, id, ctx) {
    const target = await findTarget(id);
    const entry = await beginAudit(actor, 'admin.sessions_revoked', target, ctx);
    await Admin.updateOne({ _id: target._id }, { $set: { sessionsValidAfter: new Date() } });
    const result = await sessions.revokeAllForAdmin(target._id);
    await entry.complete('succeeded', { meta: { count: result.deletedCount } });
  }

  return { list, create, update, remove, resetPassword, resetTwoFactor, revokeSessions };
}
