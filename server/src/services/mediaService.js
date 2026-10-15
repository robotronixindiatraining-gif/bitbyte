import mongoose from 'mongoose';
import { ERROR_CODES } from '@bitbyte/shared';
import { CONTENT_KINDS, REFERENCING_KINDS, displayTitle } from '../content/kinds.js';
import { processImage } from '../media/processImage.js';
import { Media } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

const MAX_LIST_LIMIT = 100;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const providerUnavailable = () =>
  new AppError(
    503,
    ERROR_CODES.SERVICE_UNAVAILABLE,
    'The media service is unavailable. Please try again.',
  );

/**
 * Media library (API_REFERENCE.md §5.5, D-013, D-018). Order of operations keeps MongoDB and the
 * storage provider consistent:
 * - upload: verify + re-encode → store the file → insert metadata; if the insert fails the stored
 *   file is deleted again (compensation), so no orphaned asset is left behind;
 * - delete: refuse while referenced → delete the file (idempotent) → delete metadata; a failed
 *   provider call changes nothing, and retrying a half-finished delete completes it.
 */
export function createMediaService({ storage, audit, context, logger }) {
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

  /** Public-safe projection (used by the content resolver and admin responses). */
  function present(media) {
    return {
      id: String(media._id),
      url: media.url,
      alt: media.decorative ? '' : media.alt,
      decorative: media.decorative,
      width: media.width,
      height: media.height,
      dominantColor: media.dominantColor ?? null,
      variants: storage.variants(media),
    };
  }

  function presentAdmin(media) {
    return {
      ...present(media),
      alt: media.alt,
      caption: media.caption,
      credit: media.credit,
      licence: media.licence,
      folder: media.folder,
      tags: media.tags,
      mimeType: media.mimeType,
      bytes: media.bytes,
      originalFilename: media.originalFilename,
      driver: media.driver,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }

  /** Where a media item is used (current drafts and published versions). */
  async function usage(id) {
    const usages = [];
    for (const kind of REFERENCING_KINDS) {
      const { Model } = CONTENT_KINDS[kind];
      const docs = await Model.find(
        { mediaRefs: id },
        { draft: 1, published: 1, key: 1, slug: 1, status: 1 },
      ).lean();
      for (const doc of docs) {
        usages.push({
          kind,
          id: String(doc._id),
          title: displayTitle(doc),
          state: doc.status === 'published' ? 'published' : 'draft',
        });
      }
    }
    return usages;
  }

  async function find(id) {
    const media = mongoose.isValidObjectId(id) ? await Media.findById(id) : null;
    if (!media) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');
    return media;
  }

  async function upload(actor, { file, fields }, ctx = {}) {
    if (!file) {
      throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Request validation failed.', [
        { path: 'file', message: 'Choose an image to upload' },
      ]);
    }
    const image = await processImage(file.buffer);

    const duplicate = await Media.findOne({ checksum: image.checksum });
    if (duplicate) return { media: duplicate, duplicateOf: String(duplicate._id) };

    const entry = await beginAudit({
      actor,
      action: 'media.upload',
      entityType: 'media',
      context: context(ctx),
    });
    let stored;
    try {
      stored = await storage.put({
        buffer: image.buffer,
        ext: image.ext,
        mimeType: image.mimeType,
      });
    } catch (err) {
      await entry.complete('failed');
      logger.error(
        { err: { name: err.name, message: err.message } },
        'media upload to storage failed',
      );
      throw providerUnavailable();
    }
    let media;
    try {
      media = await Media.create({
        driver: storage.driver,
        storageKey: stored.storageKey,
        version: stored.version,
        format: stored.format,
        url: stored.url,
        originalFilename: safeFilename(file.originalname),
        mimeType: image.mimeType,
        bytes: image.bytes,
        width: image.width,
        height: image.height,
        dominantColor: image.dominantColor,
        checksum: image.checksum,
        uploadedBy: actor?._id ?? null,
        ...fields,
      });
    } catch (err) {
      await compensate(stored.storageKey);
      await entry.complete('failed');
      if (err instanceof mongoose.Error.ValidationError) {
        throw new AppError(
          422,
          ERROR_CODES.VALIDATION_ERROR,
          'Request validation failed.',
          Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
        );
      }
      throw err;
    }
    await entry.complete('succeeded', { entityId: media._id });
    return { media, duplicateOf: null };
  }

  /** Remove a just-uploaded file whose metadata could not be saved. */
  async function compensate(storageKey) {
    try {
      await storage.remove(storageKey);
    } catch (err) {
      // The key is a random id (no personal data); logged so an operator can remove it.
      logger.error(
        { storageKey, err: { name: err.name } },
        'orphaned media asset; remove manually',
      );
    }
  }

  async function list({ q, folder, page = 1, limit = 30 } = {}) {
    const filter = {};
    if (folder) filter.folder = folder;
    if (q) {
      const pattern = mongoose.trusted({ $regex: escapeRegex(q), $options: 'i' });
      filter.$or = [{ alt: pattern }, { originalFilename: pattern }, { tags: pattern }];
    }
    const size = Math.min(limit, MAX_LIST_LIMIT);
    const [items, total] = await Promise.all([
      Media.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size),
      Media.countDocuments(filter),
    ]);
    return {
      items: items.map(presentAdmin),
      meta: { page, limit: size, total, totalPages: Math.ceil(total / size) },
    };
  }

  async function get(id) {
    const media = await find(id);
    return { ...presentAdmin(media), usage: await usage(media._id) };
  }

  async function update(actor, id, changes, ctx = {}) {
    const media = await find(id);
    Object.assign(media, changes);
    try {
      await media.save();
    } catch (err) {
      if (err instanceof mongoose.Error.ValidationError) {
        throw new AppError(
          422,
          ERROR_CODES.VALIDATION_ERROR,
          'Request validation failed.',
          Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
        );
      }
      throw err;
    }
    await audit.recordSafely({
      actor,
      action: 'media.update',
      outcome: 'succeeded',
      entityType: 'media',
      entityId: media._id,
      context: context(ctx),
    });
    return presentAdmin(media);
  }

  async function remove(actor, id, ctx = {}) {
    const media = await find(id);
    const used = await usage(media._id);
    if (used.length > 0)
      throw new AppError(409, ERROR_CODES.IN_USE, 'This image is still used.', used);
    const entry = await beginAudit({
      actor,
      action: 'media.delete',
      entityType: 'media',
      entityId: media._id,
      context: context(ctx),
    });
    try {
      await storage.remove(media.storageKey);
    } catch (err) {
      await entry.complete('failed');
      logger.error(
        { err: { name: err.name, message: err.message } },
        'media delete at storage failed',
      );
      throw providerUnavailable();
    }
    await Media.deleteOne({ _id: media._id });
    await entry.complete('succeeded');
  }

  return { upload, list, get, update, remove, present, usage };
}

/** Keep a readable, harmless original file name for the library (never used as a path). */
export function safeFilename(name) {
  if (typeof name !== 'string') return null;
  const base = name.split(/[\\/]/).pop().normalize('NFKC');
  const clean = base
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return clean || null;
}
