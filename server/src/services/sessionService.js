import mongoose from 'mongoose';
import { ROLES, SESSION_STAGES } from '@bitbyte/shared';
import { Admin, Session } from '../models/index.js';
import { hashIp, randomToken, sha256Hex } from '../security/crypto.js';

const MFA_PENDING_MS = 5 * 60_000;
const ENROLLMENT_MS = 30 * 60_000;
const TOUCH_INTERVAL_MS = 60_000;

/** Server-side sessions (D-011): the cookie holds a random token; only its hash is stored. */
export function createSessionService({ config }) {
  const { idleMs, absoluteMs } = config.session;

  function lifetimes(stage, now) {
    if (stage === SESSION_STAGES.MFA_PENDING) {
      const end = new Date(now + MFA_PENDING_MS);
      return { absoluteExpiresAt: end, expiresAt: end };
    }
    if (stage === SESSION_STAGES.ENROLLMENT) {
      const end = new Date(now + ENROLLMENT_MS);
      return { absoluteExpiresAt: end, expiresAt: end };
    }
    const absoluteExpiresAt = new Date(now + absoluteMs);
    return {
      absoluteExpiresAt,
      expiresAt: new Date(Math.min(now + idleMs, absoluteExpiresAt.getTime())),
    };
  }

  async function create({ adminId, stage, ip, userAgent }) {
    const token = randomToken(32);
    const now = Date.now();
    const session = await Session.create({
      tokenHash: sha256Hex(token),
      admin: adminId,
      stage,
      lastSeenAt: new Date(now),
      ...lifetimes(stage, now),
      ipHash: hashIp(ip, config.secrets.ipHashSalt),
      userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
    });
    return { token, session };
  }

  /**
   * Resolve a cookie token to a valid session and its admin, or null. A session is valid only
   * if unexpired, created after the admin's `sessionsValidAfter`, and the admin is an active
   * super_admin. Idle expiry slides forward (at most once a minute) up to the absolute limit.
   */
  async function resolve(token) {
    if (!token || typeof token !== 'string' || token.length > 100) return null;
    const now = Date.now();
    const session = await Session.findOne({
      tokenHash: sha256Hex(token),
      expiresAt: mongoose.trusted({ $gt: new Date(now) }),
    });
    if (!session) return null;

    const admin = await Admin.findById(session.admin).select('+twoFactor');
    const valid =
      admin &&
      admin.status === 'active' &&
      admin.role === ROLES.SUPER_ADMIN &&
      session.createdAt >= admin.sessionsValidAfter;
    if (!valid) {
      await Session.deleteOne({ _id: session._id });
      return null;
    }

    if (
      session.stage === SESSION_STAGES.ACTIVE &&
      now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS
    ) {
      const expiresAt = new Date(Math.min(now + idleMs, session.absoluteExpiresAt.getTime()));
      await Session.updateOne(
        { _id: session._id },
        { $set: { lastSeenAt: new Date(now), expiresAt } },
      );
      session.lastSeenAt = new Date(now);
      session.expiresAt = expiresAt;
    }
    return { session, admin };
  }

  const revoke = (sessionId) => Session.deleteOne({ _id: sessionId });

  /** Delete every session of an admin (optionally keeping one). */
  const revokeAllForAdmin = (adminId, { except } = {}) =>
    Session.deleteMany({
      admin: adminId,
      ...(except ? { _id: mongoose.trusted({ $ne: except }) } : {}),
    });

  /** Revoke one of your own sessions ("sign out other device"). */
  const revokeOwn = (adminId, sessionId) => Session.deleteOne({ _id: sessionId, admin: adminId });

  const listForAdmin = (adminId) =>
    Session.find({
      admin: adminId,
      stage: SESSION_STAGES.ACTIVE,
      expiresAt: mongoose.trusted({ $gt: new Date() }),
    })
      .sort({ lastSeenAt: -1 })
      .lean();

  return { create, resolve, revoke, revokeOwn, revokeAllForAdmin, listForAdmin };
}
