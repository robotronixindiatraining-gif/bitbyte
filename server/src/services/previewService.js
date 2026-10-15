import mongoose from 'mongoose';
import { ERROR_CODES } from '@bitbyte/shared';
import { CONTENT_KINDS } from '../content/kinds.js';
import { AppError } from '../utils/AppError.js';
import { createResolver } from './resolver.js';

const VIEWS = {
  page: 'pageView',
  service: 'serviceDetail',
  project: 'projectDetail',
  job: 'jobDetail',
};

/**
 * Admin preview (API_REFERENCE.md §5.2): the same shapes as the public endpoints, built from
 * DRAFTS of the item and everything it references, in the draft order (D-037). Admin-only;
 * responses are marked noindex and no-store by the controller.
 */
export function createPreviewService({ media, siteUrl }) {
  async function item(kind, id) {
    const { Model } = CONTENT_KINDS[kind];
    const doc = mongoose.isValidObjectId(id) ? await Model.findById(id).lean() : null;
    if (!doc) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');
    const resolver = createResolver({ mode: 'preview', media, siteUrl });
    return resolver[VIEWS[kind]](doc);
  }

  async function site() {
    return createResolver({ mode: 'preview', media, siteUrl }).siteBundle();
  }

  return { item, site };
}
