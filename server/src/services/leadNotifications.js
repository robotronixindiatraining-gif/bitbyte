import mongoose from 'mongoose';
import { Lead, Setting } from '../models/index.js';

/** Delay before retry n (1-based); after the last one the notification is marked failed. */
export const RETRY_DELAYS_MS = Object.freeze([
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 3_600_000,
  6 * 3_600_000,
]);
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
/** While one attempt runs, the lead is leased so a parallel retry cannot send it twice. */
const LEASE_MS = 2 * 60_000;
const BATCH = 20;

/**
 * Lead notification e-mails (D-019). The e-mail is a NOTICE ONLY: it contains no name, contact
 * details or message (they stay in the database), just the enquiry type and a link to the admin.
 * A failed send never affects the stored lead; temporary failures are retried with back-off.
 */
export function createLeadNotifications({ mailer, config, logger, now = () => new Date() }) {
  async function recipients() {
    const settings = await Setting.findOne(
      { key: 'leadForm', status: 'published' },
      { published: 1 },
    ).lean();
    const fromSettings = settings?.published?.notificationEmails ?? [];
    return fromSettings.length > 0 ? fromSettings : [...config.mail.leadRecipients];
  }

  function message(lead) {
    const adminUrl = config.publicSiteUrl
      ? new URL(`/admin/leads/${lead._id}`, config.publicSiteUrl).href
      : null;
    const flagged = lead.spamSignals?.turnstile === 'unverified' || lead.spamSignals?.tooFast;
    return {
      subject: `New website enquiry${flagged ? ' (possible spam)' : ''}`,
      text: [
        'A new enquiry was submitted on the website.',
        '',
        `Reference: ${lead._id}`,
        `Received: ${lead.createdAt.toISOString()}`,
        flagged
          ? 'Note: the bot check could not be completed; review it under "Possible spam".'
          : null,
        '',
        adminUrl
          ? `Open it in the admin (sign-in required): ${adminUrl}`
          : 'Open it in the website admin (Leads).',
      ]
        .filter((line) => line !== null)
        .join('\n'),
    };
  }

  /** Claim a due notification (atomic lease), send it, record the outcome. */
  async function attempt(leadId) {
    const time = now();
    const lead = await Lead.findOneAndUpdate(
      {
        _id: leadId,
        'notification.status': 'pending',
        $or: [
          { 'notification.nextAttemptAt': null },
          { 'notification.nextAttemptAt': mongoose.trusted({ $lte: time }) },
        ],
      },
      {
        $set: {
          'notification.nextAttemptAt': new Date(time.getTime() + LEASE_MS),
          'notification.lastAttemptAt': time,
        },
        $inc: { 'notification.attempts': 1 },
      },
      { returnDocument: 'after' },
    );
    if (!lead) return null;

    const to = await recipients();
    if (to.length === 0)
      return record(lead._id, {
        status: 'not_sent',
        lastError: 'No notification recipients configured',
      });

    try {
      const result = await mailer.send({
        to,
        ...message(lead),
        idempotencyKey: `lead-notification-${lead._id}`,
      });
      if (!result.accepted) {
        return record(lead._id, {
          status: 'not_sent',
          lastError: `Not sent: mail driver "${mailer.driver}"`,
        });
      }
      return record(lead._id, {
        status: 'accepted',
        acceptedAt: now(),
        providerMessageId: result.providerMessageId,
        lastError: null,
      });
    } catch (err) {
      const attempts = lead.notification.attempts;
      const retry = err?.retryable !== false && attempts < MAX_ATTEMPTS;
      logger.warn({ leadId: String(lead._id), attempts, retry }, 'lead notification failed');
      return record(lead._id, {
        status: retry ? 'pending' : 'failed',
        nextAttemptAt: retry ? new Date(now().getTime() + RETRY_DELAYS_MS[attempts - 1]) : null,
        lastError: String(err?.message ?? 'Send failed').slice(0, 300),
      });
    }
  }

  async function record(leadId, fields) {
    const $set = { 'notification.nextAttemptAt': null };
    for (const [key, value] of Object.entries(fields)) $set[`notification.${key}`] = value;
    await Lead.updateOne({ _id: leadId }, { $set });
    return fields.status;
  }

  /** Background-safe: never throws (the lead is already stored). */
  async function notifySafely(leadId) {
    try {
      return await attempt(leadId);
    } catch (err) {
      logger.error({ err: { name: err?.name }, leadId: String(leadId) }, 'lead notification error');
      return null;
    }
  }

  /** Retry due notifications (scheduled job). Returns how many were attempted. */
  async function retryDue() {
    const due = await Lead.find(
      {
        'notification.status': 'pending',
        status: mongoose.trusted({ $ne: 'spam' }),
        'notification.nextAttemptAt': mongoose.trusted({ $lte: now() }),
      },
      { _id: 1 },
    )
      .limit(BATCH)
      .lean();
    for (const { _id } of due) await notifySafely(_id);
    return due.length;
  }

  /** Admin "resend": re-queue a lead whose notification failed or was not sent. */
  async function requeue(leadId) {
    await Lead.updateOne(
      { _id: leadId },
      {
        $set: {
          'notification.status': 'pending',
          'notification.nextAttemptAt': null,
          'notification.attempts': 0,
        },
      },
    );
    return notifySafely(leadId);
  }

  return { notifySafely, retryDue, requeue, message };
}
