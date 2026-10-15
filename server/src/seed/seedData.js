/**
 * Initial placeholder content (docs/DATABASE_SCHEMA.md §8, D-015).
 * Rules: every unverified business fact is a "[CONFIRM …]" placeholder, so nothing here can be
 * published until an administrator replaces it with verified information. No company facts,
 * client permissions, testimonials, portfolio projects or job openings are created.
 * Service names come from the indexed site navigation; their copy is a placeholder.
 */

export const SEEDED_SERVICES = [
  {
    seedKey: 'service:web-development',
    slug: 'web-development',
    title: 'Web Development',
    legacyUrlUnverified: true,
  },
  {
    seedKey: 'service:internet-of-things',
    slug: 'internet-of-things',
    title: 'Internet of Things',
  },
  {
    seedKey: 'service:mobile-app-development',
    slug: 'mobile-app-development',
    title: 'Mobile App Development',
    legacyUrlUnverified: true,
  },
  {
    seedKey: 'service:cms-development',
    slug: 'cms-development',
    title: 'CMS Solutions',
    navLabel: 'CMS Solutions',
  },
  { seedKey: 'service:digital-marketing', slug: 'digital-marketing', title: 'Digital Marketing' },
];

export const SEEDED_CATEGORIES = [
  {
    seedKey: 'taxonomy:category:web-development',
    name: 'Web Development',
    slug: 'web-development',
  },
  { seedKey: 'taxonomy:category:e-commerce', name: 'E-Commerce', slug: 'e-commerce' },
  {
    seedKey: 'taxonomy:category:internet-of-things',
    name: 'Internet of Things',
    slug: 'internet-of-things',
  },
];

const HEADING = '[CONFIRM SECTION HEADING]';
const entity = (kind, id) => ({ kind, id: String(id) });
const linkTo = (label, kind, id) => ({ label, kind: 'entity', entity: entity(kind, id) });

/** System pages; `sections` may reference other seeded ids via `ids`. */
export function systemPages(ids) {
  const contactCta = () => linkTo('[CONFIRM CTA LABEL]', 'page', ids.pages.contact);
  return [
    {
      seedKey: 'page:home',
      slug: '',
      template: 'home',
      draft: {
        title: 'Home',
        sections: [
          {
            key: 'hero',
            type: 'hero',
            visible: true,
            variant: { background: 'dark' },
            data: {
              heading: '[CONFIRM HOMEPAGE HERO TEXT]',
              visual: 'bitgrid',
              primaryCta: contactCta(),
            },
          },
          {
            key: 'services',
            type: 'serviceGrid',
            visible: true,
            data: { heading: HEADING, source: 'all', layout: 'bento' },
          },
        ],
      },
    },
    {
      seedKey: 'page:about',
      slug: 'about',
      template: 'about',
      draft: {
        title: 'About',
        sections: [
          {
            key: 'hero',
            type: 'hero',
            visible: true,
            data: {
              heading: '[CONFIRM ABOUT PAGE CONTENT]',
              visual: 'bitgrid',
              primaryCta: contactCta(),
            },
          },
        ],
      },
    },
    {
      seedKey: 'page:services',
      slug: 'services',
      template: 'services-index',
      draft: {
        title: 'Services',
        sections: [
          {
            key: 'services',
            type: 'serviceGrid',
            visible: true,
            data: { heading: HEADING, source: 'all', layout: 'list' },
          },
        ],
      },
    },
    {
      seedKey: 'page:portfolio',
      slug: 'portfolio',
      template: 'portfolio-index',
      draft: {
        title: 'Portfolio',
        sections: [
          {
            key: 'projects',
            type: 'projectShowcase',
            visible: true,
            data: { heading: HEADING, source: 'all', showFilters: true },
          },
        ],
      },
    },
    {
      seedKey: 'page:careers',
      slug: 'careers',
      template: 'careers',
      draft: {
        title: 'Careers',
        sections: [
          {
            key: 'jobs',
            type: 'jobList',
            visible: true,
            data: { heading: HEADING, emptyText: '[CONFIRM CAREERS EMPTY-STATE TEXT]' },
          },
        ],
      },
    },
    {
      seedKey: 'page:contact',
      slug: 'contact',
      template: 'contact',
      draft: {
        title: 'Contact',
        sections: [
          {
            key: 'form',
            type: 'contactForm',
            visible: true,
            data: { heading: HEADING, showContactDetails: true, showMap: false },
          },
        ],
      },
    },
    {
      seedKey: 'page:privacy-policy',
      slug: 'privacy-policy',
      template: 'legal',
      draft: {
        title: 'Privacy policy',
        sections: [
          {
            key: 'body',
            type: 'richText',
            visible: true,
            data: { body: '[CONFIRM PRIVACY POLICY TEXT]' },
          },
        ],
      },
    },
    {
      seedKey: 'page:terms',
      slug: 'terms',
      template: 'legal',
      draft: {
        title: 'Terms',
        sections: [
          { key: 'body', type: 'richText', visible: true, data: { body: '[CONFIRM TERMS TEXT]' } },
        ],
      },
    },
  ];
}

export function serviceDraft(service) {
  return {
    title: service.title,
    ...(service.navLabel ? { navLabel: service.navLabel } : {}),
    slug: service.slug,
    summary: '[CONFIRM VERIFIED COPY]',
    intro: service.legacyUrlUnverified
      ? '[CONFIRM VERIFIED COPY] [CONFIRM LEGACY URL]'
      : '[CONFIRM VERIFIED COPY]',
  };
}

/** Settings drafts keyed by settings key. */
export function settingsDrafts(ids) {
  const page = (slug) => ids.pages[slug];
  return {
    general: {
      companyName: '[CONFIRM COMPANY NAME]',
      legalName: '[CONFIRM LEGAL ENTITY NAME]',
      tagline: '[CONFIRM TAGLINE]',
    },
    contact: {
      addressLines: ['[CONFIRM OFFICE ADDRESS]'],
      phones: [{ label: 'Office', number: '[CONFIRM PHONE]', whatsapp: false }],
      emails: [{ label: 'General', address: '[CONFIRM CONTACT EMAIL]' }],
      hours: '[CONFIRM OFFICE HOURS]',
    },
    navigation: {
      header: [
        {
          link: linkTo('Services', 'page', page('services')),
          children: ids.services.map((s) => linkTo(s.title, 'service', s.id)),
        },
        { link: linkTo('Portfolio', 'page', page('portfolio')) },
        { link: linkTo('Careers', 'page', page('careers')) },
        { link: linkTo('About', 'page', page('about')) },
        { link: linkTo('Contact', 'page', page('contact')) },
      ],
      cta: linkTo('[CONFIRM CTA LABEL]', 'page', page('contact')),
    },
    footer: {
      columns: [],
      showContact: true,
      copyrightHolder: '[CONFIRM LEGAL ENTITY NAME]',
      bottomLinks: [
        linkTo('Privacy policy', 'page', page('privacy-policy')),
        linkTo('Terms', 'page', page('terms')),
      ],
    },
    social: { profiles: [] },
    seo: {
      titleTemplate: '%s · [CONFIRM COMPANY NAME]',
      defaultDescription: '[CONFIRM META DESCRIPTION]',
    },
    leadForm: {
      budgetOptions: ['[CONFIRM BUDGET OPTIONS]'],
      consentText: '[CONFIRM CONSENT TEXT]',
      successMessage: '[CONFIRM SUCCESS MESSAGE]',
      notificationEmails: [],
    },
    careers: { applicationMethod: 'instructions', careersEmail: null, externalUrl: null },
    privacy: { leadRetentionDays: 365, spamRetentionDays: 30 },
    integrations: { turnstileSiteKey: '' },
  };
}
