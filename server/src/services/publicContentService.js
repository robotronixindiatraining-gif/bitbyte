import { ERROR_CODES } from '@bitbyte/shared';
import { Ordering, Service } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

/**
 * Public reads. They select ONLY `slug` and `published`, from documents whose status is
 * "published", so drafts, archived items and internal fields never leave the server.
 * The remaining public endpoints arrive in Stage 05.
 */
const PUBLIC_PROJECTION = { slug: 1, published: 1, firstPublishedAt: 1 };

async function publishedOrder(key) {
  const ordering = await Ordering.findOne({ key, status: 'published' }, { published: 1 }).lean();
  return ordering?.published?.ids ?? [];
}

/** Sort by the published ordering; unlisted items follow, newest first (D-037). */
function applyOrder(docs, ids) {
  const position = new Map(ids.map((id, index) => [String(id), index]));
  return [...docs].sort((a, b) => {
    const pa = position.get(String(a._id));
    const pb = position.get(String(b._id));
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return (b.firstPublishedAt?.getTime() ?? 0) - (a.firstPublishedAt?.getTime() ?? 0);
  });
}

export function createPublicContentService() {
  async function listServices({ featured } = {}) {
    const filter = { status: 'published' };
    if (featured) filter['published.featured'] = true;
    const [docs, order] = await Promise.all([
      Service.find(filter, PUBLIC_PROJECTION).lean(),
      publishedOrder('services'),
    ]);
    return applyOrder(docs, order).map((doc) => ({
      slug: doc.slug,
      path: `/${doc.slug}`,
      title: doc.published.title,
      navLabel: doc.published.navLabel ?? null,
      summary: doc.published.summary,
      icon: doc.published.icon ?? null,
      featured: Boolean(doc.published.featured),
    }));
  }

  async function getService(slug) {
    const doc = await Service.findOne({ slug, status: 'published' }, PUBLIC_PROJECTION).lean();
    if (!doc) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');
    const { slug: _draftSlug, ...content } = doc.published;
    return { ...content, slug: doc.slug, path: `/${doc.slug}` };
  }

  return { listServices, getService };
}
