/**
 * Link safety (defence in depth; the server already validates links before publishing).
 * Internal: a site path ("/x", "/#a", "#a") — never "//host" or "/\host". External: http(s),
 * mailto: and tel:. Anything else is not rendered as a link.
 */
const INTERNAL = /^(\/(?![/\\])[^\s\\]*|#[\w-]*)$/;
const EXTERNAL = /^(https?:\/\/[^\s\\]+|mailto:[^\s]+|tel:[+\d\s()-]+)$/i;

/** @returns {'internal' | 'external' | null} */
export function linkKind(href) {
  if (typeof href !== 'string') return null;
  if (INTERNAL.test(href)) return 'internal';
  if (EXTERNAL.test(href)) return 'external';
  return null;
}

/** True for an internal path that the current page is at (or within, for section roots). */
export function isCurrentPath(href, pathname) {
  if (linkKind(href) !== 'internal' || href.startsWith('#')) return false;
  const path = href.split(/[?#]/)[0] || '/';
  return path === pathname;
}
