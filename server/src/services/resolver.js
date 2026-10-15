import mongoose from 'mongoose';
import {
  JobOpening,
  Media,
  Ordering,
  Page,
  Project,
  Service,
  Setting,
  Taxonomy,
  Testimonial,
} from '../models/index.js';

const MODELS = {
  service: Service,
  project: Project,
  testimonial: Testimonial,
  job: JobOpening,
  page: Page,
};
const PATHS = {
  service: (slug) => `/${slug}`,
  page: (slug) => (slug ? `/${slug}` : '/'),
  project: (slug) => `/portfolio/${slug}`,
  job: (slug) => `/careers/${slug}`,
};
const ORDERING_OF = {
  service: 'services',
  project: 'projects',
  testimonial: 'testimonials',
  job: 'jobOpenings',
};

/** Public reads never even load drafts or internal fields. */
const PUBLIC_FIELDS = {
  slug: 1,
  template: 1,
  status: 1,
  published: 1,
  firstPublishedAt: 1,
  createdAt: 1,
};

const asId = (value) => (mongoose.isValidObjectId(value) ? String(value) : null);

/** Open = no closing date, or a closing date in the future. */
export function isJobOpen(content, now = new Date()) {
  return !content?.closesAt || new Date(content.closesAt) > now;
}

/**
 * Builds visitor-facing views of CMS content (API_REFERENCE.md §3).
 *
 * `mode: 'public'` reads ONLY documents with status "published", ONLY their `published`
 * snapshot, and resolves references through the same filter: a reference to anything
 * unpublished, archived, unconsented or expired simply disappears (links are dropped, cards are
 * omitted). Nothing about the hidden item — not even its existence — reaches the response.
 *
 * `mode: 'preview'` (admin only) reads drafts of every non-archived item, so a page can be
 * previewed "as if published now", in the draft order (D-037).
 *
 * One resolver instance per request: it memoises lookups for that request only.
 *
 * @param {{ mode: 'public' | 'preview', media: { present(media: object): object },
 *   siteUrl: string | null }} options
 */
export function createResolver({ mode, media: mediaService, siteUrl }) {
  const preview = mode === 'preview';
  const contentOf = (doc) => (preview ? doc.draft : doc.published) ?? {};
  const slugOf = (doc) => (preview ? (doc.draft?.slug ?? doc.slug) : doc.slug);
  const memo = new Map();

  function remember(key, load) {
    if (!memo.has(key)) memo.set(key, load());
    return memo.get(key);
  }

  /** Visibility filter for one kind (state + consent/permission + open jobs). */
  function visibleFilter(kind) {
    const filter = preview
      ? { status: mongoose.trusted({ $ne: 'archived' }) }
      : { status: 'published' };
    if (kind === 'testimonial') filter['consent.confirmed'] = true;
    if (kind === 'project') filter['permission.confirmed'] = true;
    return filter;
  }

  function isVisible(kind, doc) {
    if (!doc) return false;
    if (kind === 'job' && !isJobOpen(contentOf(doc))) return false;
    return true;
  }

  async function all(kind) {
    return remember(`all:${kind}`, async () => {
      const docs = await MODELS[kind]
        .find(visibleFilter(kind), preview ? undefined : PUBLIC_FIELDS)
        .lean();
      const order = await orderOf(ORDERING_OF[kind]);
      return applyOrder(
        docs.filter((doc) => isVisible(kind, doc)),
        order,
      );
    });
  }

  async function byIds(kind, ids) {
    const wanted = ids.map(asId).filter(Boolean);
    if (wanted.length === 0) return [];
    const docs = await all(kind);
    const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
    return wanted.map((id) => byId.get(id)).filter(Boolean);
  }

  async function bySlug(kind, slug) {
    const docs = await all(kind);
    return docs.find((doc) => slugOf(doc) === slug) ?? null;
  }

  async function orderOf(key) {
    if (!key) return [];
    return remember(`order:${key}`, async () => {
      const ordering = await Ordering.findOne(
        { key },
        { draft: 1, published: 1, status: 1 },
      ).lean();
      if (!ordering) return [];
      if (preview) return ordering.draft?.ids ?? [];
      return ordering.status === 'published' ? (ordering.published?.ids ?? []) : [];
    });
  }

  async function taxonomies() {
    return remember('taxonomies', async () => {
      const docs = await Taxonomy.find({}, { type: 1, name: 1, slug: 1 }).lean();
      return new Map(docs.map((doc) => [String(doc._id), doc]));
    });
  }

  async function taxonomy(id) {
    const doc = (await taxonomies()).get(asId(id));
    return doc ? { name: doc.name, slug: doc.slug } : null;
  }

  async function settings(key) {
    return remember(`settings:${key}`, async () => {
      const doc = await Setting.findOne({ key }, { draft: 1, published: 1, status: 1 }).lean();
      if (!doc) return null;
      if (preview) return doc.draft ?? null;
      return doc.status === 'published' ? doc.published : null;
    });
  }

  async function mediaById(id) {
    const key = asId(id);
    if (!key) return null;
    return remember(`media:${key}`, async () => {
      const doc = await Media.findById(key).lean();
      return doc ? mediaService.present(doc) : null;
    });
  }

  async function image(ref) {
    if (!ref?.media) return null;
    const found = await mediaById(ref.media);
    if (!found) return null;
    const { id: _id, ...rest } = found;
    return ref.altOverride ? { ...rest, alt: ref.altOverride } : rest;
  }

  /** Links to unpublished targets are dropped (null), never rendered as dead links. */
  async function link(value) {
    if (!value?.label) return null;
    const base = { label: value.label, openInNewTab: Boolean(value.openInNewTab) };
    if (value.kind === 'internal' && value.href?.startsWith('/') && !value.href.startsWith('//')) {
      return { ...base, href: value.href, external: false };
    }
    if (value.kind === 'external' && /^https?:\/\//i.test(value.href ?? '')) {
      return { ...base, href: value.href, external: true };
    }
    if (value.kind === 'entity' && value.entity) {
      const path = await entityPath(value.entity.kind, value.entity.id);
      return path ? { ...base, href: path, external: false } : null;
    }
    return null;
  }

  async function entityPath(kind, id) {
    if (!MODELS[kind]) return null;
    const [doc] = await byIds(kind, [id]);
    return doc ? PATHS[kind](slugOf(doc)) : null;
  }

  const compact = async (items) => (await Promise.all(items)).filter(Boolean);

  async function seo(content, path, fallback = {}) {
    const site = (await settings('seo')) ?? {};
    const own = content.seo ?? {};
    const canonicalPath = own.canonicalPath ?? path;
    return {
      title: own.title || fallback.title || null,
      description: own.description || fallback.description || site.defaultDescription || null,
      canonical: siteUrl ? new URL(canonicalPath, siteUrl).href : canonicalPath,
      ogImage: (await mediaById(own.ogImage)) ?? (await image(site.defaultOgImage)),
      noindex: Boolean(own.noindex),
    };
  }

  // ---- entity views -------------------------------------------------------------------------

  function serviceCard(doc) {
    const c = contentOf(doc);
    return {
      slug: slugOf(doc),
      path: PATHS.service(slugOf(doc)),
      title: c.title,
      navLabel: c.navLabel || null,
      summary: c.summary,
      icon: c.icon ?? null,
      featured: Boolean(c.featured),
    };
  }

  async function serviceDetail(doc) {
    const c = contentOf(doc);
    const path = PATHS.service(slugOf(doc));
    return {
      ...serviceCard(doc),
      heroImage: await image(c.heroImage),
      intro: c.intro ?? '',
      offerings: c.offerings ?? [],
      industries: c.industries ?? [],
      process: c.process ?? [],
      technologies: await compact((c.technologies ?? []).map(taxonomy)),
      faqs: c.faqs ?? [],
      relatedProjects: await compact(
        (await byIds('project', c.relatedProjects ?? [])).map(projectCard),
      ),
      cta: c.cta
        ? { heading: c.cta.heading, text: c.cta.text ?? '', link: await link(c.cta.link) }
        : null,
      seo: await seo(c, path, { title: c.title, description: c.summary }),
    };
  }

  async function projectCard(doc) {
    const c = contentOf(doc);
    return {
      slug: slugOf(doc),
      path: PATHS.project(slugOf(doc)),
      title: c.title,
      summary: c.summary,
      category: await taxonomy(c.category),
      technologies: await compact((c.technologies ?? []).map(taxonomy)),
      cover: await image(c.cover),
      year: c.year ?? null,
      featured: Boolean(c.featured),
    };
  }

  async function projectDetail(doc) {
    const c = contentOf(doc);
    return {
      ...(await projectCard(doc)),
      // The client's name is shown only with explicit permission to name them.
      client: c.client?.showName && c.client?.name ? { name: c.client.name } : null,
      overview: c.overview ?? '',
      challenge: c.challenge ?? '',
      solution: c.solution ?? '',
      outcome: c.outcome ?? '',
      gallery: await compact(
        (c.gallery ?? []).map(async (item) => {
          const img = await image(item.image);
          return img ? { image: img, caption: item.caption ?? '' } : null;
        }),
      ),
      liveUrl: c.liveUrl ?? null,
      services: (await byIds('service', c.services ?? [])).map(serviceCard),
      seo: await seo(c, PATHS.project(slugOf(doc)), { title: c.title, description: c.summary }),
    };
  }

  async function testimonialView(doc) {
    const c = contentOf(doc);
    const [project] = c.project ? await byIds('project', [c.project]) : [];
    return {
      quote: c.quote,
      authorName: c.authorName,
      authorRole: c.authorRole || null,
      company: c.company || null,
      photo: await image(c.photo),
      project: project
        ? {
            slug: slugOf(project),
            title: contentOf(project).title,
            path: PATHS.project(slugOf(project)),
          }
        : null,
      featured: Boolean(c.featured),
    };
  }

  function jobCard(doc) {
    const c = contentOf(doc);
    return {
      slug: slugOf(doc),
      path: PATHS.job(slugOf(doc)),
      title: c.title,
      department: c.department || null,
      location: c.location,
      employmentType: c.employmentType,
      experience: c.experience || null,
      summary: c.summary,
      closesAt: c.closesAt ?? null,
    };
  }

  async function jobDetail(doc) {
    const c = contentOf(doc);
    return {
      ...jobCard(doc),
      description: c.description ?? '',
      responsibilities: c.responsibilities ?? [],
      requirements: c.requirements ?? [],
      applyInstructions: c.applyInstructions ?? '',
      postedAt: doc.firstPublishedAt ?? null,
      application: await careersApplication(),
      seo: await seo(c, PATHS.job(slugOf(doc)), { title: c.title, description: c.summary }),
    };
  }

  async function careersApplication() {
    const careers = await settings('careers');
    if (!careers) return null;
    return {
      method: careers.applicationMethod,
      email: careers.applicationMethod === 'email' ? (careers.careersEmail ?? null) : null,
      url: careers.applicationMethod === 'external' ? (careers.externalUrl ?? null) : null,
    };
  }

  // ---- sections -----------------------------------------------------------------------------

  async function pickBySource(kind, source, ids, isFeatured) {
    if (source === 'manual') return byIds(kind, ids ?? []);
    const docs = await all(kind);
    return source === 'featured' ? docs.filter((doc) => isFeatured(contentOf(doc))) : docs;
  }

  const SECTION_RESOLVERS = {
    async hero(d) {
      return {
        ...d,
        primaryCta: await link(d.primaryCta),
        secondaryCta: await link(d.secondaryCta),
        image: await image(d.image),
      };
    },
    async serviceGrid(d) {
      const docs = await pickBySource('service', d.source, d.services, (c) => c.featured);
      const { services: _ids, ...rest } = d;
      return { ...rest, items: docs.map(serviceCard) };
    },
    async projectShowcase(d) {
      let docs = await pickBySource('project', d.source, d.projects, (c) => c.featured);
      if (d.limit) docs = docs.slice(0, d.limit);
      const { projects: _ids, ...rest } = d;
      const items = await compact(docs.map(projectCard));
      return { ...rest, items, categories: d.showFilters ? await usedCategories() : [] };
    },
    async testimonials(d) {
      const docs = await pickBySource('testimonial', d.source, d.items, (c) => c.featured);
      return {
        heading: d.heading,
        source: d.source,
        items: await compact(docs.map(testimonialView)),
      };
    },
    async splitContent(d) {
      return { ...d, image: await image(d.image), cta: await link(d.cta) };
    },
    async ctaBanner(d) {
      return {
        ...d,
        primaryCta: await link(d.primaryCta),
        secondaryCta: await link(d.secondaryCta),
      };
    },
    async engagementModels(d) {
      return {
        ...d,
        models: await Promise.all(
          (d.models ?? []).map(async (m) => ({ ...m, cta: await link(m.cta) })),
        ),
      };
    },
    async clientLogos(d) {
      const logos = await compact(
        (d.logos ?? []).map(async (logo) => {
          const img = await image(logo.image);
          return img ? { image: img, name: logo.name, url: logo.url ?? null } : null;
        }),
      );
      return { ...d, logos };
    },
    async jobList(d) {
      return { ...d, items: (await all('job')).map(jobCard) };
    },
  };

  async function section(value) {
    const resolve = SECTION_RESOLVERS[value.type];
    const data = value.data ?? {};
    return {
      key: value.key,
      type: value.type,
      anchorId: value.anchorId ?? null,
      variant: {
        background: value.variant?.background ?? 'light',
        spacing: value.variant?.spacing ?? 'default',
      },
      data: resolve ? await resolve(data) : data,
    };
  }

  async function usedCategories() {
    const projects = await all('project');
    const used = new Set(projects.map((doc) => String(contentOf(doc).category)));
    const order = await orderOf('projectCategories');
    const map = await taxonomies();
    const categories = [...map.values()].filter(
      (t) => t.type === 'projectCategory' && used.has(String(t._id)),
    );
    return applyOrder(categories, order).map((t) => ({ name: t.name, slug: t.slug }));
  }

  async function pageView(doc) {
    const c = contentOf(doc);
    const slug = slugOf(doc);
    return {
      slug: slug || 'home',
      path: PATHS.page(slug),
      template: doc.template,
      title: c.title,
      sections: await Promise.all(
        (c.sections ?? []).filter((s) => s.visible !== false).map(section),
      ),
      seo: await seo(c, PATHS.page(slug), { title: c.title }),
    };
  }

  // ---- site bundle --------------------------------------------------------------------------

  async function siteBundle() {
    const [
      general,
      contact,
      navigation,
      footer,
      social,
      seoSettings,
      leadForm,
      integrations,
      careers,
    ] = await Promise.all(
      [
        'general',
        'contact',
        'navigation',
        'footer',
        'social',
        'seo',
        'leadForm',
        'integrations',
        'careers',
      ].map(settings),
    );
    const navItem = async (item) => {
      const top = await link(item.link);
      if (!top) return null;
      return { ...top, children: await compact((item.children ?? []).map(link)) };
    };
    return {
      general: general
        ? {
            companyName: general.companyName,
            legalName: general.legalName || null,
            tagline: general.tagline || null,
            logo: await image(general.logo),
            logoInverse: await image(general.logoInverse),
            favicon: await image(general.favicon),
          }
        : null,
      contact: contact ?? null,
      navigation: navigation
        ? {
            header: await compact((navigation.header ?? []).map(navItem)),
            cta: await link(navigation.cta),
          }
        : null,
      footer: footer
        ? {
            columns: await Promise.all(
              (footer.columns ?? []).map(async (col) => ({
                heading: col.heading,
                links: await compact((col.links ?? []).map(link)),
              })),
            ),
            showContact: footer.showContact ?? true,
            copyrightHolder: footer.copyrightHolder,
            bottomLinks: await compact((footer.bottomLinks ?? []).map(link)),
          }
        : null,
      social: social ? { profiles: social.profiles ?? [] } : null,
      seo: seoSettings
        ? {
            titleTemplate: seoSettings.titleTemplate,
            defaultDescription: seoSettings.defaultDescription || null,
            defaultOgImage: await image(seoSettings.defaultOgImage),
            // A public meta-tag value (Search Console ownership), not a secret.
            searchConsoleToken: seoSettings.searchConsoleToken || null,
          }
        : null,
      // Recipients (notificationEmails) are internal and never leave the server.
      leadForm: leadForm
        ? {
            budgetOptions: leadForm.budgetOptions ?? [],
            consentText: leadForm.consentText,
            successMessage: leadForm.successMessage,
          }
        : null,
      careers: careers ? await careersApplication() : null,
      integrations: { turnstileSiteKey: integrations?.turnstileSiteKey || null },
    };
  }

  return {
    mode,
    contentOf,
    slugOf,
    all,
    byIds,
    bySlug,
    settings,
    image,
    link,
    taxonomies,
    usedCategories,
    serviceCard,
    serviceDetail,
    projectCard,
    projectDetail,
    testimonialView,
    jobCard,
    jobDetail,
    pageView,
    siteBundle,
  };
}

/** Sort by an ordering's ids; unlisted items follow, newest first (D-037). */
export function applyOrder(docs, ids) {
  const position = new Map(ids.map((id, index) => [String(id), index]));
  const time = (doc) => new Date(doc.firstPublishedAt ?? doc.createdAt ?? 0).getTime();
  return [...docs].sort((a, b) => {
    const pa = position.get(String(a._id));
    const pb = position.get(String(b._id));
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return time(b) - time(a);
  });
}

export { PATHS as CONTENT_PATHS };
