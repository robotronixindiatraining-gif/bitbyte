import { z } from 'zod';
import { imageRefSchema, linkSchema } from './primitives.js';

/**
 * Approved section types (D-008, docs/DATABASE_SCHEMA.md §4). Only developers add types.
 * Each builder receives a kit, so one definition yields the draft and publish schemas.
 */
export const SECTION_BUILDERS = {
  hero: (k) =>
    k
      .object({
        eyebrow: k.opt(k.text(40, 0)),
        heading: k.req(k.text(120)),
        highlight: k.opt(k.text(40, 0)),
        subheading: k.opt(k.text(300, 0)),
        primaryCta: k.req(linkSchema(k)),
        secondaryCta: k.opt(linkSchema(k)),
        visual: k.req(z.enum(['bitgrid', 'image'])),
        image: k.opt(imageRefSchema(k).nullable()),
      })
      .superRefine((data, ctx) => {
        if (k.strict && data.visual === 'image' && !data.image) {
          ctx.addIssue({ code: 'custom', path: ['image'], message: 'Choose an image' });
        }
      }),
  richText: (k) =>
    k.object({
      heading: k.opt(k.text(120, 0)),
      body: k.req(k.richText()),
      width: k.opt(z.enum(['narrow', 'wide'])),
    }),
  serviceGrid: (k) =>
    k.object({
      heading: k.req(k.text(120)),
      intro: k.opt(k.text(400, 0)),
      source: k.req(z.enum(['all', 'featured', 'manual'])),
      services: k.opt(k.list(k.id(), 12)),
      layout: k.req(z.enum(['bento', 'list'])),
    }),
  projectShowcase: (k) =>
    k.object({
      heading: k.req(k.text(120)),
      intro: k.opt(k.text(400, 0)),
      source: k.req(z.enum(['featured', 'manual', 'all'])),
      projects: k.opt(k.list(k.id(), 24)),
      showFilters: k.opt(k.bool()),
      limit: k.opt(k.int(1, 24)),
    }),
  testimonials: (k) =>
    k.object({
      heading: k.req(k.text(120)),
      source: k.req(z.enum(['featured', 'manual'])),
      items: k.opt(k.list(k.id(), 12)),
    }),
  stats: (k) =>
    k.object({
      heading: k.opt(k.text(120, 0)),
      items: k.req(
        k.list(
          k.object({
            value: k.req(k.text(12)),
            label: k.req(k.text(60)),
            footnote: k.opt(k.text(120, 0)),
          }),
          4,
          2,
        ),
      ),
    }),
  featureList: (k) =>
    k.object({
      heading: k.req(k.text(120)),
      intro: k.opt(k.text(400, 0)),
      items: k.req(
        k.list(
          k.object({
            icon: k.opt(k.text(40, 0)),
            title: k.req(k.text(80)),
            text: k.req(k.text(300)),
          }),
          12,
          1,
        ),
      ),
      columns: k.opt(k.int(2, 4)),
    }),
  processSteps: (k) =>
    k.object({
      heading: k.req(k.text(120)),
      steps: k.req(k.list(k.object({ title: k.req(k.text(80)), text: k.req(k.text(300)) }), 8, 2)),
    }),
  splitContent: (k) =>
    k.object({
      heading: k.req(k.text(120)),
      body: k.req(k.richText()),
      image: k.req(imageRefSchema(k)),
      imagePosition: k.opt(z.enum(['left', 'right'])),
      cta: k.opt(linkSchema(k).nullable()),
    }),
  ctaBanner: (k) =>
    k.object({
      heading: k.req(k.text(120)),
      text: k.opt(k.text(300, 0)),
      primaryCta: k.req(linkSchema(k)),
      secondaryCta: k.opt(linkSchema(k).nullable()),
    }),
  faq: (k) =>
    k.object({
      heading: k.req(k.text(120)),
      items: k.req(
        k.list(k.object({ question: k.req(k.text(200)), answer: k.req(k.richText()) }), 15, 1),
      ),
    }),
  engagementModels: (k) =>
    k.object({
      heading: k.req(k.text(120)),
      intro: k.opt(k.text(400, 0)),
      models: k.req(
        k.list(
          k.object({
            name: k.req(k.text(60)),
            description: k.req(k.text(300)),
            priceDisplay: k.opt(k.text(40, 0)),
            features: k.opt(k.list(k.text(120), 12)),
            cta: k.req(linkSchema(k)),
            highlighted: k.opt(k.bool()),
          }),
          4,
          1,
        ),
      ),
    }),
  contactForm: (k) =>
    k.object({
      heading: k.req(k.text(120)),
      intro: k.opt(k.text(400, 0)),
      showContactDetails: k.opt(k.bool()),
      showMap: k.opt(k.bool()),
    }),
  jobList: (k) =>
    k.object({
      heading: k.req(k.text(120)),
      intro: k.opt(k.text(400, 0)),
      emptyText: k.req(k.text(200)),
    }),
  clientLogos: (k) =>
    k.object({
      heading: k.opt(k.text(120, 0)),
      logos: k.req(
        k.list(
          k.object({
            image: k.req(imageRefSchema(k)),
            name: k.req(k.text(80)),
            url: k.opt(k.httpUrl().nullable()),
          }),
          24,
          1,
        ),
      ),
    }),
};

export const SECTION_TYPES = Object.freeze(Object.keys(SECTION_BUILDERS));
export const SECTION_BACKGROUNDS = Object.freeze(['light', 'muted', 'dark']);
export const SECTION_SPACINGS = Object.freeze(['default', 'compact']);

/** Build the data schema of every section type for one kit. */
export function buildSectionDataSchemas(k) {
  return Object.fromEntries(
    Object.entries(SECTION_BUILDERS).map(([type, build]) => [type, build(k)]),
  );
}

/** Section envelope; `data` is validated by the registry entry for `type`. */
export function sectionSchema(k) {
  const dataSchemas = buildSectionDataSchemas(k);
  return k
    .object({
      key: z.string().regex(/^[a-z0-9-]{1,40}$/i, 'Invalid section key'),
      type: z.enum(SECTION_TYPES),
      visible: k.opt(z.boolean()),
      anchorId: k.opt(
        z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens')
          .max(60)
          .nullable(),
      ),
      variant: k.opt(
        z
          .object({
            background: z.enum(SECTION_BACKGROUNDS).optional(),
            spacing: z.enum(SECTION_SPACINGS).optional(),
          })
          .strict(),
      ),
      data: z.unknown(),
    })
    .transform((section, ctx) => {
      // Validate `data` with the type's schema and keep its OUTPUT (e.g. sanitised rich text).
      const result = dataSchemas[section.type].safeParse(section.data ?? {});
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ code: 'custom', path: ['data', ...issue.path], message: issue.message });
        }
        return z.NEVER;
      }
      return { ...section, data: result.data };
    });
}

/** Page templates: the section that must exist exactly once and the allowed types (§3.4). */
const ALL_EXCEPT = (...excluded) => SECTION_TYPES.filter((t) => !excluded.includes(t));
export const PAGE_TEMPLATES = Object.freeze({
  home: { required: 'hero', allowed: ALL_EXCEPT('contactForm', 'jobList') },
  about: {
    required: 'hero',
    allowed: [
      'hero',
      'richText',
      'splitContent',
      'featureList',
      'stats',
      'processSteps',
      'testimonials',
      'clientLogos',
      'ctaBanner',
      'faq',
    ],
  },
  'services-index': {
    required: 'serviceGrid',
    allowed: [
      'serviceGrid',
      'hero',
      'richText',
      'featureList',
      'processSteps',
      'engagementModels',
      'testimonials',
      'ctaBanner',
      'faq',
    ],
  },
  'portfolio-index': {
    required: 'projectShowcase',
    allowed: ['projectShowcase', 'hero', 'richText', 'testimonials', 'clientLogos', 'ctaBanner'],
  },
  careers: {
    required: 'jobList',
    allowed: ['jobList', 'hero', 'richText', 'featureList', 'splitContent', 'ctaBanner', 'faq'],
  },
  contact: { required: 'contactForm', allowed: ['contactForm', 'hero', 'richText', 'faq'] },
  legal: { required: 'richText', allowed: ['richText'] },
  custom: { required: null, allowed: SECTION_TYPES },
});
export const PAGE_TEMPLATE_NAMES = Object.freeze(Object.keys(PAGE_TEMPLATES));

/**
 * Template rules checked at publish time. Returns `{ path, message }[]`.
 * @param {string} template
 * @param {{ type: string }[]} sections
 */
export function checkTemplateRules(template, sections = []) {
  const rules = PAGE_TEMPLATES[template];
  if (!rules) return [{ path: 'template', message: 'Unknown template' }];
  const problems = [];
  sections.forEach((section, index) => {
    if (!rules.allowed.includes(section.type)) {
      problems.push({
        path: `sections.${index}.type`,
        message: `"${section.type}" is not allowed on this page`,
      });
    }
  });
  if (rules.required) {
    const count = sections.filter((s) => s.type === rules.required).length;
    if (count !== 1) {
      problems.push({
        path: 'sections',
        message: `This page needs exactly one "${rules.required}" section`,
      });
    }
  }
  if (sections.filter((s) => s.type === 'contactForm').length > 1) {
    problems.push({ path: 'sections', message: 'Only one contact form is allowed per page' });
  }
  return problems;
}
