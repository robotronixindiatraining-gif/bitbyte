import mongoose from 'mongoose';
import { ERROR_CODES, slugify } from '@bitbyte/shared';
import { Taxonomy } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { removeFromAllOrderings } from './contentService.js';

const present = (doc) => ({
  id: String(doc._id),
  type: doc.type,
  name: doc.name,
  slug: doc.slug,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/** Project categories and technology tags (API_REFERENCE.md §5.4). */
export function createTaxonomyService({ audit, context, content }) {
  const slugTaken = () =>
    new AppError(409, ERROR_CODES.SLUG_TAKEN, 'This name or address is already used.', [
      { path: 'slug', message: 'Already used' },
    ]);

  async function find(id) {
    const doc = mongoose.isValidObjectId(id) ? await Taxonomy.findById(id) : null;
    if (!doc) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');
    return doc;
  }

  async function list({ type } = {}) {
    const docs = await Taxonomy.find(type ? { type } : {})
      .sort({ type: 1, name: 1 })
      .lean();
    return docs.map(present);
  }

  async function create(actor, { type, name, slug }, ctx = {}) {
    const value = slug ?? slugify(name);
    if (!value) {
      throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Request validation failed.', [
        { path: 'slug', message: 'Required' },
      ]);
    }
    if (await Taxonomy.exists({ type, slug: value })) throw slugTaken();
    let doc;
    try {
      doc = await Taxonomy.create({ type, name, slug: value });
    } catch (err) {
      if (err?.code === 11000) throw slugTaken();
      throw err;
    }
    // New categories join the DRAFT category order (D-037).
    if (type === 'projectCategory') await content.appendToOrdering('projectCategories', doc._id);
    await audit.recordSafely({
      actor,
      action: 'taxonomy.create',
      outcome: 'succeeded',
      entityType: 'taxonomy',
      entityId: doc._id,
      summary: `${type}: ${name}`,
      context: context(ctx),
    });
    return present(doc);
  }

  async function update(actor, id, { name, slug }, ctx = {}) {
    const doc = await find(id);
    if (slug && slug !== doc.slug && (await Taxonomy.exists({ type: doc.type, slug })))
      throw slugTaken();
    if (name !== undefined) doc.name = name;
    if (slug !== undefined) doc.slug = slug;
    try {
      await doc.save();
    } catch (err) {
      if (err?.code === 11000) throw slugTaken();
      throw err;
    }
    await audit.recordSafely({
      actor,
      action: 'taxonomy.update',
      outcome: 'succeeded',
      entityType: 'taxonomy',
      entityId: doc._id,
      context: context(ctx),
    });
    return present(doc);
  }

  async function remove(actor, id, ctx = {}) {
    const doc = await find(id);
    const usage = await content.findUsages(doc._id);
    if (usage.length > 0)
      throw new AppError(409, ERROR_CODES.IN_USE, 'This item is still used.', usage);
    await audit
      .record({
        actor,
        action: 'taxonomy.delete',
        outcome: 'succeeded',
        entityType: 'taxonomy',
        entityId: doc._id,
        summary: `${doc.type}: ${doc.name}`,
        context: context(ctx),
      })
      .catch(() => {
        throw new AppError(
          503,
          ERROR_CODES.SERVICE_UNAVAILABLE,
          'The action could not be recorded. Please try again.',
        );
      });
    await Taxonomy.deleteOne({ _id: doc._id });
    await removeFromAllOrderings(doc._id);
  }

  return { list, create, update, remove };
}
