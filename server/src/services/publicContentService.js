import { ERROR_CODES } from '@bitbyte/shared';
import { Redirect, Taxonomy } from '../models/index.js';
import { normalizePath } from '../models/Redirect.js';
import { AppError } from '../utils/AppError.js';
import { CONTENT_PATHS, createResolver } from './resolver.js';

const notFound = () => new AppError(404, ERROR_CODES.NOT_FOUND, 'Not found.');

/**
 * Small in-memory cache for public reads (API_REFERENCE.md §1.5). Every admin write clears it
 * (see routes/admin), so unpublishing takes effect immediately; the TTL only bounds memory use.
 */
export function createPublicCache({ ttlMs = 60_000, maxEntries = 500 } = {}) {
  const entries = new Map();
  return {
    async wrap(key, load) {
      const hit = entries.get(key);
      if (hit && hit.expires > Date.now()) return hit.value;
      const generation = this.generation;
      const value = await load();
      // Skip storing results computed before a concurrent clear().
      if (generation === this.generation) {
        if (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
        entries.set(key, { value, expires: Date.now() + ttlMs });
      }
      return value;
    },
    clear() {
      this.generation += 1;
      entries.clear();
    },
    generation: 0,
    get size() {
      return entries.size;
    },
  };
}

/**
 * Public reads (API_REFERENCE.md §3). Everything goes through the resolver in `public` mode,
 * so only published, permitted content is ever returned; unknown and unpublished items
 * produce the same 404.
 */
export function createPublicContentService({ media, siteUrl, cache = createPublicCache() }) {
  const resolver = () => createResolver({ mode: 'public', media, siteUrl });
  const cached = (key, load) => cache.wrap(key, load);

  async function site() {
    return cached('site', () => resolver().siteBundle());
  }

  async function page(slug) {
    return cached(`page:${slug}`, async () => {
      const r = resolver();
      const doc = await r.bySlug('page', slug === 'home' ? '' : slug);
      if (!doc) throw notFound();
      return r.pageView(doc);
    });
  }

  async function listServices({ featured } = {}) {
    return cached(`services:${Boolean(featured)}`, async () => {
      const r = resolver();
      const docs = await r.all('service');
      return docs.filter((doc) => !featured || r.contentOf(doc).featured).map(r.serviceCard);
    });
  }

  async function getService(slug) {
    return cached(`service:${slug}`, async () => {
      const r = resolver();
      const doc = await r.bySlug('service', slug);
      if (!doc) throw notFound();
      return r.serviceDetail(doc);
    });
  }

  async function listProjects({
    category,
    technology,
    featured,
    page: pageNo = 1,
    limit = 12,
  } = {}) {
    return cached(`projects:${category}:${technology}:${featured}:${pageNo}:${limit}`, async () => {
      const r = resolver();
      const taxonomies = await r.taxonomies();
      const idOf = (type, slug) =>
        [...taxonomies.values()].find((t) => t.type === type && t.slug === slug)?._id?.toString();
      const categoryId = category ? idOf('projectCategory', category) : null;
      const technologyId = technology ? idOf('technology', technology) : null;
      if ((category && !categoryId) || (technology && !technologyId)) {
        return { items: [], meta: { page: pageNo, limit, total: 0, totalPages: 0 } };
      }
      const docs = (await r.all('project')).filter((doc) => {
        const c = r.contentOf(doc);
        if (featured && !c.featured) return false;
        if (categoryId && String(c.category) !== categoryId) return false;
        if (technologyId && !(c.technologies ?? []).map(String).includes(technologyId))
          return false;
        return true;
      });
      const pageDocs = docs.slice((pageNo - 1) * limit, pageNo * limit);
      return {
        items: await Promise.all(pageDocs.map(r.projectCard)),
        meta: {
          page: pageNo,
          limit,
          total: docs.length,
          totalPages: Math.ceil(docs.length / limit),
        },
      };
    });
  }

  async function getProject(slug) {
    return cached(`project:${slug}`, async () => {
      const r = resolver();
      const doc = await r.bySlug('project', slug);
      if (!doc) throw notFound();
      return r.projectDetail(doc);
    });
  }

  /** Only taxonomies used by at least one visible project or service. */
  async function listTaxonomies({ type } = {}) {
    return cached(`taxonomies:${type}`, async () => {
      const r = resolver();
      if (type === 'projectCategory') return r.usedCategories();
      const used = new Set();
      for (const kind of ['project', 'service']) {
        for (const doc of await r.all(kind)) {
          (r.contentOf(doc).technologies ?? []).forEach((id) => used.add(String(id)));
        }
      }
      const technologies = await Taxonomy.find({ type: 'technology' }, { name: 1, slug: 1 })
        .sort({ name: 1 })
        .lean();
      return technologies
        .filter((t) => used.has(String(t._id)))
        .map((t) => ({ name: t.name, slug: t.slug }));
    });
  }

  async function listTestimonials({ featured } = {}) {
    return cached(`testimonials:${Boolean(featured)}`, async () => {
      const r = resolver();
      const docs = (await r.all('testimonial')).filter(
        (doc) => !featured || r.contentOf(doc).featured,
      );
      return Promise.all(docs.map(r.testimonialView));
    });
  }

  async function listJobs() {
    return cached('jobs', async () => {
      const r = resolver();
      return (await r.all('job')).map(r.jobCard);
    });
  }

  async function getJob(slug) {
    return cached(`job:${slug}`, async () => {
      const r = resolver();
      const doc = await r.bySlug('job', slug);
      if (!doc) throw notFound();
      return r.jobDetail(doc);
    });
  }

  /**
   * What a site path shows (D-038): page/service/project/job, a redirect, or not_found.
   * Order: system pages and services at the top level, then custom pages, then redirects.
   */
  async function resolvePath(rawPath) {
    const path = normalizePath(rawPath);
    return cached(`resolve:${path}`, async () => {
      const r = resolver();
      const parts = path.split('/').filter(Boolean);
      let found = null;
      if (parts.length === 0) {
        const doc = await r.bySlug('page', '');
        if (doc) found = { kind: 'page', slug: 'home', path: '/' };
      } else if (parts.length === 1) {
        const [slug] = parts;
        if (await r.bySlug('service', slug)) found = { kind: 'service', slug, path };
        else if (await r.bySlug('page', slug)) found = { kind: 'page', slug, path };
      } else if (parts.length === 2 && parts[0] === 'portfolio') {
        if (await r.bySlug('project', parts[1])) found = { kind: 'project', slug: parts[1], path };
      } else if (parts.length === 2 && parts[0] === 'careers') {
        if (await r.bySlug('job', parts[1])) found = { kind: 'job', slug: parts[1], path };
      }
      if (found) return found;

      const redirect = await Redirect.findOne(
        { fromPath: path, enabled: true },
        { toPath: 1, statusCode: 1 },
      ).lean();
      if (redirect) {
        return {
          kind: 'redirect',
          slug: null,
          path,
          location: redirect.toPath,
          statusCode: redirect.statusCode,
        };
      }
      return { kind: 'not_found', slug: null, path };
    });
  }

  /** Published, indexable URLs for sitemap.xml. */
  async function sitemapEntries() {
    return cached('sitemap', async () => {
      const r = resolver();
      const entries = [];
      const add = (kind, doc) => {
        const content = r.contentOf(doc);
        if (content.seo?.noindex) return;
        entries.push({
          path: CONTENT_PATHS[kind](r.slugOf(doc)),
          lastModified: doc.publishedAt ?? doc.firstPublishedAt ?? null,
        });
      };
      for (const kind of ['page', 'service', 'project', 'job']) {
        for (const doc of await r.all(kind)) add(kind, doc);
      }
      return entries;
    });
  }

  return {
    cache,
    site,
    page,
    listServices,
    getService,
    listProjects,
    getProject,
    listTaxonomies,
    listTestimonials,
    listJobs,
    getJob,
    resolvePath,
    sitemapEntries,
  };
}
