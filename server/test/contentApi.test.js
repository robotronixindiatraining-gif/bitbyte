import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuditLog,
  Ordering,
  Page,
  Redirect,
  Revision,
  Service,
  Taxonomy,
} from '../src/models/index.js';
import { HEADERS, RELAXED_LIMITS, createAdmin, signIn, stepUp } from './support/auth.js';
import { completeService, createCategory, createMedia, fakeStorage } from './support/fixtures.js';
import { useTestDatabase } from './support/db.js';
import { buildApp } from './helpers.js';

useTestDatabase();

const API = '/api/v1/admin';
let app;
let owner;
let agent;

beforeEach(async () => {
  app = buildApp({ overrides: { limits: RELAXED_LIMITS, mediaStorage: fakeStorage() } });
  owner = await createAdmin({ email: 'owner@example.com', name: 'Owner' });
  agent = await signIn(app, owner);
});

const post = (path, body = {}) => agent.post(`${API}${path}`).set(HEADERS).send(body);
const put = (path, body = {}) => agent.put(`${API}${path}`).set(HEADERS).send(body);
const get = (path) => agent.get(`${API}${path}`);

async function createService(draft = completeService()) {
  const res = await post('/services', { draft });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data;
}
async function publish(resource, item, extra = {}) {
  return post(`/${resource}/${item.id}/publish`, { revision: item.revision, ...extra });
}

describe('publishable collections over HTTP', () => {
  it('creates, saves drafts with optimistic concurrency, publishes and lists', async () => {
    const created = await createService();
    expect(created).toMatchObject({
      status: 'draft',
      revision: 1,
      published: null,
      references: [],
    });

    const saved = await put(`/services/${created.id}/draft`, {
      revision: 1,
      draft: { ...created.draft, summary: 'Updated summary.' },
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.revision).toBe(2);

    const stale = await put(`/services/${created.id}/draft`, {
      revision: 1,
      draft: { ...created.draft, summary: 'Lost update?' },
    });
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({
      code: 'EDIT_CONFLICT',
      details: { currentRevision: 2 },
    });
    expect((await Service.findById(created.id)).draft.summary).toBe('Updated summary.');

    const live = await publish('services', saved.body.data, { note: 'First release' });
    expect(live.status).toBe(200);
    expect(live.body.data).toMatchObject({ status: 'published', hasUnpublishedChanges: false });

    const list = await get('/services?status=published&q=internet&page=1&limit=10&sort=title');
    expect(list.status).toBe(200);
    expect(list.body.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(list.body.data[0]).toMatchObject({
      id: created.id,
      status: 'published',
      placeholders: 0,
    });

    const revisions = await get(`/services/${created.id}/revisions`);
    expect(revisions.body.data).toEqual([
      expect.objectContaining({ revision: 2, note: 'First release' }),
    ]);
  });

  it('rejects unknown fields, server-owned fields and malformed ids', async () => {
    expect(
      (await post('/services', { draft: completeService(), status: 'published' })).status,
    ).toBe(422);
    expect((await post('/services', { draft: { ...completeService(), revision: 9 } })).status).toBe(
      422,
    );
    expect((await get('/services/not-an-id')).status).toBe(422);
    expect((await get('/services?status=live')).status).toBe(422);
    expect((await get('/services/64b7f0c2a1b2c3d4e5f60718')).status).toBe(404);
  });

  it('sanitises rich text on save and refuses unsafe links and unknown section types', async () => {
    const created = await createService(
      completeService({
        intro:
          '<p onclick="x()">Hi<script>alert(1)</script><a href="javascript:alert(1)">x</a></p>',
      }),
    );
    expect(created.draft.intro).toBe('<p>Hi<a>x</a></p>');

    const page = await post('/pages', { draft: { title: 'Landing', slug: 'landing' } });
    expect(page.status).toBe(201);
    const unsafe = await put(`/pages/${page.body.data.id}/draft`, {
      revision: 1,
      draft: {
        title: 'Landing',
        slug: 'landing',
        sections: [
          {
            key: 'cta',
            type: 'ctaBanner',
            data: {
              heading: 'Go',
              primaryCta: { label: 'Go', kind: 'external', href: 'javascript:alert(1)' },
            },
          },
        ],
      },
    });
    expect(unsafe.status).toBe(422);
    expect(unsafe.body.error.details.map((d) => d.path)).toContain(
      'draft.sections.0.data.primaryCta.href',
    );

    const unknownType = await put(`/pages/${page.body.data.id}/draft`, {
      revision: 1,
      draft: {
        title: 'Landing',
        slug: 'landing',
        sections: [{ key: 'x', type: 'carousel', data: {} }],
      },
    });
    expect(unknownType.status).toBe(422);
  });

  it('blocks publishing with placeholders, missing references, consent or template rules', async () => {
    const withToken = await createService(completeService({ summary: '[CONFIRM SUMMARY]' }));
    const blocked = await publish('services', withToken);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('PLACEHOLDERS_PRESENT');

    const draftService = await createService(
      completeService({ slug: 'web-development', title: 'Web' }),
    );
    const page = (await post('/pages', { draft: { title: 'Landing', slug: 'landing' } })).body.data;
    const saved = await put(`/pages/${page.id}/draft`, {
      revision: 1,
      draft: {
        title: 'Landing',
        slug: 'landing',
        sections: [
          {
            key: 'grid',
            type: 'serviceGrid',
            data: {
              heading: 'Services',
              source: 'manual',
              services: [draftService.id],
              layout: 'list',
            },
          },
        ],
      },
    });
    const refBlocked = await publish('pages', saved.body.data);
    expect(refBlocked.status).toBe(409);
    expect(refBlocked.body.error.code).toBe('REFERENCE_NOT_PUBLISHED');
    expect(JSON.stringify(refBlocked.body)).not.toContain('Web');

    const testimonial = (
      await post('/testimonials', {
        draft: { quote: 'They delivered on time.', authorName: 'A. Client' },
      })
    ).body.data;
    const noConsent = await publish('testimonials', testimonial);
    expect(noConsent.body.error.code).toBe('CONSENT_REQUIRED');
    const consent = await put(`/testimonials/${testimonial.id}/consent`, {
      confirmed: true,
      method: 'email',
    });
    expect(consent.body.data.consent).toMatchObject({ confirmed: true, method: 'email' });
    expect((await publish('testimonials', consent.body.data)).status).toBe(200);
    expect(
      await AuditLog.exists({ action: 'content.consent', entityId: testimonial.id }),
    ).toBeTruthy();

    const contact = await Page.create({
      slug: 'contact',
      template: 'contact',
      system: true,
      draft: { title: 'Contact' },
    });
    const templateBlocked = await post(`/pages/${contact._id}/publish`, { revision: 1 });
    expect(templateBlocked.status).toBe(422);
    expect(templateBlocked.body.error.details[0].message).toMatch(/contactForm/);
  });

  it('shares one top-level slug namespace between services and pages and reserves system paths', async () => {
    await createService();
    const clash = await post('/pages', {
      draft: { title: 'IoT page', slug: 'internet-of-things' },
    });
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe('SLUG_TAKEN');
    const reserved = await post('/services', { draft: completeService({ slug: 'admin' }) });
    expect(reserved.status).toBe(409);
    const home = await post('/pages', { draft: { title: 'Home 2', slug: 'home' } });
    expect(home.status).toBe(409);
  });

  it('keeps old URLs working after a slug change and avoids redirect chains', async () => {
    const created = await createService(completeService({ slug: 'iot' }));
    let doc = (await publish('services', created)).body.data;
    doc = (
      await put(`/services/${doc.id}/draft`, {
        revision: doc.revision,
        draft: { ...doc.draft, slug: 'iot-2' },
      })
    ).body.data;
    doc = (await publish('services', doc)).body.data;
    doc = (
      await put(`/services/${doc.id}/draft`, {
        revision: doc.revision,
        draft: { ...doc.draft, slug: 'iot-3' },
      })
    ).body.data;
    doc = (await publish('services', doc)).body.data;
    const redirects = await Redirect.find({}).sort({ fromPath: 1 }).lean();
    expect(redirects.map((r) => [r.fromPath, r.toPath])).toEqual([
      ['/iot', '/iot-3'],
      ['/iot-2', '/iot-3'],
    ]);
    // Moving back to an old address removes the automatic redirect at that address.
    doc = (
      await put(`/services/${doc.id}/draft`, {
        revision: doc.revision,
        draft: { ...doc.draft, slug: 'iot' },
      })
    ).body.data;
    expect((await publish('services', doc)).status).toBe(200);
    const after = await Redirect.find({}).sort({ fromPath: 1 }).lean();
    expect(after.map((r) => [r.fromPath, r.toPath])).toEqual([
      ['/iot-2', '/iot'],
      ['/iot-3', '/iot'],
    ]);
  });

  it('unpublishes, discards drafts, restores revisions and deletes safely', async () => {
    let doc = (await publish('services', await createService())).body.data;
    doc = (
      await put(`/services/${doc.id}/draft`, {
        revision: doc.revision,
        draft: { ...doc.draft, summary: 'v2' },
      })
    ).body.data;
    doc = (await publish('services', doc)).body.data;

    const restored = await post(`/services/${doc.id}/revisions/1/restore`, {
      revision: doc.revision,
    });
    expect(restored.status).toBe(200);
    expect(restored.body.data).toMatchObject({
      hasUnpublishedChanges: true,
      published: { summary: 'v2' },
    });
    expect(restored.body.data.draft.summary).toBe('Connected devices and data.');

    const discarded = await post(`/services/${doc.id}/discard-draft`, {
      revision: restored.body.data.revision,
    });
    expect(discarded.body.data.draft.summary).toBe('v2');

    const deletePublished = await agent.delete(`${API}/services/${doc.id}`).set(HEADERS);
    expect(deletePublished.status).toBe(409);
    expect(deletePublished.body.error.code).toBe('INVALID_STATE');

    const page = (await post('/pages', { draft: { title: 'Landing', slug: 'landing' } })).body.data;
    await put(`/pages/${page.id}/draft`, {
      revision: 1,
      draft: {
        title: 'Landing',
        slug: 'landing',
        sections: [
          {
            key: 'g',
            type: 'serviceGrid',
            data: { heading: 'S', source: 'manual', services: [doc.id], layout: 'list' },
          },
        ],
      },
    });
    const unpublished = await post(`/services/${doc.id}/unpublish`, {
      revision: discarded.body.data.revision,
    });
    expect(unpublished.body.data.status).toBe('archived');
    const inUse = await agent.delete(`${API}/services/${doc.id}`).set(HEADERS);
    expect(inUse.status).toBe(409);
    expect(inUse.body.error).toMatchObject({
      code: 'IN_USE',
      details: [expect.objectContaining({ kind: 'page', id: page.id })],
    });

    await agent.delete(`${API}/pages/${page.id}`).set(HEADERS).expect(204);
    await agent.delete(`${API}/services/${doc.id}`).set(HEADERS).expect(204);
    expect(await Revision.countDocuments({ entityId: doc.id })).toBe(0);
    expect((await Ordering.findOne({ key: 'services' })).draft.ids).not.toContain(doc.id);
    expect(
      await AuditLog.exists({ action: 'content.delete', entityId: doc.id, outcome: 'succeeded' }),
    ).toBeTruthy();
  });
});

describe('settings', () => {
  it('drafts and publishes settings; privacy publication requires step-up', async () => {
    const { Setting } = await import('../src/models/index.js');
    await Setting.create({
      key: 'privacy',
      draft: { leadRetentionDays: 365, spamRetentionDays: 30 },
    });
    await Setting.create({ key: 'general', draft: { companyName: 'BitByte' } });

    const all = await get('/settings');
    expect(all.body.data.map((s) => s.key).sort()).toEqual(['general', 'privacy']);

    const general = (await get('/settings/general')).body.data;
    expect(
      (
        await publish('settings/general'.replace('settings/general', 'settings'), {
          id: 'general',
          revision: general.revision,
        })
      ).status,
    ).toBe(200);

    const privacy = (await get('/settings/privacy')).body.data;
    const saved = await put('/settings/privacy/draft', {
      revision: privacy.revision,
      draft: { leadRetentionDays: 10, spamRetentionDays: 30 },
    });
    expect(saved.status).toBe(422);
    const valid = await put('/settings/privacy/draft', {
      revision: privacy.revision,
      draft: { leadRetentionDays: 180, spamRetentionDays: 14 },
    });
    expect(valid.status).toBe(200);
    const withoutStepUp = await post('/settings/privacy/publish', {
      revision: valid.body.data.revision,
    });
    expect(withoutStepUp.status).toBe(403);
    expect(withoutStepUp.body.error.code).toBe('STEP_UP_REQUIRED');
    await stepUp(agent, owner);
    const published = await post('/settings/privacy/publish', {
      revision: valid.body.data.revision,
    });
    expect(published.status).toBe(200);
    expect(published.body.data.published).toEqual({
      leadRetentionDays: 180,
      spamRetentionDays: 14,
    });
    expect((await get('/settings/unknown')).status).toBe(422);
  });
});

describe('orderings (D-037)', () => {
  it('saves a draft order that goes live only on publish', async () => {
    const a = (
      await publish('services', await createService(completeService({ slug: 'a-svc', title: 'A' })))
    ).body.data;
    const b = (
      await publish('services', await createService(completeService({ slug: 'b-svc', title: 'B' })))
    ).body.data;
    const ordering = (await get('/orderings/services')).body.data;
    expect(ordering.items.map((i) => i.id)).toEqual([a.id, b.id]);
    expect(ordering.draft.ids).toEqual([a.id, b.id]);

    const first = await post('/orderings/services/publish', { revision: ordering.revision });
    expect(first.status).toBe(200);
    const live = async () =>
      (await agent.get('/api/v1/public/services')).body.data.map((s) => s.slug);
    expect(await live()).toEqual(['a-svc', 'b-svc']);

    const saved = await put('/orderings/services/draft', {
      revision: first.body.data.revision,
      ids: [b.id, a.id],
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.hasUnpublishedChanges).toBe(true);
    expect(await live()).toEqual(['a-svc', 'b-svc']);

    expect(
      (await post('/orderings/services/publish', { revision: saved.body.data.revision })).status,
    ).toBe(200);
    expect(await live()).toEqual(['b-svc', 'a-svc']);

    const foreign = await put('/orderings/services/draft', {
      revision: 99,
      ids: [String(owner.admin._id)],
    });
    expect(foreign.status).toBe(422);
    const duplicate = await put('/orderings/services/draft', { revision: 99, ids: [a.id, a.id] });
    expect(duplicate.status).toBe(422);
  });
});

describe('taxonomies and redirects', () => {
  it('manages taxonomies and refuses to delete one in use', async () => {
    const created = await post('/taxonomies', {
      type: 'projectCategory',
      name: 'Smart Home & Energy',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('smart-home-and-energy');
    expect((await Ordering.findOne({ key: 'projectCategories' })).draft.ids).toContain(
      created.body.data.id,
    );
    const dup = await post('/taxonomies', {
      type: 'projectCategory',
      name: 'Other',
      slug: 'smart-home-and-energy',
    });
    expect(dup.status).toBe(409);

    const cover = await createMedia();
    await post('/projects', {
      draft: {
        title: 'P',
        slug: 'p',
        summary: 'S',
        category: created.body.data.id,
        cover: { media: String(cover._id) },
      },
    });
    const inUse = await agent.delete(`${API}/taxonomies/${created.body.data.id}`).set(HEADERS);
    expect(inUse.status).toBe(409);
    expect(inUse.body.error.code).toBe('IN_USE');

    const renamed = await agent
      .patch(`${API}/taxonomies/${created.body.data.id}`)
      .set(HEADERS)
      .send({ name: 'Energy' });
    expect(renamed.body.data.name).toBe('Energy');
    const unused = await createCategory('Unused', 'unused');
    await agent.delete(`${API}/taxonomies/${unused._id}`).set(HEADERS).expect(204);
    expect(await Taxonomy.exists({ _id: unused._id })).toBeNull();
  });

  it('validates redirects: reserved paths, loops, chains, duplicates and content paths', async () => {
    const ok = await post('/redirects', { fromPath: '/Old-Page/', toPath: '/contact' });
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({
      fromPath: '/old-page',
      toPath: '/contact',
      statusCode: 301,
      source: 'manual',
    });

    const cases = [
      [{ fromPath: '/api/v1/x', toPath: '/' }, 422],
      [{ fromPath: '/admin', toPath: '/' }, 422],
      [{ fromPath: '/loop', toPath: '/loop' }, 422],
      [{ fromPath: '/chain', toPath: '/old-page' }, 422],
      [{ fromPath: '/contact', toPath: '/other' }, 422],
      [{ fromPath: '/old-page', toPath: '/x' }, 409],
      [{ fromPath: '/x', toPath: '//evil.example' }, 422],
      [{ fromPath: '/x', toPath: 'http://insecure.example' }, 422],
      [{ fromPath: '/x', toPath: 'javascript:alert(1)' }, 422],
    ];
    for (const [body, status] of cases) {
      const res = await post('/redirects', body);
      expect(res.status, JSON.stringify(body)).toBe(status);
    }
    await createService();
    const contentPath = await post('/redirects', { fromPath: '/internet-of-things', toPath: '/x' });
    expect(contentPath.status).toBe(409);

    const external = await post('/redirects', {
      fromPath: '/partner',
      toPath: 'https://partner.example/page',
    });
    expect(external.status).toBe(201);
    const updated = await agent
      .patch(`${API}/redirects/${external.body.data.id}`)
      .set(HEADERS)
      .send({ statusCode: 302, enabled: false });
    expect(updated.body.data).toMatchObject({ statusCode: 302, enabled: false });
    const list = await get('/redirects?q=partner');
    expect(list.body.data).toHaveLength(1);
    await agent.delete(`${API}/redirects/${external.body.data.id}`).set(HEADERS).expect(204);
    expect(await AuditLog.countDocuments({ entityType: 'redirect' })).toBe(4);
  });
});

describe('preview and dashboard', () => {
  it('previews drafts (noindex, no-store) without publishing them', async () => {
    const draft = await createService(completeService({ summary: 'Preview me' }));
    const res = await get(`/preview/services/${draft.id}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.data).toMatchObject({ slug: 'internet-of-things', summary: 'Preview me' });
    expect((await agent.get('/api/v1/public/services/internet-of-things')).status).toBe(404);

    const site = await get('/preview/site');
    expect(site.status).toBe(200);
  });

  it('summarises content and leads without personal data', async () => {
    const { Lead } = await import('../src/models/index.js');
    await createService(completeService({ summary: '[CONFIRM SUMMARY]' }));
    await Lead.create({
      type: 'project_enquiry',
      fullName: 'Private Person',
      email: 'private@example.com',
      phone: '+91 99999 99999',
      message: 'A confidential message.',
      consent: { given: true, text: 'ok', at: new Date() },
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const res = await get('/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.counts.service).toEqual({ published: 0, total: 1 });
    expect(res.body.data.leads).toMatchObject({ new: 1, last30Days: 1 });
    expect(res.body.data.placeholders).toEqual([
      expect.objectContaining({ kind: 'service', count: 1 }),
    ]);
    expect(res.body.data.unpublishedChanges.length).toBeGreaterThan(0);
    expect(res.body.data.recentContentChanges[0]).toMatchObject({
      action: 'content.create',
      actorName: 'Owner',
    });
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(
      /Private Person|private@example.com|99999|confidential|owner@example.com/,
    );
  });
});
