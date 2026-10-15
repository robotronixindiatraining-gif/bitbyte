import { AuditLog } from '../models/index.js';

const SENSITIVE_KEY = /pass|secret|token|code|cookie|hash|otp|key/i;

/** Keep only primitive, non-sensitive metadata (no credentials, codes or tokens ever). */
export function sanitizeMeta(meta) {
  if (!meta) return undefined;
  const safe = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (['string', 'number', 'boolean'].includes(typeof value) || value === null) {
      safe[key] = typeof value === 'string' ? value.slice(0, 200) : value;
    }
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
}

function toEntry({ actor, action, outcome, entityType, entityId, summary, meta, context }) {
  return {
    actor: actor?._id ?? actor?.id ?? null,
    actorEmail: actor?.email ?? (actor === 'system' ? 'system:cli' : null),
    action,
    outcome,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    summary: summary ? String(summary).slice(0, 300) : null,
    meta: sanitizeMeta(meta),
    ipHash: context?.ipHash ?? null,
    requestId: context?.requestId ?? null,
  };
}

/**
 * Audit log writer (docs/DATABASE_SCHEMA.md §3.14).
 * - `record` writes a finished event and throws if it cannot be stored.
 * - `begin` writes an "attempted" entry BEFORE a privileged action (fail closed: no entry, no
 *   action) and returns `complete(outcome)`. If completion cannot be written, the entry stays
 *   "attempted" — it never claims a success that was not recorded.
 */
export function createAuditService({ logger }) {
  async function record(event) {
    const doc = await AuditLog.create(toEntry(event));
    return doc;
  }

  async function begin(event) {
    const doc = await AuditLog.create(toEntry({ ...event, outcome: 'attempted' }));
    return {
      id: doc._id,
      async complete(outcome, { summary, meta, entityId } = {}) {
        try {
          const update = { outcome };
          if (summary) update.summary = String(summary).slice(0, 300);
          if (entityId) update.entityId = entityId;
          const safeMeta = sanitizeMeta(meta);
          if (safeMeta) update.meta = { ...(doc.meta ?? {}), ...safeMeta };
          await AuditLog.updateOne({ _id: doc._id }, { $set: update });
        } catch (err) {
          logger.error(
            { err, auditId: String(doc._id), action: event.action },
            'audit completion failed; entry remains "attempted"',
          );
        }
      },
    };
  }

  /** Best-effort record for events where failing the request would not help (e.g. a failed login). */
  async function recordSafely(event) {
    try {
      await record(event);
    } catch (err) {
      logger.error({ err, action: event.action }, 'audit write failed');
    }
  }

  return { record, begin, recordSafely };
}
