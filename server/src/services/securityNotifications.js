import mongoose from 'mongoose';
import { Admin } from '../models/index.js';

const ALERT_DAYS = 7;

/**
 * Security notifications (D-039 #8): the affected admin and every other active admin are told
 * about password/2FA resets and recovery-code use; the dashboard shows an alert for 7 days.
 * Notification failures are logged but never undo the security action.
 */
export function createSecurityNotifications({ mailer, logger }) {
  async function notify({ affected, subject, text, includeOthers = true }) {
    try {
      await Admin.updateOne(
        { _id: affected._id },
        { $set: { securityAlertUntil: new Date(Date.now() + ALERT_DAYS * 86_400_000) } },
      );
      const recipients = new Set([affected.email]);
      if (includeOthers) {
        const others = await Admin.find(
          { status: 'active', _id: mongoose.trusted({ $ne: affected._id }) },
          { email: 1 },
        );
        others.forEach((admin) => recipients.add(admin.email));
      }
      await mailer.send({ to: [...recipients], subject, text });
    } catch (err) {
      logger.error({ err, subject }, 'security notification failed');
    }
  }
  return { notify };
}
