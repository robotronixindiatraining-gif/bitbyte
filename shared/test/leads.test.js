import { describe, expect, it } from 'vitest';
import {
  createContentSchemas,
  isReservedSlug,
  leadSubmissionSchema,
  slugify,
} from '../src/index.js';

const base = {
  type: 'project_enquiry',
  fullName: '  Asha   Verma ',
  companyName: 'Example',
  companyLocation: 'Indore',
  email: ' Asha@Example.COM ',
  phone: '+91  98765 43210',
  budget: 'Small',
  message: 'Hello there\r\nWe need help.',
  consent: true,
  turnstileToken: 'token',
};

describe('lead submission schema (provisional fields)', () => {
  it('normalises whitespace, e-mail case and line endings', () => {
    const result = leadSubmissionSchema.parse(base);
    expect(result).toMatchObject({
      fullName: 'Asha Verma',
      email: 'asha@example.com',
      phone: '+91 98765 43210',
      message: 'Hello there\nWe need help.',
    });
  });

  it('rejects control characters, unknown keys, missing consent and missing bot token', () => {
    const bad = [
      { ...base, fullName: `A${String.fromCharCode(7)}B` },
      { ...base, message: `Hello${String.fromCharCode(0)} there friend` },
      { ...base, isAdmin: true },
      { ...base, consent: false },
      { ...base, turnstileToken: '' },
      { ...base, sourcePath: 'https://evil.example' },
      { ...base, utm: { source: 'x', extra: 'y' } },
    ];
    for (const value of bad) expect(leadSubmissionSchema.safeParse(value).success).toBe(false);
  });
});

describe('slugs', () => {
  it('suggests clean slugs and reserves the homepage name', () => {
    expect(slugify('  Smart Home & Energy!! ')).toBe('smart-home-and-energy');
    expect(slugify('Café Déjà-vu')).toBe('cafe-deja-vu');
    expect(isReservedSlug('home')).toBe(true);
    expect(isReservedSlug('internet-of-things')).toBe(false);
  });
});

describe('createContentSchemas', () => {
  it('applies the rich-text sanitiser to every rich-text field, including inside sections', () => {
    const schemas = createContentSchemas({
      sanitizeRichText: (html) => html.replace(/<script.*?<\/script>/g, ''),
    });
    const page = schemas.contentSchema('page', 'draft').parse({
      title: 'T',
      sections: [{ key: 'a', type: 'richText', data: { body: '<p>ok</p><script>x</script>' } }],
    });
    expect(page.sections[0].data.body).toBe('<p>ok</p>');
    const service = schemas
      .contentSchema('service', 'draft')
      .parse({ intro: '<p>i</p><script>y</script>' });
    expect(service.intro).toBe('<p>i</p>');
  });
});
