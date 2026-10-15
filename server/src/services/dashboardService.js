import mongoose from 'mongoose';
import { CONTENT_KINDS, REFERENCE_MODELS, displayTitle } from '../content/kinds.js';
import { Admin, AuditLog, Lead, Media, Taxonomy } from '../models/index.js';
import { collectReferences } from '../models/plugins/publishable.js';

const CONTENT_LIST = ['page', 'service', 'project', 'testimonial', 'job', 'settings', 'ordering'];
const LIST_LIMIT = 20;
const CONTENT_ENTITY_TYPES = [...CONTENT_LIST, 'media', 'taxonomy', 'redirect'];
const DAY_MS = 86_400_000;

/**
 * Dashboard summary (API_REFERENCE.md §5.9). Contains counts, titles and audit metadata only:
 * no lead names, e-mail addresses, phone numbers or messages.
 */
export function createDashboardService() {
  async function counts() {
    const result = {};
    for (const kind of ['page', 'service', 'project', 'testimonial', 'job']) {
      const { Model } = CONTENT_KINDS[kind];
      const [published, total] = await Promise.all([
        Model.countDocuments({ status: 'published' }),
        Model.countDocuments({}),
      ]);
      result[kind] = { published, total };
    }
    result.media = { total: await Media.countDocuments({}) };
    return result;
  }

  async function leadSummary(now) {
    const since = new Date(now.getTime() - 30 * DAY_MS);
    const [unread, last30Days, possibleSpam] = await Promise.all([
      Lead.countDocuments({ status: 'new' }),
      Lead.countDocuments({
        createdAt: mongoose.trusted({ $gte: since }),
        status: mongoose.trusted({ $ne: 'spam' }),
      }),
      Lead.countDocuments({
        status: mongoose.trusted({ $ne: 'spam' }),
        $or: [{ 'spamSignals.turnstile': 'unverified' }, { 'spamSignals.tooFast': true }],
      }),
    ]);
    const failedNotifications = await Lead.countDocuments({ 'notification.status': 'failed' });
    return { new: unread, last30Days, possibleSpam, failedNotifications };
  }

  async function contentLists() {
    const unpublishedChanges = [];
    const placeholders = [];
    for (const kind of CONTENT_LIST) {
      const { Model } = CONTENT_KINDS[kind];
      const fields = {
        draft: 1,
        published: 1,
        key: 1,
        slug: 1,
        status: 1,
        updatedAt: 1,
        placeholders: 1,
      };
      const changed = await Model.find({ hasUnpublishedChanges: true }, fields)
        .sort({ updatedAt: -1 })
        .limit(LIST_LIMIT)
        .lean();
      changed.forEach((doc) =>
        unpublishedChanges.push({
          kind,
          id: String(doc._id),
          title: displayTitle(doc),
          status: doc.status,
          updatedAt: doc.updatedAt,
        }),
      );
      const withTokens = await Model.find(
        { 'placeholders.0': mongoose.trusted({ $exists: true }) },
        fields,
      )
        .limit(LIST_LIMIT)
        .lean();
      withTokens.forEach((doc) =>
        placeholders.push({
          kind,
          id: String(doc._id),
          title: displayTitle(doc),
          count: doc.placeholders.length,
        }),
      );
    }
    unpublishedChanges.sort((a, b) => b.updatedAt - a.updatedAt);
    return { unpublishedChanges: unpublishedChanges.slice(0, LIST_LIMIT), placeholders };
  }

  /** Published content whose live version references something that is no longer live. */
  async function brokenReferences() {
    const broken = [];
    for (const kind of ['page', 'service', 'project', 'testimonial', 'job', 'settings']) {
      const { Model } = CONTENT_KINDS[kind];
      const docs = await Model.find(
        { status: 'published' },
        { published: 1, key: 1, slug: 1, draft: 1 },
      ).lean();
      for (const doc of docs) {
        const refs = collectReferences([doc.published]);
        const missing = [];
        for (const ref of refs.entities) {
          const exists =
            ref.kind === 'taxonomy'
              ? await Taxonomy.exists({ _id: ref.id })
              : await REFERENCE_MODELS[ref.kind]?.exists({ _id: ref.id, status: 'published' });
          if (!exists) missing.push(ref.kind);
        }
        for (const id of refs.media) if (!(await Media.exists({ _id: id }))) missing.push('media');
        if (missing.length > 0)
          broken.push({ kind, id: String(doc._id), title: displayTitle(doc), missing });
        if (broken.length >= LIST_LIMIT) return broken;
      }
    }
    return broken;
  }

  async function recentActivity(filter = {}) {
    const entries = await AuditLog.find(filter, {
      at: 1,
      actor: 1,
      action: 1,
      outcome: 1,
      entityType: 1,
      entityId: 1,
      summary: 1,
    })
      .sort({ at: -1 })
      .limit(LIST_LIMIT)
      .lean();
    const actorIds = [...new Set(entries.map((e) => e.actor && String(e.actor)).filter(Boolean))];
    const admins = await Admin.find(
      { _id: mongoose.trusted({ $in: actorIds }) },
      { name: 1 },
    ).lean();
    const names = new Map(admins.map((a) => [String(a._id), a.name]));
    return entries.map((e) => ({
      at: e.at,
      actorName: e.actor ? (names.get(String(e.actor)) ?? 'Former administrator') : 'System',
      action: e.action,
      outcome: e.outcome,
      entityType: e.entityType,
      entityId: e.entityId ? String(e.entityId) : null,
      // Lead events never carry personal data in their summary (see leadService).
      summary: e.summary,
    }));
  }

  async function summary(now = new Date()) {
    const [contentCounts, leads, lists, broken, activity, recentContentChanges] = await Promise.all(
      [
        counts(),
        leadSummary(now),
        contentLists(),
        brokenReferences(),
        recentActivity(),
        recentActivity({ entityType: mongoose.trusted({ $in: CONTENT_ENTITY_TYPES }) }),
      ],
    );
    return {
      counts: contentCounts,
      leads,
      unpublishedChanges: lists.unpublishedChanges,
      placeholders: lists.placeholders,
      brokenReferences: broken,
      recentContentChanges,
      recentActivity: activity,
    };
  }

  return { summary };
}
