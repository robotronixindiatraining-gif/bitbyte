import mongoose from 'mongoose';
import { ERROR_CODES } from '@bitbyte/shared';
import { Lead, Service, Setting } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

/** D-032 defaults, used until privacy settings are published. */
export const DEFAULT_RETENTION = Object.freeze({ leadRetentionDays: 365, spamRetentionDays: 30 });
export const MIN_FILL_TIME_MS = 3_000;
export const MAX_EXPORT_ROWS = 10_000;
const DAY_MS = 86_400_000;
const MAX_LIST_LIMIT = 100;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const unavailable = () =>
  new AppError(
    503,
    ERROR_CODES.SERVICE_UNAVAILABLE,
    'The contact form is not available right now. Please try again later.',
  );

/** Published privacy settings, or the documented defaults. */
export async function retentionSettings() {
  const doc = await Setting.findOne(
    { key: 'privacy', status: 'published' },
    { published: 1 },
  ).lean();
  return { ...DEFAULT_RETENTION, ...(doc?.published ?? {}) };
}

export function expiryFor(createdAt, status, retention) {
  const days = status === 'spam' ? retention.spamRetentionDays : retention.leadRetentionDays;
  return new Date(createdAt.getTime() + days * DAY_MS);
}

const isPossibleSpam = (lead) =>
  lead.status !== 'spam' &&
  (lead.spamSignals?.turnstile === 'unverified' || Boolean(lead.spamSignals?.tooFast));

/**
 * Contact-form leads (API_REFERENCE.md §3.8, §5.6). Personal data is never logged and never
 * written to the audit log; audit entries carry the lead id and non-personal metadata only.
 */
export function createLeadService({
  audit,
  context,
  turnstile,
  notifications,
  logger,
  now = () => new Date(),
}) {
  async function beginAudit(event) {
    try {
      return await audit.begin(event);
    } catch {
      throw new AppError(
        503,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'The action could not be recorded. Please try again.',
      );
    }
  }

  // ---- public submission --------------------------------------------------------------------

  async function submit(input, ctx) {
    const formDoc = await Setting.findOne(
      { key: 'leadForm', status: 'published' },
      { published: 1 },
    ).lean();
    const form = formDoc?.published;
    if (!form) throw unavailable();
    if (!turnstile.configured) throw unavailable();

    const createdAt = now();
    const retention = await retentionSettings();
    const ipHash = context(ctx).ipHash;
    const base = {
      _id: new mongoose.Types.ObjectId(),
      type: input.type,
      fullName: input.fullName,
      companyName: input.companyName,
      companyLocation: input.companyLocation,
      email: input.email,
      phone: input.phone,
      message: input.message,
      sourcePath: input.sourcePath ?? null,
      utm: input.utm,
      consent: { given: true, text: form.consentText, at: createdAt },
      ipHash,
      userAgent: ctx.userAgent ? String(ctx.userAgent).slice(0, 300) : null,
      createdAt,
    };
    const success = { received: true, message: form.successMessage };

    // Honeypot: answer exactly like a success (bots learn nothing) and keep it for review.
    if (input.website && input.website.trim() !== '') {
      await Lead.create({
        ...base,
        budget: String(input.budget).slice(0, 60),
        status: 'spam',
        spamSignals: {
          honeypot: true,
          turnstile: 'skipped',
          fillTimeMs: fillTime(input, createdAt),
        },
        notification: { status: 'not_sent', lastError: 'Spam' },
        expiresAt: expiryFor(createdAt, 'spam', retention),
      });
      logger.info({ leadId: String(base._id), outcome: 'honeypot' }, 'lead stored as spam');
      return success;
    }

    if (!(form.budgetOptions ?? []).includes(input.budget)) {
      throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Request validation failed.', [
        { path: 'body.budget', message: 'Choose one of the listed options' },
      ]);
    }
    const service = input.service
      ? await Service.findOne({ slug: input.service, status: 'published' }, { _id: 1 }).lean()
      : null;

    const check = await turnstile.verify(input.turnstileToken, {
      remoteIp: ctx.ip,
      idempotencyKey: String(base._id),
    });
    if (check.outcome === 'fail') {
      logger.info({ reason: check.reason }, 'lead rejected by bot check');
      throw new AppError(
        422,
        ERROR_CODES.CAPTCHA_FAILED,
        'The bot check failed or expired. Please try again.',
      );
    }

    const fillTimeMs = fillTime(input, createdAt);
    const lead = await Lead.create({
      ...base,
      budget: input.budget,
      service: service?._id ?? null,
      status: 'new',
      spamSignals: {
        honeypot: false,
        fillTimeMs,
        tooFast: fillTimeMs !== null && fillTimeMs < MIN_FILL_TIME_MS,
        turnstile: check.outcome === 'pass' ? 'pass' : 'unverified',
      },
      notification: { status: 'pending' },
      expiresAt: expiryFor(createdAt, 'new', retention),
    });
    logger.info({ leadId: String(lead._id), turnstile: lead.spamSignals.turnstile }, 'lead stored');
    // Sent in the background: the visitor's response never waits for (or fails on) e-mail.
    void notifications.notifySafely(lead._id);
    return success;
  }

  function fillTime(input, createdAt) {
    if (!input.formStartedAt) return null;
    const ms = createdAt.getTime() - input.formStartedAt;
    return ms >= 0 && ms < 7 * DAY_MS ? ms : null;
  }

  // ---- admin --------------------------------------------------------------------------------

  async function find(id) {
    const lead = mongoose.isValidObjectId(id) ? await Lead.findById(id) : null;
    if (!lead) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');
    return lead;
  }

  function filterFrom({ status, type, q, from, to, possibleSpam } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (from || to) {
      filter.createdAt = mongoose.trusted({
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      });
    }
    const and = [];
    if (q) {
      const pattern = mongoose.trusted({ $regex: escapeRegex(q), $options: 'i' });
      and.push({ $or: [{ fullName: pattern }, { companyName: pattern }, { email: pattern }] });
    }
    if (possibleSpam === true) {
      if (!status) filter.status = mongoose.trusted({ $ne: 'spam' });
      and.push({
        $or: [{ 'spamSignals.turnstile': 'unverified' }, { 'spamSignals.tooFast': true }],
      });
    }
    if (and.length > 0) filter.$and = and;
    return filter;
  }

  function summary(lead) {
    return {
      id: String(lead._id),
      type: lead.type,
      status: lead.status,
      fullName: lead.fullName,
      companyName: lead.companyName,
      email: lead.email,
      budget: lead.budget,
      possibleSpam: isPossibleSpam(lead),
      notificationStatus: lead.notification?.status ?? null,
      createdAt: lead.createdAt,
    };
  }

  function detail(lead) {
    return {
      ...summary(lead),
      companyLocation: lead.companyLocation,
      phone: lead.phone,
      message: lead.message,
      service: lead.service ? String(lead.service) : null,
      sourcePath: lead.sourcePath,
      utm: lead.utm ?? null,
      consent: lead.consent,
      notes: (lead.notes ?? []).map((n) => ({
        id: String(n._id),
        admin: String(n.admin),
        text: n.text,
        at: n.at,
      })),
      notification: {
        status: lead.notification?.status ?? null,
        attempts: lead.notification?.attempts ?? 0,
        lastAttemptAt: lead.notification?.lastAttemptAt ?? null,
        acceptedAt: lead.notification?.acceptedAt ?? null,
        lastError: lead.notification?.lastError ?? null,
      },
      spamSignals: lead.spamSignals,
      expiresAt: lead.expiresAt,
      updatedAt: lead.updatedAt,
    };
  }

  async function list(query = {}) {
    const { page = 1, limit = 20 } = query;
    const filter = filterFrom(query);
    const size = Math.min(limit, MAX_LIST_LIMIT);
    const [items, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size)
        .lean(),
      Lead.countDocuments(filter),
    ]);
    return {
      items: items.map(summary),
      meta: { page, limit: size, total, totalPages: Math.ceil(total / size) },
    };
  }

  async function get(id) {
    return detail(await find(id));
  }

  async function updateStatus(actor, id, { status }, ctx = {}) {
    const lead = await find(id);
    const previous = lead.status;
    if (previous !== status) {
      lead.status = status;
      // Moving in or out of "spam" switches between the two retention periods (D-032).
      if (previous === 'spam' || status === 'spam') {
        lead.expiresAt = expiryFor(lead.createdAt, status, await retentionSettings());
      }
      await lead.save();
      await audit.recordSafely({
        actor,
        action: 'lead.status',
        outcome: 'succeeded',
        entityType: 'lead',
        entityId: lead._id,
        meta: { from: previous, to: status },
        context: context(ctx),
      });
    }
    return detail(lead);
  }

  async function addNote(actor, id, { text }, ctx = {}) {
    const lead = await find(id);
    lead.notes.push({ admin: actor._id, text, at: now() });
    await lead.save();
    await audit.recordSafely({
      actor,
      action: 'lead.note',
      outcome: 'succeeded',
      entityType: 'lead',
      entityId: lead._id,
      context: context(ctx),
    });
    return detail(lead);
  }

  async function resendNotification(actor, id, ctx = {}) {
    const lead = await find(id);
    if (lead.status === 'spam')
      throw new AppError(409, ERROR_CODES.INVALID_STATE, 'Spam leads are not notified.');
    if (lead.notification?.status === 'pending' && lead.notification.nextAttemptAt > now()) {
      throw new AppError(
        409,
        ERROR_CODES.INVALID_STATE,
        'The notification is already being retried.',
      );
    }
    if (lead.notification?.status === 'accepted') {
      throw new AppError(
        409,
        ERROR_CODES.INVALID_STATE,
        'The notification was already accepted by the mail provider.',
      );
    }
    const status = await notifications.requeue(lead._id);
    await audit.recordSafely({
      actor,
      action: 'lead.resend_notification',
      outcome: 'succeeded',
      entityType: 'lead',
      entityId: lead._id,
      meta: { result: status ?? 'unknown' },
      context: context(ctx),
    });
    return detail(await find(id));
  }

  /** Right to erasure: removes the lead completely; the audit entry has no personal data. */
  async function erase(actor, id, ctx = {}) {
    const lead = await find(id);
    const entry = await beginAudit({
      actor,
      action: 'lead.erase',
      entityType: 'lead',
      entityId: lead._id,
      context: context(ctx),
    });
    await Lead.deleteOne({ _id: lead._id });
    await entry.complete('succeeded');
  }

  /** CSV export (step-up required at the route); audited with the row count only. */
  async function exportCsv(actor, query, ctx = {}) {
    const filter = filterFrom(query);
    const total = await Lead.countDocuments(filter);
    if (total > MAX_EXPORT_ROWS) {
      throw new AppError(
        422,
        ERROR_CODES.VALIDATION_ERROR,
        `Narrow the filters: at most ${MAX_EXPORT_ROWS} leads per export.`,
      );
    }
    const entry = await beginAudit({
      actor,
      action: 'lead.export',
      entityType: 'lead',
      meta: {
        rows: total,
        status: query.status ?? null,
        type: query.type ?? null,
        filtered: Boolean(query.q),
      },
      context: context(ctx),
    });
    const leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();
    const services = await Service.find({}, { slug: 1 }).lean();
    const slugs = new Map(services.map((s) => [String(s._id), s.slug]));
    const rows = leads.map((lead) => [
      lead.createdAt.toISOString(),
      lead.status,
      lead.type,
      lead.fullName,
      lead.companyName,
      lead.companyLocation,
      lead.email,
      lead.phone,
      lead.budget,
      lead.service ? (slugs.get(String(lead.service)) ?? '') : '',
      lead.message,
      lead.sourcePath ?? '',
      lead.utm?.source ?? '',
      lead.utm?.medium ?? '',
      lead.utm?.campaign ?? '',
      isPossibleSpam(lead) ? 'yes' : 'no',
    ]);
    await entry.complete('succeeded');
    return toCsv([CSV_HEADER, ...rows]);
  }

  return { submit, list, get, updateStatus, addNote, resendNotification, erase, exportCsv };
}

export const CSV_HEADER = Object.freeze([
  'received_at',
  'status',
  'type',
  'full_name',
  'company',
  'company_location',
  'email',
  'phone',
  'budget',
  'service',
  'message',
  'source_path',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'possible_spam',
]);

/**
 * RFC 4180 CSV with spreadsheet formula-injection protection: a cell that starts with
 * = + - @ (or a tab/carriage return) is prefixed with an apostrophe so it is shown as text.
 */
export function toCsv(rows) {
  const cell = (value) => {
    let text = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  // BOM so spreadsheet apps detect UTF-8 (names may contain non-ASCII characters).
  return `\uFEFF${rows.map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
}
