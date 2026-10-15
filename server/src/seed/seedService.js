import mongoose from 'mongoose';
import { Ordering, Page, Service, Setting, Taxonomy } from '../models/index.js';
import { ORDERING_KEYS } from '../models/Ordering.js';
import {
  SEEDED_CATEGORIES,
  SEEDED_SERVICES,
  serviceDraft,
  settingsDrafts,
  systemPages,
} from './seedData.js';

/**
 * Idempotent placeholder seed.
 * - Inserts a document only if its explicit identifier (seedKey, or the unique settings/ordering
 *   key) is absent; existing documents are never updated, so administrator edits are preserved.
 * - Never reads, creates or changes administrator accounts.
 * - Creates drafts only; nothing is published.
 * @returns {Promise<{ created: string[], skipped: string[] }>}
 */
export async function runSeed({ logger } = {}) {
  const report = { created: [], skipped: [] };

  async function ensure(label, Model, filter, buildDoc) {
    const existing = await Model.findOne(filter, { _id: 1 });
    if (existing) {
      report.skipped.push(label);
      return existing._id;
    }
    try {
      const doc = await Model.create(buildDoc());
      report.created.push(label);
      return doc._id;
    } catch (err) {
      // Lost a race with a concurrent run, or an admin already uses that slug: never overwrite.
      if (err?.code === 11000) {
        report.skipped.push(`${label} (conflict: left unchanged)`);
        return (await Model.findOne(filter, { _id: 1 }))?._id ?? null;
      }
      throw err;
    }
  }

  const categoryIds = [];
  for (const category of SEEDED_CATEGORIES) {
    categoryIds.push(
      await ensure(category.seedKey, Taxonomy, { seedKey: category.seedKey }, () => ({
        type: 'projectCategory',
        ...category,
      })),
    );
  }

  const services = [];
  for (const service of SEEDED_SERVICES) {
    const id = await ensure(service.seedKey, Service, { seedKey: service.seedKey }, () => ({
      seedKey: service.seedKey,
      slug: service.slug,
      draft: serviceDraft(service),
    }));
    if (id) services.push({ id, title: service.title });
  }

  // Pages reference each other (CTAs link to the contact page), so ids are fixed first:
  // an existing seeded page keeps its id; a missing one gets a new id.
  const pageIds = {};
  const pageTemplates = systemPages({ pages: {} });
  for (const page of pageTemplates) {
    const existing = await Page.findOne({ seedKey: page.seedKey }, { _id: 1 });
    pageIds[page.slug] = existing?._id ?? new mongoose.Types.ObjectId();
  }
  for (const page of systemPages({ pages: pageIds })) {
    await ensure(page.seedKey, Page, { seedKey: page.seedKey }, () => ({
      _id: pageIds[page.slug],
      seedKey: page.seedKey,
      slug: page.slug,
      template: page.template,
      system: true,
      draft: page.draft,
    }));
  }

  const drafts = settingsDrafts({ pages: pageIds, services });
  for (const [key, draft] of Object.entries(drafts)) {
    await ensure(`settings:${key}`, Setting, { key }, () => ({ key, draft }));
  }

  const orderingDrafts = {
    services: services.map((s) => String(s.id)),
    projectCategories: categoryIds.filter(Boolean).map(String),
  };
  for (const key of ORDERING_KEYS) {
    await ensure(`ordering:${key}`, Ordering, { key }, () => ({
      key,
      draft: { ids: orderingDrafts[key] ?? [] },
    }));
  }

  logger?.info({ created: report.created.length, skipped: report.skipped.length }, 'seed finished');
  return report;
}
