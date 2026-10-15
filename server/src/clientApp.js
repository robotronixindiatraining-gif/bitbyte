import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { Router } from 'express';

/**
 * Serve the built React app (production). Hashed assets are cached for a year; the HTML shell is
 * revalidated on every request. Per-route SEO meta injection replaces the plain fallback in Stage 05/07.
 * Returns null when no build exists (e.g. API-only development).
 *
 * @param {{ distDir: string }} options
 */
export function clientApp({ distDir }) {
  const indexFile = path.join(distDir, 'index.html');
  if (!existsSync(indexFile)) return null;

  const router = Router();
  router.use(
    express.static(distDir, {
      index: false,
      setHeaders(res, filePath) {
        const isHashedAsset = filePath.startsWith(path.join(distDir, 'assets') + path.sep);
        res.setHeader(
          'Cache-Control',
          isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    }),
  );
  router.get('/{*path}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
  return router;
}
