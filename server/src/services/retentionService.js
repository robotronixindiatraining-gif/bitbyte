import mongoose from 'mongoose';
import { Lead } from '../models/index.js';
import { DEFAULT_RETENTION, retentionSettings } from './leadService.js';

const BATCH = 500;
const DAY_MS = 86_400_000;

/**
 * Lead retention (D-032). Leads are deleted once `expiresAt` has passed:
 * `createdAt + leadRetentionDays` (default 365), or `spamRetentionDays` (default 30) for spam.
 * - Safe to re-run: it only ever deletes what is already expired; a partial run is completed
 *   by the next one.
 * - The audit log records counts only (never personal data).
 */
export function createRetentionService({ audit, logger, now = () => new Date() }) {
  async function purgeExpired({ dryRun = false, actor = null } = {}) {
    const cutoff = now();
    const filter = { expiresAt: mongoose.trusted({ $lte: cutoff }) };
    const expired = await Lead.countDocuments(filter);
    if (dryRun || expired === 0) return { dryRun, expired, deleted: 0, cutoff };

    let deleted = 0;
    let error = null;
    try {
      for (;;) {
        const batch = await Lead.find(filter, { _id: 1 }).limit(BATCH).lean();
        if (batch.length === 0) break;
        const result = await Lead.deleteMany({
          _id: mongoose.trusted({ $in: batch.map((l) => l._id) }),
        });
        deleted += result.deletedCount;
      }
    } catch (err) {
      error = err;
    }
    try {
      await audit.record({
        actor: actor ?? 'system',
        action: 'lead.retention_purge',
        outcome: error ? 'failed' : 'succeeded',
        entityType: 'lead',
        meta: { expired, deleted },
      });
    } catch (err) {
      logger.error({ err: { name: err?.name }, deleted }, 'retention purge could not be audited');
    }
    if (error) {
      logger.error(
        { err: { name: error.name, message: error.message }, deleted },
        'retention purge stopped early',
      );
      throw error;
    }
    logger.info({ deleted }, 'retention purge finished');
    return { dryRun, expired, deleted, cutoff };
  }

  /** Re-derive every lead's `expiresAt` after the retention settings change. */
  async function recomputeExpiry(privacy) {
    const retention = { ...DEFAULT_RETENTION, ...(privacy ?? (await retentionSettings())) };
    const addDays = (days) => [{ $set: { expiresAt: { $add: ['$createdAt', days * DAY_MS] } } }];
    const [regular, spam] = await Promise.all([
      Lead.updateMany(
        { status: mongoose.trusted({ $ne: 'spam' }) },
        addDays(retention.leadRetentionDays),
        { updatePipeline: true },
      ),
      Lead.updateMany({ status: 'spam' }, addDays(retention.spamRetentionDays), {
        updatePipeline: true,
      }),
    ]);
    return { updated: regular.modifiedCount + spam.modifiedCount };
  }

  return { purgeExpired, recomputeExpiry };
}
