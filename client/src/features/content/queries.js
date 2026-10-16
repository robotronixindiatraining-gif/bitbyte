import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../../services/api/client.js';
import { bootstrapFor, readBootstrap } from './bootstrap.js';

const STALE_MS = 60_000;

/** GET a published resource; 404 (unknown or unpublished) resolves to `null`, not an error. */
async function getPublished(path, { signal } = {}) {
  try {
    const body = await apiRequest(path, { signal });
    return body?.data ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Global settings bundle (header, footer, contact). `null` parts = not published yet. */
export function useSite() {
  const initial = readBootstrap()?.site;
  return useQuery({
    queryKey: ['public', 'site'],
    queryFn: ({ signal }) => getPublished('/public/site', { signal }),
    initialData: initial ?? undefined,
    staleTime: STALE_MS,
  });
}

/**
 * A published CMS page by slug (`home` for the homepage). Data is `null` when the page is not
 * published, which pages render as their own intentional state rather than an error.
 * @param {string} slug
 * @param {string} path the URL path this page is shown at (for the bootstrap match)
 */
export function usePage(slug, path) {
  const boot = bootstrapFor(path);
  let initialData;
  if (boot?.kind === 'page' && boot.slug === slug) initialData = boot.data;
  else if (boot?.kind === 'not_found') initialData = null;
  return useQuery({
    queryKey: ['public', 'page', slug],
    queryFn: ({ signal }) => getPublished(`/public/pages/${encodeURIComponent(slug)}`, { signal }),
    initialData,
    staleTime: STALE_MS,
  });
}

/** Published services (header mega-menu summaries and icons). */
export function useServices() {
  return useQuery({
    queryKey: ['public', 'services'],
    queryFn: ({ signal }) => getPublished('/public/services', { signal }),
    staleTime: STALE_MS,
  });
}
