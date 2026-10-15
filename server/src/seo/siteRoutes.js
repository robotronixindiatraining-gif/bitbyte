import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import express, { Router } from 'express';
import { Redirect } from '../models/index.js';
import { renderShell } from './html.js';
import { jobPostingLd, organizationLd, serviceLd } from './structuredData.js';

const SKIP_NORMALISE = /^\/(api|assets|uploads)(\/|$)/;
const HAS_EXTENSION = /\/[^/]*\.[^/]*$/;

/**
 * 301 to the normalised form of a page URL: lower case, no trailing slash, no repeated slashes
 * (ROUTE_MAP.md §4). The Location is always a single-slash site path (never "//host").
 */
export function normalisePaths() {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    // Split by hand: URL parsing would read "//host/x" as a host name, not a path.
    const queryAt = req.originalUrl.indexOf('?');
    const pathname = queryAt === -1 ? req.originalUrl : req.originalUrl.slice(0, queryAt);
    const search = queryAt === -1 ? '' : req.originalUrl.slice(queryAt);
    if (SKIP_NORMALISE.test(pathname) || HAS_EXTENSION.test(pathname)) return next();
    let normal = pathname.toLowerCase().replace(/\/{2,}/g, '/');
    if (normal.length > 1) normal = normal.replace(/\/+$/, '');
    if (normal === pathname) return next();
    return res.redirect(301, `${normal}${search}`);
  };
}

/** Canonical host redirect (D-028). Disabled unless CANONICAL_HOST is set after verification. */
export function canonicalHost(host) {
  return (req, res, next) => {
    if (!host || (req.method !== 'GET' && req.method !== 'HEAD')) return next();
    if (req.path.startsWith('/api/v1/health')) return next();
    if (req.get('host')?.toLowerCase() === host) return next();
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  };
}

function robotsTxt({ allowIndexing, siteUrl }) {
  if (!allowIndexing) {
    // Staging, development and production before launch: keep everything out of search engines.
    return 'User-agent: *\nDisallow: /\n';
  }
  return [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /api',
    '',
    `Sitemap: ${new URL('/sitemap.xml', siteUrl).href}`,
    '',
  ].join('\n');
}

function sitemapXml(entries, siteUrl) {
  const xml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const urls = entries.map(({ path: entryPath, lastModified }) => {
    const lastmod = lastModified
      ? `<lastmod>${new Date(lastModified).toISOString().slice(0, 10)}</lastmod>`
      : '';
    return `  <url><loc>${xml(new URL(entryPath, siteUrl).href)}</loc>${lastmod}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/**
 * Everything outside /api: robots.txt, sitemap.xml, local media, the built client and the HTML
 * shell with per-route metadata. Content routes answer with real status codes: 200, 301/302
 * (redirects), 404 (unknown or unpublished) or 503 (content temporarily unavailable).
 *
 * @param {{ config: object, services: object }} deps
 */
export function siteRouter({ config, services, db }) {
  const { publicContent, storage } = services;
  const router = Router();
  const siteUrlFor = (req) => config.publicSiteUrl ?? `${req.protocol}://${req.get('host')}`;

  router.get('/robots.txt', (req, res) => {
    res
      .type('text/plain')
      .set('Cache-Control', 'public, max-age=3600')
      .send(robotsTxt({ allowIndexing: config.robotsAllowIndexing, siteUrl: siteUrlFor(req) }));
  });

  router.get('/sitemap.xml', async (req, res, next) => {
    try {
      const siteUrl = siteUrlFor(req);
      const entries = await publicContent.sitemapEntries();
      res
        .type('application/xml')
        .set('Cache-Control', 'public, max-age=3600')
        .send(sitemapXml(entries, siteUrl));
    } catch (err) {
      next(err);
    }
  });

  if (storage.driver === 'local') {
    router.use(
      '/uploads',
      express.static(storage.publicDir, {
        index: false,
        fallthrough: false,
        dotfiles: 'deny',
        immutable: true,
        maxAge: '365d',
      }),
    );
  }

  const indexFile = path.join(config.clientDistDir, 'index.html');
  if (!existsSync(indexFile)) return router;
  const template = readFileSync(indexFile, 'utf8');

  router.use(
    express.static(config.clientDistDir, {
      index: false,
      setHeaders(res, filePath) {
        const isHashedAsset = filePath.startsWith(
          path.join(config.clientDistDir, 'assets') + path.sep,
        );
        res.setHeader(
          'Cache-Control',
          isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    }),
  );

  router.get('/{*path}', async (req, res, next) => {
    if (HAS_EXTENSION.test(req.path)) return next();
    const noindexAll = !config.robotsAllowIndexing;
    const send = (status, meta, { cache = 'no-cache' } = {}) => {
      if (noindexAll || meta.robots?.includes('noindex')) res.set('X-Robots-Tag', 'noindex');
      res
        .status(status)
        .type('html')
        .set('Cache-Control', cache)
        .send(
          renderShell(template, {
            ...meta,
            robots: noindexAll ? 'noindex, nofollow' : meta.robots,
          }),
        );
    };

    // The admin UI is never indexed and never cached.
    if (req.path === '/admin' || req.path.startsWith('/admin/')) {
      return send(200, { title: 'Admin', robots: 'noindex, nofollow' }, { cache: 'no-store' });
    }

    const unavailable = () => {
      res.set('Retry-After', '60');
      return send(
        503,
        { title: 'Temporarily unavailable', robots: 'noindex, nofollow' },
        { cache: 'no-store' },
      );
    };
    // Without the database the shell still loads (the app shows its own error state), but
    // crawlers get a 503 rather than an empty page.
    if (db && db.getState() !== 'up') return unavailable();

    let site;
    let route;
    try {
      [site, route] = await Promise.all([
        publicContent.site(),
        publicContent.resolvePath(req.path),
      ]);
    } catch (err) {
      req.log?.warn({ err: { name: err?.name } }, 'page metadata unavailable');
      return unavailable();
    }

    if (route.kind === 'redirect') {
      void Redirect.updateOne(
        { fromPath: route.path },
        { $inc: { hits: 1 }, $set: { lastHitAt: new Date() } },
      ).catch(() => {});
      return res.redirect(route.statusCode ?? 301, route.location);
    }

    const titleTemplate = site.seo?.titleTemplate;
    const fullTitle = (title) =>
      titleTemplate && title
        ? titleTemplate.replace('%s', title)
        : (title ?? site.general?.companyName ?? '');
    const siteUrl = siteUrlFor(req);

    if (route.kind === 'not_found') {
      return send(404, {
        title: fullTitle('Page not found'),
        robots: 'noindex, follow',
        siteName: site.general?.companyName,
        bootstrap: { path: req.path, kind: 'not_found', site },
      });
    }

    let data;
    try {
      const loaders = {
        page: () => publicContent.page(route.slug),
        service: () => publicContent.getService(route.slug),
        project: () => publicContent.getProject(route.slug),
        job: () => publicContent.getJob(route.slug),
      };
      data = await loaders[route.kind]();
    } catch (err) {
      if (err?.status === 404)
        return send(404, { title: fullTitle('Page not found'), robots: 'noindex, follow' });
      return next(err);
    }

    const jsonLd = [];
    if (route.kind === 'page' && route.slug === 'home') jsonLd.push(organizationLd(site, siteUrl));
    if (route.kind === 'service') jsonLd.push(serviceLd(data, site, siteUrl));
    if (route.kind === 'job') jsonLd.push(jobPostingLd(data, site, siteUrl));

    return send(200, {
      title: fullTitle(data.seo?.title || data.title),
      description: data.seo?.description ?? null,
      canonical: data.seo?.canonical ?? null,
      robots: data.seo?.noindex ? 'noindex, follow' : 'index, follow',
      ogImage: data.seo?.ogImage ?? null,
      ogType: route.kind === 'page' ? 'website' : 'article',
      siteName: site.general?.companyName ?? null,
      verification: site.seo?.searchConsoleToken ?? null,
      jsonLd: jsonLd.filter(Boolean),
      bootstrap: { path: req.path, kind: route.kind, slug: route.slug, data, site },
    });
  });
  return router;
}
