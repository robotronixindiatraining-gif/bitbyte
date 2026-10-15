import {
  JobOpening,
  Ordering,
  Page,
  Project,
  Service,
  Setting,
  Testimonial,
} from '../models/index.js';
import { serverSchemas } from './schemas.js';

/**
 * Registry of publishable content kinds (docs/DATABASE_SCHEMA.md §2.1).
 * - `path(slug)`: public URL (top-level for services/pages, D-038).
 * - `orderingKey`: list whose draft order receives new items (D-037).
 * - `keyed`: addressed by `key` instead of id (settings, orderings).
 */
export const CONTENT_KINDS = Object.freeze({
  service: {
    Model: Service,
    revisionType: 'service',
    schemaFor: (_doc, mode) => serverSchemas.contentSchema('service', mode),
    path: (slug) => `/${slug}`,
    topLevel: true,
    orderingKey: 'services',
  },
  page: {
    Model: Page,
    revisionType: 'page',
    schemaFor: (_doc, mode) => serverSchemas.contentSchema('page', mode),
    path: (slug) => (slug ? `/${slug}` : '/'),
    topLevel: true,
  },
  project: {
    Model: Project,
    revisionType: 'project',
    schemaFor: (_doc, mode) => serverSchemas.contentSchema('project', mode),
    path: (slug) => `/portfolio/${slug}`,
    orderingKey: 'projects',
  },
  job: {
    Model: JobOpening,
    revisionType: 'job',
    schemaFor: (_doc, mode) => serverSchemas.contentSchema('job', mode),
    path: (slug) => `/careers/${slug}`,
    orderingKey: 'jobOpenings',
  },
  testimonial: {
    Model: Testimonial,
    revisionType: 'testimonial',
    schemaFor: (_doc, mode) => serverSchemas.contentSchema('testimonial', mode),
    orderingKey: 'testimonials',
  },
  settings: {
    Model: Setting,
    revisionType: 'settings',
    schemaFor: (doc, mode) => serverSchemas.settingsSchema(doc.key, mode),
    keyed: true,
  },
  ordering: {
    Model: Ordering,
    revisionType: 'ordering',
    schemaFor: (_doc, mode) => serverSchemas.contentSchema('ordering', mode),
    keyed: true,
  },
});

/** Models whose documents may be referenced through `entityRefs` (kind → model). */
export const REFERENCE_MODELS = Object.freeze({
  service: Service,
  project: Project,
  testimonial: Testimonial,
  job: JobOpening,
  page: Page,
});

/** Collections scanned for "where used" (they carry `entityRefs` and `mediaRefs`). */
export const REFERENCING_KINDS = Object.freeze([
  'page',
  'service',
  'project',
  'testimonial',
  'job',
  'settings',
]);

/** Ordering key → model of the listed documents. */
export const ORDERING_TARGETS = Object.freeze({
  services: 'service',
  projects: 'project',
  testimonials: 'testimonial',
  jobOpenings: 'job',
  projectCategories: 'taxonomy',
});

/** Human label for lists and the dashboard. */
export function displayTitle(doc) {
  return (
    doc.draft?.title ??
    doc.published?.title ??
    doc.draft?.quote?.slice(0, 60) ??
    doc.key ??
    doc.slug ??
    String(doc._id)
  );
}
