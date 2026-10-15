import mongoose from 'mongoose';
import pino from 'pino';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createServices } from '../src/container.js';
import { JobOpening, Project, Testimonial } from '../src/models/index.js';
import {
  LEAD_FORM,
  completeJob,
  completeProject,
  completeService,
  createCategory,
  createMedia,
  fakeStorage,
  publishSettings,
} from './support/fixtures.js';
import { useTestDatabase } from './support/db.js';
import { buildApp, testConfig } from './helpers.js';

useTestDatabase();

const actor = { _id: new mongoose.Types.ObjectId(), email: 'editor@example.com' };
let services;
let content;
let app;

beforeEach(() => {
  const overrides = { mediaStorage: fakeStorage() };
  services = createServices({ config: testConfig(), logger: pino({ level: 'silent' }), overrides });
  ({ content } = services);
  app = buildApp({ overrides });
});

async function create(kind, draft) {
  return content.create(kind, actor, { draft });
}
async function publish(kind, doc) {
  return content.publish(kind, doc._id, actor, { revision: doc.revision });
}
async function published(kind, draft) {
  return publish(kind, await create(kind, draft));
}
const api = (path) => request(app).get(`/api/v1/public${path}`);

describe('public endpoints never expose unpublished content', () => {
  it('drops references to unpublished items from pages and never leaks their data', async () => {
    const live = await published(
      'service',
      completeService({ slug: 'live-svc', title: 'Live service' }),
    );
    const hidden = await create(
      'service',
      completeService({ slug: 'secret-svc', title: 'SECRET DRAFT SERVICE' }),
    );
    const page = await create('page', {
      title: 'Landing',
      slug: 'landing',
      sections: [
        {
          key: 'grid',
          type: 'serviceGrid',
          data: {
            heading: 'Services',
            source: 'manual',
            services: [String(live._id)],
            layout: 'list',
          },
        },
        {
          key: 'cta',
          type: 'ctaBanner',
          data: {
            heading: 'Talk to us',
            primaryCta: {
              label: 'Live link',
              kind: 'entity',
              entity: { kind: 'service', id: String(live._id) },
            },
          },
        },
        {
          key: 'hidden',
          type: 'richText',
          visible: false,
          data: { body: '<p>HIDDEN SECTION</p>' },
        },
      ],
    });
    const livePage = await publish('page', page);

    // Later the editor references the draft service in the DRAFT only, then the live service is archived.
    await content.saveDraft('page', livePage._id, actor, {
      revision: livePage.revision,
      draft: { ...livePage.draft, title: 'UNPUBLISHED TITLE', sections: [] },
    });
    const res1 = await api('/pages/landing');
    expect(res1.status).toBe(200);
    expect(res1.body.data.title).toBe('Landing');
    expect(res1.body.data.sections.map((s) => s.key)).toEqual(['grid', 'cta']);
    expect(res1.body.data.sections[0].data.items.map((i) => i.slug)).toEqual(['live-svc']);
    expect(res1.body.data.sections[1].data.primaryCta).toMatchObject({
      href: '/live-svc',
      external: false,
    });

    const fresh = await content.get('service', live._id);
    await content.unpublish('service', live._id, actor, { revision: fresh.doc.revision });
    app.locals.services.cache.clear();
    const res2 = await api('/pages/landing');
    expect(res2.body.data.sections[0].data.items).toEqual([]);
    expect(res2.body.data.sections[1].data.primaryCta).toBeNull();
    const text = JSON.stringify([res1.body, res2.body]);
    expect(text).not.toMatch(
      /SECRET DRAFT SERVICE|secret-svc|UNPUBLISHED TITLE|HIDDEN SECTION|draft|revision/,
    );
    expect(String(hidden._id)).not.toBe(String(live._id));
  });

  it('answers 404 identically for unknown, draft-only and archived items', async () => {
    await create('service', completeService({ slug: 'draft-svc' }));
    const archived = await published('service', completeService({ slug: 'old-svc' }));
    await content.unpublish('service', archived._id, actor, { revision: archived.revision });
    const bodies = [];
    for (const slug of ['nope', 'draft-svc', 'old-svc']) {
      const res = await api(`/services/${slug}`);
      expect(res.status).toBe(404);
      bodies.push(res.body.error.message);
    }
    expect(new Set(bodies).size).toBe(1);
    expect((await api('/pages/landing')).status).toBe(404);
    expect((await api('/resolve?path=/draft-svc')).body.data).toMatchObject({ kind: 'not_found' });
  });

  it('shows projects only with client permission and testimonials only with consent', async () => {
    const category = await createCategory();
    const cover = await createMedia({ alt: 'Meter photo' });
    const project = await published(
      'project',
      completeProject(
        { category: category._id, cover: cover._id },
        { client: { name: 'Acme', showName: false } },
      ),
    ).catch((e) => e);
    expect(project).toMatchObject({ code: 'CONSENT_REQUIRED' });

    const draft = await Project.findOne({ slug: 'smart-meter' });
    await content.setConfirmation('project', draft._id, actor, { confirmed: true });
    const live = await publish('project', await Project.findById(draft._id));
    const res = await api('/projects');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ total: 1 });
    expect(res.body.data[0]).toMatchObject({
      slug: 'smart-meter',
      path: '/portfolio/smart-meter',
      category: { name: 'IoT', slug: 'iot' },
      cover: { url: cover.url, alt: 'Meter photo', width: 1200, height: 800 },
    });
    const detail = await api('/projects/smart-meter');
    expect(detail.body.data.client).toBeNull();
    expect(JSON.stringify(detail.body)).not.toContain('Acme');
    expect((await api('/taxonomies?type=projectCategory')).body.data).toEqual([
      { name: 'IoT', slug: 'iot' },
    ]);
    expect((await api('/projects?category=iot')).body.data).toHaveLength(1);
    expect((await api('/projects?category=other')).body.data).toHaveLength(0);

    // Withdrawing permission takes the project off the site immediately.
    await content.setConfirmation('project', live._id, actor, { confirmed: false });
    app.locals.services.cache.clear(); // the admin routes do this on every write
    expect((await api('/projects/smart-meter')).status).toBe(404);

    const testimonial = await create('testimonial', {
      quote: 'Great partner to work with.',
      authorName: 'R. Client',
    });
    await content.setConfirmation('testimonial', testimonial._id, actor, {
      confirmed: true,
      method: 'document',
    });
    await publish('testimonial', await Testimonial.findById(testimonial._id));
    expect((await api('/testimonials')).body.data).toEqual([
      expect.objectContaining({ quote: 'Great partner to work with.', authorName: 'R. Client' }),
    ]);
    // Tampering with consent directly in the database still hides it.
    await Testimonial.updateOne({ _id: testimonial._id }, { $set: { 'consent.confirmed': false } });
    app.locals.services.cache.clear();
    expect((await api('/testimonials')).body.data).toEqual([]);
  });

  it('lists open jobs only and includes application settings', async () => {
    await publishSettings('careers', {
      applicationMethod: 'email',
      careersEmail: 'jobs@example.com',
    });
    await published('job', completeJob());
    const closed = await published('job', completeJob({ slug: 'closed-role', title: 'Closed' }));
    await JobOpening.updateOne(
      { _id: closed._id },
      { $set: { 'published.closesAt': '2020-01-01T00:00:00Z' } },
    );
    const list = await api('/jobs');
    expect(list.body.data.map((j) => j.slug)).toEqual(['nodejs-developer']);
    expect((await api('/jobs/closed-role')).status).toBe(404);
    const detail = await api('/jobs/nodejs-developer');
    expect(detail.body.data.application).toEqual({
      method: 'email',
      email: 'jobs@example.com',
      url: null,
    });
  });

  it('serves the site bundle from published settings without internal fields', async () => {
    await publishSettings('general', { companyName: 'BitByte Software Technology' });
    await publishSettings('leadForm', LEAD_FORM);
    await publishSettings('integrations', { turnstileSiteKey: '1x00000000000000000000AA' });
    const res = await api('/site');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('public');
    expect(res.headers['x-robots-tag']).toBe('noindex');
    expect(res.body.data.general.companyName).toBe('BitByte Software Technology');
    expect(res.body.data.leadForm).toEqual({
      budgetOptions: LEAD_FORM.budgetOptions,
      consentText: LEAD_FORM.consentText,
      successMessage: LEAD_FORM.successMessage,
    });
    expect(res.body.data.contact).toBeNull();
    expect(res.body.data.integrations).toEqual({ turnstileSiteKey: '1x00000000000000000000AA' });
    expect(JSON.stringify(res.body)).not.toContain('sales@example.com');
  });

  it('rejects unknown query parameters', async () => {
    expect((await api('/services?status=draft')).status).toBe(422);
    expect((await api('/projects?limit=1000')).status).toBe(422);
    expect((await api('/site?preview=1')).status).toBe(422);
  });
});
