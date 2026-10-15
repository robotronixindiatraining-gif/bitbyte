import mongoose from 'mongoose';
import pino from 'pino';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createServices } from '../src/container.js';
import {
  AuditLog,
  Media,
  Ordering,
  Page,
  Redirect,
  Revision,
  Service,
  Taxonomy,
  Testimonial,
} from '../src/models/index.js';
import { buildApp, testConfig } from './helpers.js';
import { useTestDatabase } from './support/db.js';

useTestDatabase();

const actor = { _id: new mongoose.Types.ObjectId(), email: 'editor@example.com' };
let content;

beforeEach(() => {
  ({ content } = createServices({ config: testConfig(), logger: pino({ level: 'silent' }) }));
});

const completeService = (overrides = {}) => ({
  title: 'Internet of Things',
  slug: 'internet-of-things',
  summary: 'Connected devices and data.',
  intro: '<p>Verified introduction.</p>',
  ...overrides,
});

async function publishedService(slug, draftOverrides = {}) {
  const doc = await content.create('service', actor, {
    draft: completeService({ slug, title: slug, ...draftOverrides }),
  });
  return content.publish('service', doc._id, actor, { revision: doc.revision });
}

describe('draft and publish workflow', () => {
  it('blocks publishing while [CONFIRM …] placeholders remain (D-015)', async () => {
    const doc = await content.create('service', actor, {
      draft: completeService({ summary: '[CONFIRM VERIFIED COPY]' }),
    });
    const error = await content
      .publish('service', doc._id, actor, { revision: doc.revision })
      .catch((e) => e);
    expect(error).toMatchObject({ status: 409, code: 'PLACEHOLDERS_PRESENT' });
    expect(error.details).toEqual([{ path: 'draft.summary', token: '[CONFIRM VERIFIED COPY]' }]);
    expect((await Service.findById(doc._id)).status).toBe('draft');
  });

  it('validates strictly at publish time', async () => {
    const doc = await content.create('service', actor, {
      draft: { title: 'Partial', slug: 'partial' },
    });
    const error = await content
      .publish('service', doc._id, actor, { revision: doc.revision })
      .catch((e) => e);
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    expect(error.details.map((d) => d.path)).toEqual(
      expect.arrayContaining(['draft.summary', 'draft.intro']),
    );
  });

  it('publishes atomically, records a revision and an audit entry', async () => {
    const published = await publishedService('internet-of-things');
    expect(published).toMatchObject({
      status: 'published',
      publishedRevision: 1,
      hasUnpublishedChanges: false,
    });
    expect(published.published.title).toBe('internet-of-things');
    expect(await Revision.countDocuments({ entityId: published._id })).toBe(1);
    expect(
      await AuditLog.findOne({ action: 'content.publish', entityId: published._id }),
    ).toMatchObject({ outcome: 'succeeded' });
  });

  it('keeps the live version unchanged while a new draft is edited', async () => {
    const live = await publishedService('digital-marketing');
    const edited = await content.saveDraft('service', live._id, actor, {
      revision: live.revision,
      draft: { ...live.draft, title: 'Draft-only title' },
    });
    expect(edited.revision).toBe(live.revision + 1);
    expect(edited.hasUnpublishedChanges).toBe(true);
    expect(edited.published.title).toBe('digital-marketing');
  });

  it('rejects stale revisions instead of overwriting (D-010)', async () => {
    const doc = await content.create('service', actor, { draft: completeService() });
    await content.saveDraft('service', doc._id, actor, {
      revision: 1,
      draft: completeService({ title: 'First save' }),
    });
    const error = await content
      .saveDraft('service', doc._id, actor, {
        revision: 1,
        draft: completeService({ title: 'Stale save' }),
      })
      .catch((e) => e);
    expect(error).toMatchObject({
      status: 409,
      code: 'EDIT_CONFLICT',
      details: { currentRevision: 2 },
    });
    expect((await Service.findById(doc._id)).draft.title).toBe('First save');
  });

  it('unpublishes to "archived" and keeps the snapshot', async () => {
    const live = await publishedService('cms-development');
    const archived = await content.unpublish('service', live._id, actor, {
      revision: live.revision,
    });
    expect(archived.status).toBe('archived');
    expect(archived.published.title).toBe('cms-development');
  });

  it('requires consent before publishing a testimonial', async () => {
    const doc = await content.create('testimonial', actor, {
      draft: { quote: 'Great work on our site.', authorName: 'R. Client' },
    });
    const error = await content
      .publish('testimonial', doc._id, actor, { revision: doc.revision })
      .catch((e) => e);
    expect(error).toMatchObject({ status: 409, code: 'CONSENT_REQUIRED' });
    await Testimonial.updateOne(
      { _id: doc._id },
      { $set: { 'consent.confirmed': true, 'consent.method': 'email' } },
    );
    await expect(
      content.publish('testimonial', doc._id, actor, { revision: doc.revision }),
    ).resolves.toMatchObject({ status: 'published' });
  });

  it('requires client permission and published references for projects', async () => {
    const category = await Taxonomy.create({
      type: 'projectCategory',
      name: 'Web Development',
      slug: 'web-development',
    });
    const media = await Media.create({
      driver: 'local',
      storageKey: 'dev/cover',
      url: '/uploads/cover.jpg',
      mimeType: 'image/jpeg',
      bytes: 10,
      width: 10,
      height: 10,
      checksum: 'b'.repeat(64),
      alt: 'Cover',
    });
    const draftService = await content.create('service', actor, {
      draft: completeService({ slug: 'web-development' }),
    });
    const doc = await content.create('project', actor, {
      draft: {
        title: 'Example',
        slug: 'example',
        summary: 'An example project.',
        category: String(category._id),
        cover: { media: String(media._id) },
        services: [String(draftService._id)],
      },
    });
    expect(
      await content.publish('project', doc._id, actor, { revision: 1 }).catch((e) => e),
    ).toMatchObject({ code: 'CONSENT_REQUIRED' });
    await mongoose
      .model('Project')
      .updateOne({ _id: doc._id }, { $set: { 'permission.confirmed': true } });
    const unpublishedRef = await content
      .publish('project', doc._id, actor, { revision: 1 })
      .catch((e) => e);
    expect(unpublishedRef).toMatchObject({ status: 409, code: 'REFERENCE_NOT_PUBLISHED' });
    await content.publish('service', draftService._id, actor, { revision: 1 });
    await expect(
      content.publish('project', doc._id, actor, { revision: 1 }),
    ).resolves.toMatchObject({ status: 'published' });
  });

  it('enforces page template rules at publish time', async () => {
    const page = await content.create('page', actor, {
      template: 'contact',
      draft: {
        title: 'Contact',
        slug: 'get-in-touch',
        sections: [
          {
            key: 'faq',
            type: 'faq',
            data: { heading: 'FAQ', items: [{ question: 'Q?', answer: 'A.' }] },
          },
        ],
      },
    });
    const error = await content.publish('page', page._id, actor, { revision: 1 }).catch((e) => e);
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    expect(error.details[0].message).toMatch(/exactly one "contactForm"/);
  });
});

describe('top-level URL namespace (D-038)', () => {
  it('shares slugs between services and custom pages and blocks reserved words', async () => {
    await content.create('service', actor, { draft: completeService({ slug: 'cms-development' }) });
    const clash = await content
      .create('page', actor, {
        template: 'custom',
        draft: { title: 'Clash', slug: 'cms-development' },
      })
      .catch((e) => e);
    expect(clash).toMatchObject({ status: 409, code: 'SLUG_TAKEN' });
    const reserved = await content
      .create('service', actor, { draft: completeService({ slug: 'admin' }) })
      .catch((e) => e);
    expect(reserved).toMatchObject({ status: 409, code: 'SLUG_TAKEN' });
  });

  it('creates a 301 from the old address when a published slug changes', async () => {
    const live = await publishedService('mobile-app-development');
    const edited = await content.saveDraft('service', live._id, actor, {
      revision: live.revision,
      draft: { ...live.draft, slug: 'mobile-apps' },
    });
    const moved = await content.publish('service', live._id, actor, { revision: edited.revision });
    expect(moved.slug).toBe('mobile-apps');
    expect(await Redirect.findOne({ fromPath: '/mobile-app-development' })).toMatchObject({
      toPath: '/mobile-apps',
      statusCode: 301,
      source: 'slug-change',
    });
  });

  it('locks the address of system pages', async () => {
    const contact = await Page.create({
      slug: 'contact',
      template: 'contact',
      system: true,
      draft: { title: 'Contact' },
    });
    const error = await content
      .saveDraft('page', contact._id, actor, {
        revision: 1,
        draft: { title: 'Contact', slug: 'reach-us' },
      })
      .catch((e) => e);
    expect(error).toMatchObject({ status: 409, code: 'INVALID_STATE' });
  });
});

describe('public routes expose published content only', () => {
  it('lists only published services, in the published order, without internal fields', async () => {
    const a = await publishedService('digital-marketing');
    const b = await publishedService('internet-of-things');
    await content.create('service', actor, {
      draft: completeService({ slug: 'web-development', title: 'Draft only' }),
    });
    const archived = await publishedService('cms-development');
    await content.unpublish('service', archived._id, actor, { revision: archived.revision });
    await content.saveDraft('service', a._id, actor, {
      revision: a.revision,
      draft: { ...a.draft, title: 'UNPUBLISHED EDIT' },
    });
    await Ordering.create({
      key: 'services',
      status: 'published',
      draft: { ids: [] },
      published: { ids: [String(b._id), String(a._id)] },
    });

    const res = await request(buildApp()).get('/api/v1/public/services');
    expect(res.status).toBe(200);
    expect(res.body.data.map((s) => s.slug)).toEqual(['internet-of-things', 'digital-marketing']);
    expect(res.body.data[1]).toEqual({
      slug: 'digital-marketing',
      path: '/digital-marketing',
      title: 'digital-marketing',
      navLabel: null,
      summary: 'Connected devices and data.',
      icon: null,
      featured: false,
    });
    expect(JSON.stringify(res.body)).not.toMatch(
      /UNPUBLISHED EDIT|Draft only|draft|revision|placeholders|status/,
    );
  });

  it('serves the published version of a service and 404s drafts and archived items', async () => {
    const live = await publishedService('internet-of-things');
    await content.saveDraft('service', live._id, actor, {
      revision: live.revision,
      draft: { ...live.draft, summary: 'Secret draft' },
    });
    await content.create('service', actor, { draft: completeService({ slug: 'web-development' }) });
    const app = buildApp();

    const ok = await request(app).get('/api/v1/public/services/internet-of-things');
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({
      slug: 'internet-of-things',
      path: '/internet-of-things',
      summary: 'Connected devices and data.',
    });
    expect(JSON.stringify(ok.body)).not.toContain('Secret draft');

    const draft = await request(app).get('/api/v1/public/services/web-development');
    expect(draft.status).toBe(404);
    const malformed = await request(app).get('/api/v1/public/services/Not_A_Slug');
    expect(malformed.status).toBe(422);
  });
});

describe('audit dependency', () => {
  it('refuses to publish when the audit entry cannot be written (D-045)', async () => {
    const { content: failing } = createServices({
      config: testConfig(),
      logger: pino({ level: 'silent' }),
      overrides: {
        audit: {
          begin: async () => {
            throw new Error('audit store down');
          },
        },
      },
    });
    const doc = await failing.create('service', actor, { draft: completeService() });
    const error = await failing.publish('service', doc._id, actor, { revision: 1 }).catch((e) => e);
    expect(error).toMatchObject({ status: 503, code: 'SERVICE_UNAVAILABLE' });
    expect((await Service.findById(doc._id)).status).toBe('draft');
  });
});
