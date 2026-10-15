import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ERROR_CODES,
  ROLE_VALUES,
  emailSchema,
  findPlaceholders,
  formatZodIssues,
  hasPlaceholders,
  isReservedSlug,
  objectIdSchema,
  slugSchema,
} from '../src/index.js';

describe('roles', () => {
  it('defines exactly one administrative role', () => {
    expect(ROLE_VALUES).toEqual(['super_admin']);
  });
});

describe('error codes', () => {
  it('maps each code to itself', () => {
    for (const [key, value] of Object.entries(ERROR_CODES)) expect(value).toBe(key);
  });
});

describe('validation schemas', () => {
  it('accepts valid slugs and rejects malformed ones', () => {
    expect(slugSchema.safeParse('cms-development').success).toBe(true);
    for (const bad of ['', 'CMS', 'cms--development', '-cms', 'cms_dev', 'a/b']) {
      expect(slugSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('validates object ids', () => {
    expect(objectIdSchema.safeParse('64b7f0c2a1b2c3d4e5f60718').success).toBe(true);
    expect(objectIdSchema.safeParse('not-an-id').success).toBe(false);
  });

  it('normalises e-mail addresses', () => {
    expect(emailSchema.parse('  Info@Example.COM ')).toBe('info@example.com');
    expect(emailSchema.safeParse('nope').success).toBe(false);
  });

  it('formats issues with an optional prefix', () => {
    const schema = z.object({ title: z.string(), items: z.array(z.string()) }).strict();
    const result = schema.safeParse({ items: ['ok', 3], extra: true });
    expect(result.success).toBe(false);
    const details = formatZodIssues(result.error, 'body');
    const paths = details.map((d) => d.path);
    expect(paths).toContain('body.title');
    expect(paths).toContain('body.items.1');
    expect(details.every((d) => typeof d.message === 'string' && d.message.length > 0)).toBe(true);
  });
});

describe('placeholder guard', () => {
  it('finds placeholder tokens in nested content with their paths', () => {
    const draft = {
      title: 'Internet of Things',
      summary: '[CONFIRM VERIFIED COPY] IoT services',
      offerings: [{ items: ['ok', 'Founded [CONFIRM COMPANY FOUNDING YEAR]'] }],
    };
    expect(findPlaceholders(draft)).toEqual([
      { path: 'summary', token: '[CONFIRM VERIFIED COPY]' },
      { path: 'offerings.0.items.1', token: '[CONFIRM COMPANY FOUNDING YEAR]' },
    ]);
    expect(hasPlaceholders(draft)).toBe(true);
    expect(hasPlaceholders({ title: 'Verified' })).toBe(false);
  });

  it('ignores non-plain objects', () => {
    expect(findPlaceholders(new Date())).toEqual([]);
    expect(findPlaceholders(null)).toEqual([]);
  });
});

describe('reserved slugs', () => {
  it('blocks reserved top-level paths but allows legacy service paths', () => {
    expect(isReservedSlug('admin')).toBe(true);
    expect(isReservedSlug('API')).toBe(true);
    expect(isReservedSlug('cms-development')).toBe(false);
    expect(isReservedSlug('internet-of-things')).toBe(false);
  });
});
