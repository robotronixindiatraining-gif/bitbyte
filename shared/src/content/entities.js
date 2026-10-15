import { z } from 'zod';
import { imageRefSchema, linkSchema, seoSchema } from './primitives.js';
import { PAGE_TEMPLATE_NAMES, sectionSchema } from './sections.js';

/** Content shapes stored in `draft` / `published` (docs/DATABASE_SCHEMA.md §3). */
export const CONTENT_BUILDERS = {
  service: (k) =>
    k.object({
      title: k.req(k.text(80)),
      navLabel: k.opt(k.text(40, 0)),
      slug: k.req(k.slug()),
      summary: k.req(k.text(240)),
      icon: k.opt(k.text(40, 0).nullable()),
      heroImage: k.opt(imageRefSchema(k).nullable()),
      intro: k.req(k.richText().refine((v) => !k.strict || v.trim().length > 0, 'Required')),
      offerings: k.opt(
        k.list(
          k.object({
            title: k.req(k.text(80)),
            description: k.opt(k.richText()),
            items: k.opt(k.list(k.text(120), 20)),
          }),
          12,
        ),
      ),
      industries: k.opt(k.list(k.text(60), 20)),
      process: k.opt(
        k.list(k.object({ title: k.req(k.text(80)), description: k.opt(k.text(300, 0)) }), 8),
      ),
      technologies: k.opt(k.list(k.id(), 30)),
      faqs: k.opt(
        k.list(k.object({ question: k.req(k.text(200)), answer: k.req(k.richText()) }), 15),
      ),
      relatedProjects: k.opt(k.list(k.id(), 6)),
      cta: k.opt(
        k
          .object({
            heading: k.req(k.text(120)),
            text: k.opt(k.text(300, 0)),
            link: k.req(linkSchema(k)),
          })
          .nullable(),
      ),
      featured: k.opt(k.bool()),
      seo: k.opt(seoSchema(k)),
    }),

  project: (k) =>
    k.object({
      title: k.req(k.text(100)),
      slug: k.req(k.slug()),
      summary: k.req(k.text(240)),
      category: k.req(k.id()),
      technologies: k.opt(k.list(k.id(), 30)),
      services: k.opt(k.list(k.id(), 10)),
      client: k.opt(k.object({ name: k.opt(k.text(100, 0)), showName: k.opt(k.bool()) })),
      overview: k.opt(k.richText()),
      challenge: k.opt(k.richText()),
      solution: k.opt(k.richText()),
      outcome: k.opt(k.richText()),
      cover: k.req(imageRefSchema(k)),
      gallery: k.opt(
        k.list(k.object({ image: k.req(imageRefSchema(k)), caption: k.opt(k.text(160, 0)) }), 20),
      ),
      liveUrl: k.opt(k.httpUrl().nullable()),
      year: k.opt(k.int(2000, new Date().getFullYear() + 1).nullable()),
      featured: k.opt(k.bool()),
      seo: k.opt(seoSchema(k)),
    }),

  testimonial: (k) =>
    k.object({
      quote: k.req(k.text(800, 10)),
      authorName: k.req(k.text(80)),
      authorRole: k.opt(k.text(80, 0)),
      company: k.opt(k.text(100, 0)),
      photo: k.opt(imageRefSchema(k).nullable()),
      project: k.opt(k.id().nullable()),
      featured: k.opt(k.bool()),
    }),

  job: (k) =>
    k.object({
      title: k.req(k.text(100)),
      slug: k.req(k.slug()),
      department: k.opt(k.text(60, 0)),
      location: k.req(k.text(100)),
      employmentType: k.req(z.enum(['full_time', 'part_time', 'internship', 'contract'])),
      experience: k.opt(k.text(60, 0)),
      summary: k.req(k.text(240)),
      description: k.req(k.richText()),
      responsibilities: k.opt(k.list(k.text(200), 20)),
      requirements: k.opt(k.list(k.text(200), 20)),
      applyInstructions: k.opt(k.richText()),
      closesAt: k.opt(z.iso.datetime({ offset: true }).nullable()),
      seo: k.opt(seoSchema(k)),
    }),

  page: (k) =>
    k.object({
      title: k.req(k.text(120)),
      slug: k.opt(z.string().max(80)),
      sections: k.opt(k.list(sectionSchema(k), 20)),
      seo: k.opt(seoSchema(k)),
    }),

  ordering: (k) =>
    k.object({
      ids: k
        .list(k.id(), 500)
        .refine((ids) => new Set(ids).size === ids.length, 'Each item may appear only once'),
    }),
};

export const SETTINGS_BUILDERS = {
  general: (k) =>
    k.object({
      companyName: k.req(k.text(120)),
      legalName: k.opt(k.text(160, 0)),
      tagline: k.opt(k.text(200, 0)),
      logo: k.opt(imageRefSchema(k).nullable()),
      logoInverse: k.opt(imageRefSchema(k).nullable()),
      favicon: k.opt(imageRefSchema(k).nullable()),
    }),
  contact: (k) =>
    k.object({
      addressLines: k.req(k.list(k.text(120), 4, 1)),
      city: k.opt(k.text(80, 0)),
      region: k.opt(k.text(80, 0)),
      postalCode: k.opt(k.text(20, 0)),
      country: k.opt(k.text(80, 0)),
      phones: k.opt(
        k.list(
          k.object({
            label: k.req(k.text(40)),
            number: k.req(k.text(30)),
            whatsapp: k.opt(k.bool()),
          }),
          5,
        ),
      ),
      emails: k.opt(k.list(k.object({ label: k.req(k.text(40)), address: k.req(k.email()) }), 5)),
      hours: k.opt(k.text(200, 0)),
      mapEmbedUrl: k.opt(k.httpUrl().nullable()),
      mapLinkUrl: k.opt(k.httpUrl().nullable()),
      geo: k.opt(
        z
          .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
          .strict()
          .nullable(),
      ),
    }),
  navigation: (k) =>
    k.object({
      header: k.req(
        k.list(
          k.object({ link: k.req(linkSchema(k)), children: k.opt(k.list(linkSchema(k), 10)) }),
          8,
        ),
      ),
      cta: k.opt(linkSchema(k).nullable()),
    }),
  footer: (k) =>
    k.object({
      columns: k.opt(
        k.list(
          k.object({ heading: k.req(k.text(60)), links: k.req(k.list(linkSchema(k), 12)) }),
          4,
        ),
      ),
      showContact: k.opt(k.bool()),
      copyrightHolder: k.req(k.text(160)),
      bottomLinks: k.opt(k.list(linkSchema(k), 6)),
    }),
  social: (k) =>
    k.object({
      profiles: k.req(
        k.list(
          k.object({
            platform: k.req(
              z.enum(['linkedin', 'instagram', 'facebook', 'x', 'youtube', 'github', 'whatsapp']),
            ),
            url: k.req(k.httpUrl()),
          }),
          10,
        ),
      ),
    }),
  seo: (k) =>
    k.object({
      titleTemplate: k.req(
        k
          .text(80)
          .refine((v) => !k.strict || v.includes('%s'), 'Must contain %s for the page title'),
      ),
      defaultDescription: k.opt(k.text(170, 0)),
      defaultOgImage: k.opt(imageRefSchema(k).nullable()),
      organization: k.opt(
        k.object({
          name: k.opt(k.text(160, 0)),
          logo: k.opt(imageRefSchema(k).nullable()),
          sameAs: k.opt(k.list(k.httpUrl(), 10)),
        }),
      ),
      searchConsoleToken: k.opt(k.text(120, 0)),
    }),
  leadForm: (k) =>
    k.object({
      budgetOptions: k.req(k.list(k.text(60), 10, 1)),
      consentText: k.req(k.text(600)),
      successMessage: k.req(k.text(300)),
      notificationEmails: k.opt(k.list(k.email(), 5)),
    }),
  careers: (k) =>
    k
      .object({
        applicationMethod: z.enum(['instructions', 'email', 'external', 'form']),
        careersEmail: k.opt(k.email().nullable()),
        externalUrl: k.opt(k.httpUrl().nullable()),
      })
      .superRefine((value, ctx) => {
        // D-031: the on-site form stays disabled until applicant-data handling is confirmed.
        if (value.applicationMethod === 'form') {
          ctx.addIssue({
            code: 'custom',
            path: ['applicationMethod'],
            message: 'The on-site application form is not enabled yet',
          });
        }
        if (k.strict && value.applicationMethod === 'email' && !value.careersEmail) {
          ctx.addIssue({
            code: 'custom',
            path: ['careersEmail'],
            message: 'Required for e-mail applications',
          });
        }
        if (k.strict && value.applicationMethod === 'external' && !value.externalUrl) {
          ctx.addIssue({
            code: 'custom',
            path: ['externalUrl'],
            message: 'Required for external applications',
          });
        }
      }),
  privacy: (k) =>
    k.object({
      // D-032: never empty, never indefinite — required in drafts too.
      leadRetentionDays: k.int(30, 1095),
      spamRetentionDays: k.int(1, 90),
    }),
  integrations: (k) =>
    k.object({
      turnstileSiteKey: k.opt(k.text(100, 0)),
    }),
};

export const SETTINGS_KEYS = Object.freeze(Object.keys(SETTINGS_BUILDERS));
export const CONTENT_TYPES = Object.freeze(Object.keys(CONTENT_BUILDERS));
export { PAGE_TEMPLATE_NAMES };
