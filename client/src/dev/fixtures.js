/**
 * ⚠ DEVELOPMENT FIXTURES — NOT COMPANY CONTENT.
 *
 * Sample data in the exact shape of the public API (server/src/services/resolver.js), used ONLY
 * by the development component catalogue and the browser tests. It is never bundled into the
 * production site (the catalogue route exists only when import.meta.env.DEV is true) and it is
 * never written to the database.
 *
 * - Service names follow the indexed menu (CONTENT_INVENTORY G2, unverified).
 * - The hero copy is the PROVISIONAL proposal recorded in CONTENT_GAPS.md (CG-21); it is not
 *   published anywhere until the owner approves and publishes it in the CMS.
 * - Projects, testimonials, figures and logos are obviously fictional ("Example …") and exist
 *   only to show the layouts. Images are generated placeholders, not screenshots.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** A generated placeholder image (gradient + byte rows); clearly not a real screenshot. */
export function placeholderImage({
  label = 'Placeholder image',
  width = 1600,
  height = 1000,
  hue = 222,
} = {}) {
  const cells = Array.from(
    { length: 8 },
    (_, i) =>
      `<rect x="${width / 2 - 200 + i * 52}" y="${height / 2 - 16}" width="36" height="36" rx="8" fill="${i % 3 === 1 ? '#5b8cff' : '#1c3a7a'}"/>`,
  ).join('');
  const svg = `<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 60% 14%)"/><stop offset="1" stop-color="hsl(${hue} 55% 26%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>${cells}</svg>`;
  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    alt: label,
    decorative: false,
    width,
    height,
    dominantColor: `hsl(${hue} 55% 20%)`,
    variants: [],
  };
}

const link = (label, href, extra = {}) => ({
  label,
  href,
  external: false,
  openInNewTab: false,
  ...extra,
});

export const FIXTURE_SERVICES = [
  {
    slug: 'web-development',
    path: '/web-development',
    title: 'Web Development',
    navLabel: null,
    summary: 'Websites and web applications designed, built and maintained for growing businesses.',
    icon: 'code',
    featured: true,
  },
  {
    slug: 'internet-of-things',
    path: '/internet-of-things',
    title: 'Internet of Things',
    navLabel: null,
    summary: 'Connected devices, sensors and dashboards that turn field data into decisions.',
    icon: 'cpu',
    featured: false,
  },
  {
    slug: 'mobile-app-development',
    path: '/mobile-app-development',
    title: 'Mobile App Development',
    navLabel: null,
    summary: 'Android and iOS apps planned around real users and real workflows.',
    icon: 'smartphone',
    featured: false,
  },
  {
    slug: 'cms-development',
    path: '/cms-development',
    title: 'CMS Solutions',
    navLabel: null,
    summary: 'Content-managed websites your own team can update without a developer.',
    icon: 'layout-template',
    featured: false,
  },
  {
    slug: 'digital-marketing',
    path: '/digital-marketing',
    title: 'Digital Marketing',
    navLabel: null,
    summary: 'Search, social and content programmes that help the right customers find you.',
    icon: 'megaphone',
    featured: false,
  },
];

export const FIXTURE_SITE = {
  general: {
    companyName: 'BitByte Software Technology',
    legalName: null,
    tagline: 'Example tagline for the design catalogue (fixture).',
    logo: null,
    logoInverse: null,
    favicon: null,
  },
  contact: {
    addressLines: ['Example address line 1', 'Example address line 2'],
    city: 'Indore',
    region: 'M.P.',
    postalCode: '000000',
    phones: [{ label: 'Office', number: '+91 00000 00000', whatsapp: true }],
    emails: [{ label: 'General', address: 'hello@example.com' }],
    hours: 'Example hours (fixture)',
  },
  navigation: {
    header: [
      {
        ...link('Services', '/services'),
        children: FIXTURE_SERVICES.map((s) => link(s.title, s.path)),
      },
      { ...link('Portfolio', '/portfolio'), children: [] },
      { ...link('About', '/about'), children: [] },
      { ...link('Careers', '/careers'), children: [] },
    ],
    cta: link('Start a project', '/contact'),
  },
  footer: {
    columns: [
      { heading: 'Services', links: FIXTURE_SERVICES.map((s) => link(s.title, s.path)) },
      {
        heading: 'Company',
        links: [
          link('About', '/about'),
          link('Portfolio', '/portfolio'),
          link('Careers', '/careers'),
          link('Contact', '/contact'),
        ],
      },
    ],
    showContact: true,
    copyrightHolder: 'Example Holder (fixture)',
    bottomLinks: [link('Privacy policy', '/privacy-policy'), link('Terms', '/terms')],
  },
  social: { profiles: [{ platform: 'linkedin', url: 'https://www.linkedin.com/company/example' }] },
  seo: {
    titleTemplate: '%s | BitByte (fixture)',
    defaultDescription: null,
    defaultOgImage: null,
    searchConsoleToken: null,
  },
  leadForm: {
    budgetOptions: ['Example budget A', 'Example budget B'],
    consentText: 'Example consent text (fixture): I agree to be contacted about this enquiry.',
    successMessage: 'Example success message (fixture).',
  },
  careers: { method: 'instructions', email: null, url: null },
  // Cloudflare's documented always-pass TEST site key (public, not a credential).
  integrations: { turnstileSiteKey: '1x00000000000000000000AA' },
};

const PROJECT_CATEGORIES = [
  { name: 'Web Development', slug: 'web-development' },
  { name: 'Internet of Things', slug: 'internet-of-things' },
];

export const FIXTURE_PROJECTS = [
  {
    slug: 'example-project-a',
    path: '/portfolio/example-project-a',
    title: 'Example Project A',
    summary: 'Fictional project used to preview the featured portfolio layout.',
    category: PROJECT_CATEGORIES[0],
    technologies: [
      { name: 'React', slug: 'react' },
      { name: 'Node.js', slug: 'nodejs' },
    ],
    cover: placeholderImage({ label: 'Placeholder for Example Project A', hue: 222 }),
    year: 2025,
    featured: true,
  },
  {
    slug: 'example-project-b',
    path: '/portfolio/example-project-b',
    title: 'Example Project B',
    summary: 'Fictional project used to preview a standard card.',
    category: PROJECT_CATEGORIES[1],
    technologies: [{ name: 'MQTT', slug: 'mqtt' }],
    cover: placeholderImage({ label: 'Placeholder for Example Project B', hue: 200 }),
    year: 2024,
    featured: false,
  },
  {
    slug: 'example-project-c',
    path: '/portfolio/example-project-c',
    title: 'Example Project C',
    summary: 'Fictional project used to preview a standard card.',
    category: PROJECT_CATEGORIES[0],
    technologies: [],
    cover: placeholderImage({ label: 'Placeholder for Example Project C', hue: 240 }),
    year: null,
    featured: false,
  },
];

const RICH_TEXT =
  '<h2>Example heading</h2><p>This paragraph is <strong>fixture text</strong> that previews how sanitised rich text from the CMS is set, including <a href="/contact">an inline link</a>.</p><ul><li>First list item</li><li>Second list item</li></ul><blockquote><p>An example pull quote.</p></blockquote>';

/** One fixture per approved section type (shared/src/content/sections.js), in public API shape. */
export const FIXTURE_SECTIONS = {
  hero: {
    eyebrow: 'Software · Web · IoT',
    heading: 'Software, web and IoT solutions, built bit by bit.',
    highlight: 'bit by bit.',
    subheading:
      'BitByte is a software development company in Indore that designs and builds websites, mobile apps, IoT solutions and digital marketing programmes for businesses.',
    primaryCta: link('Start a project', '/contact'),
    secondaryCta: link('Explore services', '/#services'),
    visual: 'bitgrid',
    image: null,
  },
  richText: { heading: 'Example rich text', body: RICH_TEXT, width: 'narrow' },
  serviceGrid: {
    heading: 'What we build',
    intro: 'Example introduction for the services grid (fixture).',
    source: 'all',
    layout: 'bento',
    items: FIXTURE_SERVICES,
  },
  projectShowcase: {
    heading: 'Selected work',
    intro: 'Fictional projects that preview the portfolio layout.',
    source: 'featured',
    showFilters: true,
    limit: 6,
    items: FIXTURE_PROJECTS,
    categories: PROJECT_CATEGORIES,
  },
  testimonials: {
    heading: 'What clients say',
    source: 'featured',
    items: [
      {
        quote:
          'This is an example quote used only to preview the testimonial layout in the design catalogue.',
        authorName: 'Example Person',
        authorRole: 'Example role',
        company: 'Example Company',
        photo: null,
        project: null,
        featured: true,
      },
    ],
  },
  stats: {
    heading: 'Example figures',
    items: [
      { value: '00', label: 'Sample figure (fixture)', footnote: null },
      { value: '00', label: 'Sample figure (fixture)', footnote: 'Example footnote' },
      { value: '00', label: 'Sample figure (fixture)', footnote: null },
    ],
  },
  featureList: {
    heading: 'How we work',
    intro: 'Example feature list (fixture).',
    columns: 3,
    items: [
      {
        icon: 'target',
        title: 'Clear scope',
        text: 'Example feature text used to preview the layout.',
      },
      {
        icon: 'workflow',
        title: 'Steady delivery',
        text: 'Example feature text used to preview the layout.',
      },
      {
        icon: 'shield-check',
        title: 'Careful handover',
        text: 'Example feature text used to preview the layout.',
      },
    ],
  },
  processSteps: {
    heading: 'Example process',
    steps: [
      { title: 'Discover', text: 'Example step text.' },
      { title: 'Design', text: 'Example step text.' },
      { title: 'Build', text: 'Example step text.' },
      { title: 'Launch', text: 'Example step text.' },
    ],
  },
  splitContent: {
    heading: 'Example split content',
    body: '<p>Fixture text beside a generated placeholder image.</p>',
    image: placeholderImage({
      label: 'Placeholder illustration',
      width: 1200,
      height: 900,
      hue: 215,
    }),
    imagePosition: 'right',
    cta: link('Example link', '/about'),
  },
  ctaBanner: {
    heading: 'Have a project in mind?',
    text: 'Example call-to-action text (fixture).',
    primaryCta: link('Start a project', '/contact'),
    secondaryCta: link('View our work', '/portfolio'),
  },
  faq: {
    heading: 'Questions',
    items: [
      { question: 'Example question one?', answer: '<p>Example answer (fixture).</p>' },
      { question: 'Example question two?', answer: '<p>Another example answer.</p>' },
    ],
  },
  engagementModels: {
    heading: 'Ways to work together',
    intro: 'Example engagement models (fixture).',
    models: [
      {
        name: 'Fixed scope',
        description: 'Example description.',
        priceDisplay: null,
        features: ['Example feature', 'Example feature'],
        cta: link('Discuss', '/contact'),
        highlighted: false,
      },
      {
        name: 'Dedicated team',
        description: 'Example description.',
        priceDisplay: null,
        features: ['Example feature', 'Example feature'],
        cta: link('Discuss', '/contact'),
        highlighted: true,
      },
    ],
  },
  contactForm: {
    heading: 'Tell us about your project',
    intro: 'Example introduction (fixture).',
    showContactDetails: true,
    showMap: false,
  },
  jobList: {
    heading: 'Open positions',
    intro: 'Example introduction (fixture).',
    emptyText: 'Example empty-state text: there are no open positions right now.',
    items: [
      {
        slug: 'example-role',
        path: '/careers/example-role',
        title: 'Example Role',
        department: null,
        location: 'Indore',
        employmentType: 'full_time',
        experience: '2+ years (example)',
        summary: 'Example summary.',
        closesAt: null,
      },
    ],
  },
  clientLogos: {
    heading: 'Example client logos',
    logos: [1, 2, 3, 4, 5, 6].map((n) => ({
      image: placeholderImage({
        label: `Example logo ${n}`,
        width: 320,
        height: 120,
        hue: 210 + n * 6,
      }),
      name: `Example client ${n}`,
      url: null,
    })),
  },
};

export const SECTION_TYPES = Object.keys(FIXTURE_SECTIONS);

/** Default homepage composition (DESIGN_SYSTEM §10) built from the fixtures. */
export const FIXTURE_HOME_PAGE = {
  slug: 'home',
  path: '/',
  template: 'home',
  title: 'Home',
  seo: { title: null, description: null, canonical: null, ogImage: null, noindex: false },
  sections: [
    {
      key: 'hero',
      type: 'hero',
      anchorId: null,
      variant: { background: 'dark', spacing: 'default' },
      data: FIXTURE_SECTIONS.hero,
    },
    {
      key: 'services',
      type: 'serviceGrid',
      anchorId: 'services',
      variant: { background: 'light', spacing: 'default' },
      data: FIXTURE_SECTIONS.serviceGrid,
    },
    {
      key: 'about',
      type: 'splitContent',
      anchorId: null,
      variant: { background: 'muted', spacing: 'default' },
      data: { ...FIXTURE_SECTIONS.splitContent, heading: 'Example about teaser' },
    },
    {
      key: 'work',
      type: 'projectShowcase',
      anchorId: null,
      variant: { background: 'light', spacing: 'default' },
      data: FIXTURE_SECTIONS.projectShowcase,
    },
    {
      key: 'process',
      type: 'processSteps',
      anchorId: null,
      variant: { background: 'dark', spacing: 'default' },
      data: FIXTURE_SECTIONS.processSteps,
    },
    {
      key: 'cta',
      type: 'ctaBanner',
      anchorId: null,
      variant: { background: 'light', spacing: 'default' },
      data: FIXTURE_SECTIONS.ctaBanner,
    },
  ],
};
