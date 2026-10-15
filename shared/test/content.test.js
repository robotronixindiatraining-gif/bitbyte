import { describe, expect, it } from 'vitest';
import {
  PAGE_TEMPLATES,
  SECTION_TYPES,
  SETTINGS_KEYS,
  checkTemplateRules,
  contentSchema,
  passwordSchema,
  recoveryCodeSchema,
  sectionDataSchema,
  settingsSchema,
  totpCodeSchema,
} from '../src/index.js';

describe('draft vs publish schemas', () => {
  it('accepts partial drafts but requires complete content to publish', () => {
    const partial = { title: 'Internet of Things', summary: '[CONFIRM VERIFIED COPY]' };
    expect(contentSchema('service', 'draft').safeParse(partial).success).toBe(true);
    const strict = contentSchema('service', 'publish').safeParse(partial);
    expect(strict.success).toBe(false);
    expect(strict.error.issues.map((i) => i.path.join('.'))).toEqual(
      expect.arrayContaining(['slug', 'intro']),
    );
  });

  it('rejects unknown keys in both modes', () => {
    for (const mode of ['draft', 'publish']) {
      expect(
        contentSchema('testimonial', mode).safeParse({ quote: 'x', isAdmin: true }).success,
      ).toBe(false);
    }
  });

  it('enforces formats only when publishing', () => {
    const contact = {
      addressLines: ['[CONFIRM OFFICE ADDRESS]'],
      emails: [{ label: 'General', address: '[CONFIRM CONTACT EMAIL]' }],
    };
    expect(settingsSchema('contact', 'draft').safeParse(contact).success).toBe(true);
    expect(settingsSchema('contact', 'publish').safeParse(contact).success).toBe(false);
  });

  it('defines every documented settings key and keeps retention mandatory', () => {
    expect(SETTINGS_KEYS).toEqual([
      'general',
      'contact',
      'navigation',
      'footer',
      'social',
      'seo',
      'leadForm',
      'careers',
      'privacy',
      'integrations',
    ]);
    expect(settingsSchema('privacy', 'draft').safeParse({}).success).toBe(false);
    expect(
      settingsSchema('privacy', 'draft').safeParse({
        leadRetentionDays: 365,
        spamRetentionDays: 30,
      }).success,
    ).toBe(true);
    expect(
      settingsSchema('privacy', 'draft').safeParse({
        leadRetentionDays: 5000,
        spamRetentionDays: 30,
      }).success,
    ).toBe(false);
  });
});

describe('links', () => {
  const ctaBanner = (href, kind = 'internal') => ({
    heading: 'Talk to us',
    primaryCta: { label: 'Contact', kind, href },
  });

  it('rejects script URLs in drafts and malformed links when publishing', () => {
    expect(
      sectionDataSchema('ctaBanner', 'draft').safeParse(ctaBanner('javascript:alert(1)')).success,
    ).toBe(false);
    expect(
      sectionDataSchema('ctaBanner', 'draft').safeParse(
        ctaBanner(' JavaScript:alert(1)', 'external'),
      ).success,
    ).toBe(false);
    expect(
      sectionDataSchema('ctaBanner', 'publish').safeParse(ctaBanner('//evil.example')).success,
    ).toBe(false);
    expect(sectionDataSchema('ctaBanner', 'publish').safeParse(ctaBanner('/contact')).success).toBe(
      true,
    );
    expect(
      sectionDataSchema('ctaBanner', 'publish').safeParse(
        ctaBanner('https://example.com', 'external'),
      ).success,
    ).toBe(true);
  });
});

describe('section registry and page templates', () => {
  it('registers the 15 approved section types with draft and publish schemas', () => {
    expect(SECTION_TYPES).toHaveLength(15);
    for (const type of SECTION_TYPES) {
      expect(sectionDataSchema(type, 'draft')).toBeDefined();
      expect(sectionDataSchema(type, 'publish')).toBeDefined();
    }
  });

  it('validates section data through the page schema with full paths', () => {
    const publish = contentSchema('page', 'publish');
    const missing = publish.safeParse({
      title: 'Home',
      sections: [{ key: 'hero', type: 'hero', data: { visual: 'image' } }],
    });
    expect(missing.error.issues.map((i) => i.path.join('.'))).toEqual(
      expect.arrayContaining(['sections.0.data.heading', 'sections.0.data.primaryCta']),
    );
    // Cross-field rules run once the basic fields are valid (zod refinement order).
    const hero = {
      heading: 'Hello',
      visual: 'image',
      primaryCta: { label: 'Contact', kind: 'internal', href: '/contact' },
    };
    const noImage = publish.safeParse({
      title: 'Home',
      sections: [{ key: 'hero', type: 'hero', data: hero }],
    });
    expect(noImage.error.issues.map((i) => i.path.join('.'))).toEqual(['sections.0.data.image']);
  });

  it('checks required and allowed sections per template', () => {
    expect(Object.keys(PAGE_TEMPLATES)).toEqual([
      'home',
      'about',
      'services-index',
      'portfolio-index',
      'careers',
      'contact',
      'legal',
      'custom',
    ]);
    expect(checkTemplateRules('legal', [{ type: 'richText' }])).toEqual([]);
    expect(checkTemplateRules('legal', [{ type: 'richText' }, { type: 'hero' }])).toHaveLength(1);
    expect(checkTemplateRules('careers', [])[0].message).toMatch(/exactly one "jobList"/);
    expect(
      checkTemplateRules('custom', [{ type: 'contactForm' }, { type: 'contactForm' }]),
    ).toHaveLength(1);
  });
});

describe('auth input rules', () => {
  it('applies the password policy', () => {
    expect(passwordSchema.safeParse('correct horse battery').success).toBe(true);
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('Password1234').success).toBe(false);
    expect(passwordSchema.safeParse('x'.repeat(129)).success).toBe(false);
  });

  it('accepts only well-formed codes', () => {
    expect(totpCodeSchema.safeParse('123456').success).toBe(true);
    expect(totpCodeSchema.safeParse('12345a').success).toBe(false);
    expect(recoveryCodeSchema.safeParse('ABCDE-23456').success).toBe(true);
    expect(recoveryCodeSchema.safeParse('abcde23456').success).toBe(true);
    expect(recoveryCodeSchema.safeParse('ABCDE-1O0IL').success).toBe(false);
  });
});
