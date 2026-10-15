import { describe, expect, it } from 'vitest';
import {
  Admin,
  JobOpening,
  Ordering,
  Page,
  Project,
  Redirect,
  Service,
  Setting,
  Taxonomy,
  Testimonial,
} from '../src/models/index.js';
import { runSeed } from '../src/seed/seedService.js';
import { createAdmin } from './support/auth.js';
import { useTestDatabase } from './support/db.js';

useTestDatabase();

describe('idempotent placeholder seed', () => {
  it('creates drafts with [CONFIRM …] placeholders and publishes nothing', async () => {
    const report = await runSeed();
    expect(report.created).toHaveLength(31);
    expect(await Setting.countDocuments()).toBe(10);
    expect(await Page.countDocuments({ system: true })).toBe(8);
    expect(await Service.countDocuments()).toBe(5);
    expect(await Taxonomy.countDocuments({ type: 'projectCategory' })).toBe(3);
    expect(await Ordering.countDocuments()).toBe(5);

    for (const Model of [Setting, Page, Service, Ordering]) {
      expect(await Model.countDocuments({ status: 'draft' })).toBe(await Model.countDocuments());
    }
    // No fabricated portfolio, testimonials, jobs or redirects.
    for (const Model of [Project, Testimonial, JobOpening, Redirect])
      expect(await Model.countDocuments()).toBe(0);

    const general = await Setting.findOne({ key: 'general' });
    expect(general.placeholders).toEqual(
      expect.arrayContaining(['[CONFIRM COMPANY NAME]', '[CONFIRM LEGAL ENTITY NAME]']),
    );
    const iot = await Service.findOne({ slug: 'internet-of-things' });
    expect(iot.placeholders).toEqual(['[CONFIRM VERIFIED COPY]']);
    const services = await Service.find({}, { slug: 1 });
    expect(services.map((s) => s.slug).sort()).toEqual([
      'cms-development',
      'digital-marketing',
      'internet-of-things',
      'mobile-app-development',
      'web-development',
    ]);
    const order = await Ordering.findOne({ key: 'services' });
    expect(order.draft.ids).toHaveLength(5);
    expect(order.published).toBeNull();
  });

  it('is safe to rerun and never overwrites administrator edits or accounts', async () => {
    const account = await createAdmin();
    const adminBefore = await Admin.findById(account.admin._id)
      .select('+passwordHash +twoFactor')
      .lean();
    await runSeed();

    await Setting.updateOne(
      { key: 'general' },
      { $set: { 'draft.companyName': 'Verified Name', revision: 7 } },
    );
    await Service.updateOne(
      { slug: 'cms-development' },
      { $set: { 'draft.summary': 'Edited by an admin' } },
    );
    await Page.deleteOne({ seedKey: 'page:terms' });

    const second = await runSeed();
    expect(second.created).toEqual(['page:terms']);
    expect(second.skipped).toHaveLength(30);

    const general = await Setting.findOne({ key: 'general' });
    expect(general.draft.companyName).toBe('Verified Name');
    expect(general.revision).toBe(7);
    expect((await Service.findOne({ slug: 'cms-development' })).draft.summary).toBe(
      'Edited by an admin',
    );

    const adminAfter = await Admin.findById(account.admin._id)
      .select('+passwordHash +twoFactor')
      .lean();
    expect(adminAfter).toEqual(adminBefore);
    expect(await Admin.countDocuments()).toBe(1);
  });

  it('leaves an admin-created document with a seeded slug untouched', async () => {
    await Service.create({ slug: 'digital-marketing', draft: { title: 'Admin version' } });
    const report = await runSeed();
    expect(report.skipped.some((s) => s.startsWith('service:digital-marketing'))).toBe(true);
    const services = await Service.find({ slug: 'digital-marketing' });
    expect(services).toHaveLength(1);
    expect(services[0].draft.title).toBe('Admin version');
  });
});
