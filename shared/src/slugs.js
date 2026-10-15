/**
 * Top-level paths that services and custom pages may not use (D-038, docs/DATABASE_SCHEMA.md §5).
 * Services and custom pages share one namespace at the site root, e.g. /cms-development.
 */
export const RESERVED_SLUGS = Object.freeze([
  'admin',
  'api',
  'services',
  'portfolio',
  'careers',
  'contact',
  'about',
  'privacy-policy',
  'terms',
  'preview',
  'assets',
  'uploads',
  'media',
  'sitemap.xml',
  'robots.txt',
  'favicon.ico',
  '404',
]);

/** @param {string} slug */
export function isReservedSlug(slug) {
  return RESERVED_SLUGS.includes(String(slug).toLowerCase());
}
