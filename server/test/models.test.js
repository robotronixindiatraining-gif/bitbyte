import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import {
  ALL_MODELS,
  Admin,
  AuditLog,
  Lead,
  Media,
  Page,
  Redirect,
  Service,
  Session,
  Setting,
  Taxonomy,
} from '../src/models/index.js';
import { useTestDatabase } from './support/db.js';

useTestDatabase();

const id = () => new mongoose.Types.ObjectId().toString();

async function indexSummary(model) {
  const indexes = await model.collection.indexes();
  return indexes.map((index) => ({
    key: Object.keys(index.key).join('+'),
    unique: Boolean(index.unique),
    ttl: index.expireAfterSeconds,
  }));
}

describe('collections and indexes', () => {
  it('creates exactly the 15 documented collections', async () => {
    const names = (await mongoose.connection.db.listCollections().toArray())
      .map((c) => c.name)
      .sort();
    expect(names).toEqual(
      [
        'admins',
        'auditLogs',
        'jobOpenings',
        'leads',
        'media',
        'orderings',
        'pages',
        'projects',
        'redirects',
        'revisions',
        'services',
        'sessions',
        'settings',
        'taxonomies',
        'testimonials',
      ].sort(),
    );
    expect(ALL_MODELS).toHaveLength(15);
  });

  it.each([
    [Admin, 'email', { unique: true }],
    [Session, 'tokenHash', { unique: true }],
    [Session, 'expiresAt', { ttl: 0 }],
    [Setting, 'key', { unique: true }],
    [Page, 'slug', { unique: true }],
    [Service, 'slug', { unique: true }],
    [Service, 'mediaRefs', {}],
    [Service, 'entityRefs.id', {}],
    [Taxonomy, 'type+slug', { unique: true }],
    [Media, 'storageKey', { unique: true }],
    [Lead, 'expiresAt', {}],
    [Lead, 'status+createdAt', {}],
    [Redirect, 'fromPath', { unique: true }],
    [AuditLog, 'at', { ttl: 730 * 24 * 60 * 60 }],
  ])('%s has an index on %s', async (model, key, expected) => {
    const indexes = await indexSummary(model);
    const match = indexes.find(
      (index) => index.key === key && (expected.ttl === undefined || index.ttl === expected.ttl),
    );
    expect(match, `${model.modelName}.${key}`).toBeDefined();
    if (expected.unique) expect(match.unique).toBe(true);
  });

  it('enforces unique e-mails and slugs at the database level', async () => {
    await Admin.create({ name: 'A', email: 'a@example.com', passwordHash: 'x' });
    await expect(
      Admin.create({ name: 'B', email: 'A@Example.com', passwordHash: 'y' }),
    ).rejects.toMatchObject({ code: 11000 });
    await Service.create({ slug: 'cms-development', draft: { title: 'CMS' } });
    await expect(
      Service.create({ slug: 'cms-development', draft: { title: 'Other' } }),
    ).rejects.toMatchObject({ code: 11000 });
  });
});

describe('admin validation', () => {
  it('only allows the super_admin role', async () => {
    const admin = new Admin({
      name: 'X',
      email: 'x@example.com',
      passwordHash: 'h',
      role: 'editor',
    });
    await expect(admin.validate()).rejects.toThrow(/role/);
    const ok = new Admin({ name: 'X', email: 'x@example.com', passwordHash: 'h' });
    expect(ok.role).toBe('super_admin');
    expect(ok.mustChangePassword).toBe(true);
  });

  it('rejects malformed e-mails and hides credentials from JSON', async () => {
    await expect(
      new Admin({ name: 'X', email: 'not-an-email', passwordHash: 'h' }).validate(),
    ).rejects.toThrow(/e-mail/);
    const json = new Admin({
      name: 'X',
      email: 'x@example.com',
      passwordHash: 'secret-hash',
    }).toJSON();
    expect(json.passwordHash).toBeUndefined();
    expect(json.twoFactor).toBeUndefined();
  });

  it('never selects the password hash or 2FA secrets by default', async () => {
    await Admin.create({ name: 'X', email: 'x@example.com', passwordHash: 'h' });
    const loaded = await Admin.findOne({ email: 'x@example.com' }).lean();
    expect(loaded.passwordHash).toBeUndefined();
    expect(loaded.twoFactor).toBeUndefined();
  });
});

describe('publishable documents', () => {
  it('stores lenient drafts and derives placeholders and references', async () => {
    const mediaId = id();
    const projectId = id();
    const service = await Service.create({
      slug: 'internet-of-things',
      draft: {
        title: 'Internet of Things',
        summary: '[CONFIRM VERIFIED COPY]',
        heroImage: { media: mediaId },
        relatedProjects: [projectId],
      },
    });
    expect(service.status).toBe('draft');
    expect(service.revision).toBe(1);
    expect(service.placeholders).toEqual(['[CONFIRM VERIFIED COPY]']);
    expect(service.mediaRefs.map(String)).toEqual([mediaId]);
    expect(service.entityRefs.map((r) => [r.kind, String(r.id)])).toEqual([['project', projectId]]);
  });

  it('rejects unknown keys and unsafe links even in drafts', async () => {
    await expect(
      Service.create({ slug: 'web-development', draft: { title: 'Web', role: 'admin' } }),
    ).rejects.toThrow(/draft/);
    const page = new Page({
      slug: 'landing',
      template: 'custom',
      draft: {
        title: 'Landing',
        sections: [
          {
            key: 'cta',
            type: 'ctaBanner',
            data: {
              heading: 'Go',
              primaryCta: { label: 'Click', kind: 'external', href: 'javascript:alert(1)' },
            },
          },
        ],
      },
    });
    await expect(page.validate()).rejects.toThrow(/Unsafe URL/);
  });

  it('validates the published snapshot strictly and keeps status consistent', async () => {
    const invalidPublished = new Service({
      slug: 'x-service',
      status: 'published',
      draft: {},
      published: { title: 'Only a title' },
    });
    await expect(invalidPublished.validate()).rejects.toThrow(/published/);
    const noSnapshot = new Service({ slug: 'y-service', status: 'published', draft: {} });
    await expect(noSnapshot.validate()).rejects.toThrow(/Nothing has been published/);
  });

  it('keeps lead retention mandatory in settings drafts (D-032)', async () => {
    await expect(Setting.create({ key: 'privacy', draft: {} })).rejects.toThrow(
      /leadRetentionDays/,
    );
    await expect(
      Setting.create({ key: 'privacy', draft: { leadRetentionDays: 10, spamRetentionDays: 30 } }),
    ).rejects.toThrow();
    await expect(
      Setting.create({ key: 'careers', draft: { applicationMethod: 'form' } }),
    ).rejects.toThrow(/not enabled/);
  });
});

describe('other collections', () => {
  it('requires alt text unless an image is decorative', async () => {
    const base = {
      driver: 'cloudinary',
      storageKey: 'bitbyte/test/one',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/one.jpg',
      mimeType: 'image/jpeg',
      bytes: 1000,
      width: 100,
      height: 100,
      checksum: 'a'.repeat(64),
    };
    await expect(new Media(base).validate()).rejects.toThrow(/Alt text/);
    await expect(new Media({ ...base, decorative: true }).validate()).resolves.toBeUndefined();
    await expect(
      new Media({ ...base, mimeType: 'image/svg+xml', alt: 'Logo' }).validate(),
    ).rejects.toThrow(/mimeType/);
  });

  it('requires consent and an expiry on leads', async () => {
    const lead = new Lead({
      type: 'project_enquiry',
      fullName: 'Asha',
      email: 'asha@example.com',
      phone: '+91 9876543210',
      message: 'We need a website.',
      consent: { given: false, text: 'I agree', at: new Date() },
    });
    const error = await lead.validate().catch((err) => err);
    expect(Object.keys(error.errors)).toEqual(
      expect.arrayContaining(['consent.given', 'expiresAt']),
    );
  });

  it('normalises redirects and blocks reserved paths and loops', async () => {
    const redirect = await Redirect.create({
      fromPath: '/Old-Page/',
      toPath: '/new-page',
      source: 'manual',
    });
    expect(redirect.fromPath).toBe('/old-page');
    await expect(
      Redirect.create({ fromPath: '/admin/login', toPath: '/x', source: 'manual' }),
    ).rejects.toThrow(/reserved/);
    await expect(
      Redirect.create({ fromPath: '/same', toPath: '/same/', source: 'manual' }),
    ).rejects.toThrow(/itself/);
    await expect(
      Redirect.create({ fromPath: '/x', toPath: 'javascript:alert(1)', source: 'manual' }),
    ).rejects.toThrow();
  });

  it('rejects unknown page templates and invalid audit actions', async () => {
    await expect(
      new Page({ slug: 'p', template: 'freeform', draft: { title: 'P' } }).validate(),
    ).rejects.toThrow(/template/);
    await expect(
      new AuditLog({ action: 'DROP TABLE', outcome: 'succeeded' }).validate(),
    ).rejects.toThrow(/action/);
  });
});
