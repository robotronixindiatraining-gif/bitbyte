import mongoose from 'mongoose';
import { ERROR_CODES } from '@bitbyte/shared';
import { JobOpening, Page, Project, Redirect, Service } from '../models/index.js';
import { normalizePath } from '../models/Redirect.js';
import { AppError } from '../utils/AppError.js';

/** Paths the app owns; redirects may not start here. */
export const RESERVED_REDIRECT_PREFIXES = Object.freeze(['/api', '/admin', '/uploads', '/assets']);
const RESERVED_FILES = new Set(['/sitemap.xml', '/robots.txt', '/favicon.ico', '/']);
const MAX_LIST_LIMIT = 100;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const present = (doc) => ({
  id: String(doc._id),
  fromPath: doc.fromPath,
  toPath: doc.toPath,
  statusCode: doc.statusCode,
  enabled: doc.enabled,
  source: doc.source,
  hits: doc.hits,
  lastHitAt: doc.lastHitAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const invalid = (path, message) =>
  new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Request validation failed.', [
    { path, message },
  ]);

/** Redirect management (API_REFERENCE.md §5.7). Loops, chains and reserved paths are rejected. */
export function createRedirectService({ audit, context }) {
  async function find(id) {
    const doc = mongoose.isValidObjectId(id) ? await Redirect.findById(id) : null;
    if (!doc) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');
    return doc;
  }

  /** Does live or draft content own this path? Content always wins over a redirect (D-038). */
  async function contentOwns(path) {
    const parts = path.split('/').filter(Boolean);
    const taken = (slug) => ({ $or: [{ slug }, { 'draft.slug': slug }] });
    if (parts.length === 1) {
      return Boolean(
        (await Service.exists(taken(parts[0]))) || (await Page.exists(taken(parts[0]))),
      );
    }
    if (parts.length === 2 && parts[0] === 'portfolio')
      return Boolean(await Project.exists(taken(parts[1])));
    if (parts.length === 2 && parts[0] === 'careers')
      return Boolean(await JobOpening.exists(taken(parts[1])));
    return false;
  }

  async function check({ fromPath, toPath }, excludeId) {
    const from = normalizePath(fromPath);
    if (
      RESERVED_FILES.has(from) ||
      RESERVED_REDIRECT_PREFIXES.some((p) => from === p || from.startsWith(`${p}/`))
    ) {
      throw invalid('fromPath', 'This path is reserved by the website');
    }
    if (/\/\/|\.\./.test(from)) throw invalid('fromPath', 'Invalid path');
    const external = toPath.startsWith('https://');
    const to = external ? toPath : normalizePath(toPath);
    if (!external && to === from) throw invalid('toPath', 'A redirect cannot point to itself');
    if (!external && RESERVED_REDIRECT_PREFIXES.some((p) => to === p || to.startsWith(`${p}/`))) {
      throw invalid('toPath', 'This path is reserved by the website');
    }
    const others = { _id: mongoose.trusted({ $ne: excludeId ?? null }) };
    if (await Redirect.exists({ ...others, fromPath: from })) {
      throw new AppError(409, ERROR_CODES.SLUG_TAKEN, 'A redirect for this path already exists.', [
        { path: 'fromPath', message: 'Already redirected' },
      ]);
    }
    if (await contentOwns(from)) {
      throw new AppError(
        409,
        ERROR_CODES.SLUG_TAKEN,
        'A page or item uses this path, so a redirect would never apply.',
        [{ path: 'fromPath', message: 'Used by content' }],
      );
    }
    if (!external && (await Redirect.exists({ ...others, fromPath: to, enabled: true }))) {
      throw invalid(
        'toPath',
        'The target is itself redirected; point to the final address instead (no chains)',
      );
    }
    if (await Redirect.exists({ ...others, toPath: from, enabled: true })) {
      throw invalid('fromPath', 'Another redirect points to this path; that would create a chain');
    }
    return { fromPath: from, toPath: to };
  }

  async function list({ q, source, page = 1, limit = 50 } = {}) {
    const filter = {};
    if (source) filter.source = source;
    if (q) {
      const pattern = mongoose.trusted({ $regex: escapeRegex(q.toLowerCase()), $options: 'i' });
      filter.$or = [{ fromPath: pattern }, { toPath: pattern }];
    }
    const size = Math.min(limit, MAX_LIST_LIMIT);
    const [docs, total] = await Promise.all([
      Redirect.find(filter)
        .sort({ fromPath: 1 })
        .skip((page - 1) * size)
        .limit(size)
        .lean(),
      Redirect.countDocuments(filter),
    ]);
    return {
      items: docs.map(present),
      meta: { page, limit: size, total, totalPages: Math.ceil(total / size) },
    };
  }

  async function record(actor, action, doc, ctx) {
    try {
      await audit.record({
        actor,
        action,
        outcome: 'succeeded',
        entityType: 'redirect',
        entityId: doc._id,
        summary: `${doc.fromPath} → ${doc.toPath}`,
        context: context(ctx),
      });
    } catch {
      throw new AppError(
        503,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'The action could not be recorded. Please try again.',
      );
    }
  }

  async function create(actor, input, ctx = {}) {
    const paths = await check(input);
    const doc = new Redirect({
      ...paths,
      statusCode: input.statusCode ?? 301,
      enabled: input.enabled ?? true,
      source: 'manual',
    });
    await doc.validate();
    await record(actor, 'redirect.create', doc, ctx);
    await doc.save();
    return present(doc);
  }

  async function update(actor, id, changes, ctx = {}) {
    const doc = await find(id);
    const next = {
      fromPath: changes.fromPath ?? doc.fromPath,
      toPath: changes.toPath ?? doc.toPath,
    };
    const paths = await check(next, doc._id);
    Object.assign(doc, paths);
    if (changes.statusCode !== undefined) doc.statusCode = changes.statusCode;
    if (changes.enabled !== undefined) doc.enabled = changes.enabled;
    await doc.validate();
    await record(actor, 'redirect.update', doc, ctx);
    await doc.save();
    return present(doc);
  }

  async function remove(actor, id, ctx = {}) {
    const doc = await find(id);
    await record(actor, 'redirect.delete', doc, ctx);
    await Redirect.deleteOne({ _id: doc._id });
  }

  return { list, create, update, remove };
}
