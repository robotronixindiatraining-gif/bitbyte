import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createServices } from '../src/container.js';
import { JobOpening, Redirect } from '../src/models/index.js';
import { renderShell, safeJson } from '../src/seo/html.js';
import {
  completeJob,
  completeService,
  createMedia,
  fakeStorage,
  publishSettings,
} from './support/fixtures.js';
import { useTestDatabase } from './support/db.js';
import { buildApp, testConfig } from './helpers.js';

useTestDatabase();

const actor = { _id: new mongoose.Types.ObjectId(), email: 'editor@example.com' };
const SHELL =
  '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>BitByte</title></head><body><div id="root"></div></body></html>';
const PRODUCTION = {
  NODE_ENV: 'production',
  PUBLIC_SITE_URL: 'https://www.bitbyteindia.com',
  MONGODB_URI: 'mongodb://127.0.0.1:1/unused',
  ROBOTS_ALLOW_INDEXING: 'true',
};
let distDir;
let content;

beforeAll(() => {
  distDir = mkdtempSync(path.join(tmpdir(), 'bitbyte-seo-'));
  writeFileSync(path.join(distDir, 'index.html'), SHELL);
});
afterAll(() => rmSync(distDir, { recursive: true, force: true }));

beforeEach(async () => {
  ({ content } = createServices({
    config: testConfig(),
    logger: pino({ level: 'silent' }),
    overrides: { mediaStorage: fakeStorage() },
  }));
  await publishSettings('general', { companyName: 'BitByte Software Technology' });
  await publishSettings('seo', {
    titleTemplate: '%s | BitByte',
    defaultDescription: 'Default description.',
  });
});

const app = (env = {}) =>
  buildApp({
    env: { CLIENT_DIST_DIR: distDir, ...env },
    overrides: { mediaStorage: fakeStorage() },
  });
async function published(kind, draft) {
  const doc = await content.create(kind, actor, { draft });
  return content.publish(kind, doc._id, actor, { revision: doc.revision });
}

describe('HTML shell with per-route metadata', () => {
  it('injects escaped title, description, canonical, social tags and bootstrap data', async () => {
    const og = await createMedia({ alt: 'Social card' });
    await published('page', {
      title: 'Landing </title><script>alert(1)</script>',
      slug: 'landing',
      seo: { description: 'All about "us" & <friends>', ogImage: String(og._id) },
    });
    const res = await request(app(PRODUCTION)).get('/landing');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain(
      '<title>Landing &lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt; | BitByte</title>',
    );
    expect(res.text).not.toContain('<script>alert(1)</script>');
    expect(res.text).toContain(
      '<meta name="description" content="All about &quot;us&quot; &amp; &lt;friends&gt;" />',
    );
    expect(res.text).toContain(
      '<link rel="canonical" href="https://www.bitbyteindia.com/landing" />',
    );
    expect(res.text).toContain('<meta name="robots" content="index, follow" />');
    expect(res.text).toContain(`<meta property="og:image" content="${og.url}" />`);
    expect(res.text).toContain(
      '<meta property="og:site_name" content="BitByte Software Technology" />',
    );
    const bootstrap = res.text.match(
      /<script id="bitbyte-bootstrap" type="application\/json">(.*?)<\/script>/,
    )[1];
    expect(bootstrap).not.toContain('</');
    expect(JSON.parse(bootstrap)).toMatchObject({
      kind: 'page',
      slug: 'landing',
      data: { slug: 'landing' },
    });
    expect(res.headers['x-robots-tag']).toBeUndefined();
  });

  it('adds JSON-LD from published values only', async () => {
    await published('page', { title: 'Home', slug: '' });
    await published('service', completeService());
    await published('job', completeJob());
    const site = app(PRODUCTION);
    const home = await request(site).get('/');
    expect(home.text).toContain('"@type":"Organization","name":"BitByte Software Technology"');
    const service = await request(site).get('/internet-of-things');
    expect(service.status).toBe(200);
    expect(service.text).toContain('"@type":"Service","name":"Internet of Things"');
    const job = await request(site).get('/careers/nodejs-developer');
    expect(job.text).toContain('"@type":"JobPosting"');
    expect(job.text).toContain('"employmentType":"FULL_TIME"');
  });

  it('returns real 404s for unknown, draft-only and expired content', async () => {
    await content.create('page', actor, { draft: { title: 'Draft page', slug: 'draft-page' } });
    const closed = await published('job', completeJob({ slug: 'closed' }));
    await JobOpening.updateOne(
      { _id: closed._id },
      { $set: { 'published.closesAt': '2020-01-01T00:00:00Z' } },
    );
    for (const url of ['/does-not-exist', '/draft-page', '/careers/closed', '/portfolio/x/y']) {
      const res = await request(app(PRODUCTION)).get(url);
      expect(res.status, url).toBe(404);
      expect(res.text).toContain('<meta name="robots" content="noindex, follow" />');
      expect(res.text).not.toContain('Draft page');
    }
  });

  it('marks everything noindex outside production and admin pages always', async () => {
    await published('page', { title: 'Landing', slug: 'landing' });
    const dev = await request(app()).get('/landing');
    expect(dev.text).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(dev.headers['x-robots-tag']).toBe('noindex');
    const admin = await request(app(PRODUCTION)).get('/admin');
    expect(admin.headers['x-robots-tag']).toBe('noindex');
    expect(admin.headers['cache-control']).toBe('no-store');
    expect((await request(app(PRODUCTION)).get('/api/v1/health')).headers['x-robots-tag']).toBe(
      'noindex',
    );
  });
});

describe('redirects and URL normalisation', () => {
  it('serves stored redirects with their status and counts hits', async () => {
    await Redirect.create({
      fromPath: '/old-page',
      toPath: '/contact',
      statusCode: 301,
      source: 'legacy',
    });
    await Redirect.create({
      fromPath: '/promo',
      toPath: 'https://partner.example/x',
      statusCode: 302,
      source: 'manual',
    });
    await Redirect.create({
      fromPath: '/disabled',
      toPath: '/contact',
      enabled: false,
      source: 'manual',
    });
    const site = app(PRODUCTION);
    const res = await request(site).get('/old-page');
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('/contact');
    expect((await request(site).get('/promo')).status).toBe(302);
    expect((await request(site).get('/disabled')).status).toBe(404);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((await Redirect.findOne({ fromPath: '/old-page' })).hits).toBe(1);
  });

  it('normalises case, trailing and repeated slashes without creating open redirects', async () => {
    const site = app(PRODUCTION);
    const cases = [
      ['/Internet-Of-Things/', '/internet-of-things'],
      ['/about/?utm_source=x', '/about?utm_source=x'],
      ['//evil.example/', '/evil.example'],
      ['///evil.example//x', '/evil.example/x'],
    ];
    for (const [from, to] of cases) {
      const res = await request(site).get(from);
      expect(res.status, from).toBe(301);
      expect(res.headers.location, from).toBe(to);
    }
    expect((await request(site).get('/assets/App.JS')).status).toBe(404);
  });

  it('keeps the canonical host redirect disabled until configured (D-028)', async () => {
    const off = await request(app(PRODUCTION)).get('/x').set('Host', 'bitbyteindia.com');
    expect(off.status).not.toBe(301);
    const on = app({ ...PRODUCTION, CANONICAL_HOST: 'www.bitbyteindia.com' });
    const res = await request(on).get('/about?x=1').set('Host', 'bitbyteindia.com');
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('https://www.bitbyteindia.com/about?x=1');
    expect((await request(on).get('/api/v1/health').set('Host', 'internal:4000')).status).toBe(200);
  });
});

describe('normalisePaths', () => {
  it('ignores absolute-form request targets', async () => {
    const { normalisePaths } = await import('../src/seo/siteRoutes.js');
    let redirected = null;
    let nexted = false;
    normalisePaths()(
      { method: 'GET', originalUrl: 'http://evil.example/X' },
      { redirect: (code, to) => (redirected = [code, to]) },
      () => (nexted = true),
    );
    expect(redirected).toBeNull();
    expect(nexted).toBe(true);
  });
});

describe('robots.txt and sitemap.xml', () => {
  it('blocks all crawling unless production indexing is enabled', async () => {
    expect((await request(app()).get('/robots.txt')).text).toBe('User-agent: *\nDisallow: /\n');
    expect(
      (await request(app({ ...PRODUCTION, ROBOTS_ALLOW_INDEXING: 'false' })).get('/robots.txt'))
        .text,
    ).toBe('User-agent: *\nDisallow: /\n');
    const live = await request(app(PRODUCTION)).get('/robots.txt');
    expect(live.text).toBe(
      'User-agent: *\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://www.bitbyteindia.com/sitemap.xml\n',
    );
  });

  it('lists only published, indexable, open content', async () => {
    await published('page', { title: 'Home', slug: '' });
    await published('page', { title: 'Hidden', slug: 'hidden', seo: { noindex: true } });
    await content.create('page', actor, { draft: { title: 'Draft', slug: 'draft' } });
    await published('service', completeService());
    await published('job', completeJob());
    const closed = await published('job', completeJob({ slug: 'closed' }));
    await JobOpening.updateOne(
      { _id: closed._id },
      { $set: { 'published.closesAt': '2020-01-01T00:00:00Z' } },
    );

    const res = await request(app(PRODUCTION)).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    const locs = [...res.text.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]).sort();
    expect(locs).toEqual([
      'https://www.bitbyteindia.com/',
      'https://www.bitbyteindia.com/careers/nodejs-developer',
      'https://www.bitbyteindia.com/internet-of-things',
    ]);
  });
});

describe('renderShell helpers', () => {
  it('escapes JSON for script elements', () => {
    expect(safeJson({ a: '</script><!--' })).toBe('{"a":"\\u003c/script\\u003e\\u003c!--"}');
    const html = renderShell('<html><head><title>x</title></head></html>', {
      title: '$& $1',
      bootstrap: null,
    });
    expect(html).toContain('<title>$&amp; $1</title>');
  });
});
