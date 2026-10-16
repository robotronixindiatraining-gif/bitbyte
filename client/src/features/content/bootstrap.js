/**
 * Page data injected by the server into the HTML shell (server/src/seo/siteRoutes.js):
 * `<script id="bitbyte-bootstrap" type="application/json">{ path, kind, slug, data, site }</script>`.
 * It contains published content only. It is used for the first render of the page it was
 * rendered for, so that page needs no extra API round-trip; later navigation fetches from the API.
 */
let cached;

export function readBootstrap() {
  if (cached !== undefined) return cached;
  cached = null;
  if (typeof document === 'undefined') return cached;
  const element = document.getElementById('bitbyte-bootstrap');
  if (!element) return cached;
  try {
    const value = JSON.parse(element.textContent ?? '');
    cached = value && typeof value === 'object' ? value : null;
  } catch {
    cached = null;
  }
  return cached;
}

/** Bootstrap data, but only if it was rendered for `path` (the current location). */
export function bootstrapFor(path) {
  const value = readBootstrap();
  return value && value.path === path ? value : null;
}

/** Tests only. */
export function resetBootstrapCache() {
  cached = undefined;
}
