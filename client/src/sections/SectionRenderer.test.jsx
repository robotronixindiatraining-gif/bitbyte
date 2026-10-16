import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { SECTION_TYPES as SHARED_SECTION_TYPES } from '@bitbyte/shared';
import { SmartLink } from '../components/ui/SmartLink.jsx';
import { FIXTURE_SECTIONS, FIXTURE_SITE } from '../dev/fixtures.js';
import { bentoSpan } from './ServiceGridSection.jsx';
import { SECTION_COMPONENTS, SectionList } from './SectionRenderer.jsx';

function renderSections(sections) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, queryFn: () => null } },
  });
  client.setQueryData(['public', 'site'], {
    ...FIXTURE_SITE,
    integrations: { turnstileSiteKey: null },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SectionList sections={sections} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const section = (type, data, background = 'light', key = type) => ({
  key,
  type,
  anchorId: null,
  variant: { background, spacing: 'default' },
  data,
});

/** Minimal data per type: only the schema's required fields (optional ones omitted). */
const MINIMAL = {
  hero: { heading: 'Minimal hero', visual: 'bitgrid' },
  richText: { body: '<p>Minimal body</p>' },
  serviceGrid: {
    heading: 'Minimal services',
    items: [{ slug: 's', path: '/s', title: 'Only service' }],
  },
  projectShowcase: {
    heading: 'Minimal projects',
    items: [{ slug: 'p', path: '/portfolio/p', title: 'Only project' }],
  },
  testimonials: {
    heading: 'Minimal quotes',
    items: [{ quote: 'A quote of reasonable length.', authorName: 'Someone' }],
  },
  stats: {
    items: [
      { value: '1', label: 'One' },
      { value: '2', label: 'Two' },
    ],
  },
  featureList: { heading: 'Minimal features', items: [{ title: 'Feature', text: 'Text' }] },
  processSteps: {
    heading: 'Minimal steps',
    steps: [
      { title: 'A', text: 'a' },
      { title: 'B', text: 'b' },
    ],
  },
  splitContent: { heading: 'Minimal split', body: '<p>Body</p>' },
  ctaBanner: { heading: 'Minimal CTA' },
  faq: { heading: 'Minimal FAQ', items: [{ question: 'Q?', answer: '<p>A.</p>' }] },
  engagementModels: { heading: 'Minimal models', models: [{ name: 'Model', description: 'Desc' }] },
  contactForm: { heading: 'Minimal contact' },
  jobList: { heading: 'Minimal jobs', emptyText: 'No open roles.' },
  clientLogos: { logos: [{ image: { url: '/l.png', width: 10, height: 10 }, name: 'Client' }] },
};

describe('section renderers', () => {
  it('implements exactly the 15 approved section types from the shared schema', () => {
    expect(Object.keys(SECTION_COMPONENTS).sort()).toEqual([...SHARED_SECTION_TYPES].sort());
    expect(Object.keys(FIXTURE_SECTIONS).sort()).toEqual([...SHARED_SECTION_TYPES].sort());
  });

  it.each(
    SHARED_SECTION_TYPES.flatMap((type) => ['light', 'muted', 'dark'].map((bg) => [type, bg])),
  )('renders %s on the %s surface', (type, background) => {
    const { container } = renderSections([section(type, FIXTURE_SECTIONS[type], background)]);
    const element = container.querySelector(`[data-section-type="${type}"]`);
    expect(element).not.toBeNull();
    expect(element.className).toContain(`surface-${background}`);
    const heading = FIXTURE_SECTIONS[type].heading;
    if (heading) expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it.each(SHARED_SECTION_TYPES)('renders %s with only its required data', (type) => {
    const errors = vi.spyOn(console, 'error');
    const { container } = renderSections([section(type, MINIMAL[type])]);
    expect(container.querySelector(`[data-section-type="${type}"]`)).not.toBeNull();
    expect(errors).not.toHaveBeenCalled();
  });

  it('hides sections whose lists are empty instead of rendering empty shells', () => {
    const { container } = renderSections([
      section('testimonials', { heading: 'Nobody yet', items: [] }),
      section('serviceGrid', { heading: 'No services', items: [] }),
      section('stats', { items: [] }),
    ]);
    expect(container.querySelector('[data-section-type]')).toBeNull();
  });

  it('shows the CMS empty text when no jobs are open', () => {
    renderSections([section('jobList', MINIMAL.jobList)]);
    expect(screen.getByText('No open roles.')).toBeInTheDocument();
  });

  it('flags unknown section types during development and isolates a failing section', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderSections([
      section('carousel', {}),
      section(
        'stats',
        { items: [{ value: { not: 'renderable' }, label: 'Broken' }] },
        'light',
        'broken',
      ),
      section('ctaBanner', { heading: 'Still rendered' }),
    ]);
    expect(screen.getByRole('note')).toHaveTextContent('Unsupported section type “carousel”');
    expect(warn).toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Still rendered' })).toBeInTheDocument();
  });

  it('gives the first hero the page h1 and other sections h2', () => {
    renderSections([
      section('hero', FIXTURE_SECTIONS.hero, 'dark'),
      section('faq', FIXTURE_SECTIONS.faq),
    ]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Software, web and IoT solutions',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Questions' })).toBeInTheDocument();
  });

  it('places bento cards so rows never end with a gap', () => {
    expect(bentoSpan(0, 5)).toBe('md:col-span-2');
    expect(bentoSpan(4, 5)).toBe('');
    expect(bentoSpan(3, 4)).toContain('lg:col-span-2');
    expect(bentoSpan(5, 6)).toContain('lg:col-span-3');
    expect(bentoSpan(0, 1)).toContain('lg:col-span-3');
  });
});

describe('links', () => {
  it('never renders unsafe or protocol-relative hrefs as links', () => {
    render(
      <MemoryRouter>
        {['javascript:alert(1)', '//evil.example', '/\\evil.example', 'data:text/html,x'].map(
          (href) => (
            <SmartLink key={href} href={href}>
              {href}
            </SmartLink>
          ),
        )}
        <SmartLink href="https://example.com" openInNewTab>
          External
        </SmartLink>
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
    const external = screen.getByRole('link', { name: /External/ });
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveTextContent('(opens in a new tab)');
  });
});
