import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Route, Routes, useSearchParams } from 'react-router';
import { BitGrid, HERO_PATTERN } from '../components/ui/BitGrid.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge, Card, STRETCHED_LINK } from '../components/ui/Card.jsx';
import { ICON_NAMES, IconTile } from '../components/ui/Icon.jsx';
import { Container, Section } from '../components/ui/Section.jsx';
import { SmartLink } from '../components/ui/SmartLink.jsx';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States.jsx';
import { Eyebrow, Lead } from '../components/ui/Typography.jsx';
import { RootLayout } from '../layouts/RootLayout.jsx';
import { SiteFooter } from '../layouts/SiteFooter.jsx';
import { SiteHeader } from '../layouts/SiteHeader.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { SectionView } from '../sections/SectionRenderer.jsx';
import {
  FIXTURE_HOME_PAGE,
  FIXTURE_SECTIONS,
  FIXTURE_SERVICES,
  FIXTURE_SITE,
  SECTION_TYPES,
} from './fixtures.js';

/** A query client pre-filled with fixtures, so catalogue components never call the API. */
function fixtureClient({ site = FIXTURE_SITE, page = FIXTURE_HOME_PAGE } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false, queryFn: () => null } },
  });
  client.setQueryData(['public', 'site'], site);
  client.setQueryData(['public', 'services'], FIXTURE_SERVICES);
  client.setQueryData(['public', 'page', 'home'], page);
  return client;
}

const PALETTE = [
  ['navy-950', '#070F24'],
  ['navy-900', '#0B1A3A'],
  ['navy-800', '#12275A'],
  ['navy-700', '#1C3A7A'],
  ['accent-700', '#1844B8'],
  ['accent-600', '#1F55E0'],
  ['accent-500', '#2F6BFF'],
  ['accent-400', '#5B8CFF'],
  ['accent-300', '#8FB0FF'],
  ['accent-100', '#E6EEFF'],
  ['neutral-0', '#FFFFFF'],
  ['neutral-50', '#F7F8FB'],
  ['neutral-100', '#EEF1F6'],
  ['neutral-200', '#DDE3EC'],
  ['neutral-300', '#C3CBD8'],
  ['neutral-400', '#97A1B5'],
  ['neutral-500', '#64708A'],
  ['neutral-600', '#4B5670'],
  ['neutral-700', '#374156'],
  ['neutral-900', '#111827'],
  ['success-700', '#0E7A3D'],
  ['warning-700', '#8A5A00'],
  ['danger-600', '#C42B2B'],
];
const TYPE_SCALE = [
  ['display', 'text-display font-extrabold'],
  ['h1', 'text-h1 font-extrabold'],
  ['h2', 'text-h2 font-bold'],
  ['h3', 'text-h3 font-bold'],
  ['h4', 'text-h4 font-semibold'],
  ['lead', 'text-lead'],
  ['body', 'text-body'],
  ['small', 'text-small'],
];
const SURFACES = ['light', 'muted', 'dark'];

function Block({ id, title, children }) {
  return (
    <section
      aria-labelledby={`cat-${id}`}
      className="flex flex-col gap-6 border-t border-border py-12"
    >
      <h2
        id={`cat-${id}`}
        className="font-mono text-eyebrow tracking-[0.12em] text-fg-subtle uppercase"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Primitives({ surface }) {
  return (
    <Section background={surface} spacing="compact">
      <Container className="flex flex-col gap-8">
        <p className="font-mono text-small text-fg-subtle">surface-{surface}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost" arrow>
            Ghost
          </Button>
          <Button size="sm">Small</Button>
          <Button size="lg" arrow>
            Large
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SmartLink href="/about" className="link-inline">
            Internal link
          </SmartLink>
          <SmartLink href="https://example.com" openInNewTab className="link-inline">
            External link
          </SmartLink>
          <SmartLink href="javascript:alert(1)" className="link-inline">
            Unsafe href renders as text
          </SmartLink>
          <Badge>Accent badge</Badge>
          <Badge tone="neutral">Neutral badge</Badge>
          <Badge tone="mono">mono-tag</Badge>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Card>
            <IconTile name="cpu" />
            <h3 className="mt-4 text-h4 font-semibold">Static card</h3>
            <p className="mt-2 text-fg-muted">Card body text on {surface}.</p>
          </Card>
          <Card interactive>
            <IconTile name="code" />
            <h3 className="mt-4 text-h4 font-semibold">
              <SmartLink href="/web-development" className={STRETCHED_LINK}>
                Interactive card
              </SmartLink>
            </h3>
            <p className="mt-2 text-fg-muted">The whole card is one link.</p>
          </Card>
          <div
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6"
            aria-busy="true"
          >
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <EmptyState title="Empty state">Nothing has been published here yet.</EmptyState>
          <ErrorState onRetry={() => {}} />
        </div>
      </Container>
    </Section>
  );
}

function Overview() {
  const [params, setParams] = useSearchParams();
  const surface = params.get('surface');
  const override = SURFACES.includes(surface) ? surface : null;
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  return (
    <>
      <div
        role="note"
        className="sticky top-0 z-50 bg-warning-700 px-4 py-2 text-center text-small font-semibold text-white"
      >
        Development catalogue — fixture data only, not verified company content. Not available in
        production builds.
      </div>
      <main id="main">
        <Container className="flex flex-col pt-12">
          <Eyebrow>Design system</Eyebrow>
          <h1 className="mt-3 text-h1 font-extrabold">Component catalogue</h1>
          <Lead className="mt-4 max-w-[60ch]">
            Tokens, primitives, states, navigation and all {SECTION_TYPES.length} section renderers,
            built from development fixtures. Reduced motion is {reduced ? 'ON' : 'off'} in this
            browser.
          </Lead>
          <nav aria-label="Catalogue" className="mt-6 flex flex-wrap gap-3">
            <Link className="link-inline" to="home">
              Homepage preview (fixtures)
            </Link>
            <a className="link-inline" href="#sections">
              Sections
            </a>
            <a className="link-inline" href="#navigation">
              Navigation
            </a>
          </nav>

          <Block id="colour" title="Colour tokens (provisional, D-024)">
            <ul role="list" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {PALETTE.map(([name, hex]) => (
                <li key={name} className="flex flex-col gap-2 text-small">
                  <span
                    className="h-14 rounded-md border border-border"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="font-mono text-fg">{name}</span>
                  <span className="font-mono text-fg-subtle">{hex}</span>
                </li>
              ))}
            </ul>
          </Block>

          <Block id="type" title="Typography">
            <div className="flex flex-col gap-4">
              {TYPE_SCALE.map(([name, cls]) => (
                <div key={name} className="grid items-baseline gap-2 sm:grid-cols-[6rem_1fr]">
                  <span className="font-mono text-small text-fg-subtle">{name}</span>
                  <p
                    className={`${cls} ${name.startsWith('h') || name === 'display' ? 'font-display text-fg' : ''}`}
                  >
                    Software, web and IoT
                  </p>
                </div>
              ))}
              <div className="grid items-baseline gap-2 sm:grid-cols-[6rem_1fr]">
                <span className="font-mono text-small text-fg-subtle">eyebrow</span>
                <Eyebrow>Section label</Eyebrow>
              </div>
            </div>
          </Block>

          <Block id="icons" title="Curated icons (CMS icon names)">
            <ul role="list" className="flex flex-wrap gap-3">
              {ICON_NAMES.map((name) => (
                <li
                  key={name}
                  className="flex w-28 flex-col items-center gap-2 text-center font-mono text-[0.6875rem] text-fg-subtle"
                >
                  <IconTile name={name} />
                  {name}
                </li>
              ))}
            </ul>
          </Block>

          <Block id="bitgrid" title="BitGrid motif">
            <div className="flex flex-wrap items-end gap-10">
              <div className="surface-dark rounded-xl p-8">
                <BitGrid pattern={HERO_PATTERN} cell={14} gap={7} highlightRows={[1, 6]} />
              </div>
              <BitGrid pattern={['01000010']} cell={12} gap={6} />
            </div>
          </Block>
        </Container>

        <div className="flex flex-col">
          {SURFACES.map((name) => (
            <Primitives key={name} surface={name} />
          ))}
        </div>

        <Container>
          <Block id="navigation" title="Navigation (header, mega-menu, mobile drawer, footer)">
            <p className="text-fg-muted">
              The header below is the real component, contained in this box. Open “Services” for the
              mega-panel; below 1024 px the menu button opens the mobile drawer.
            </p>
          </Block>
        </Container>
        <div
          className="relative h-[480px] overflow-hidden border-y border-border [transform:translateZ(0)]"
          data-testid="nav-demo"
        >
          <RootLayoutDemo />
        </div>

        <Container>
          <Block id="sections" title={`All ${SECTION_TYPES.length} section types`}>
            <div
              role="group"
              aria-label="Surface for every section"
              className="flex flex-wrap gap-2"
            >
              {[null, ...SURFACES].map((name) => (
                <button
                  key={name ?? 'cms'}
                  type="button"
                  aria-pressed={override === name}
                  onClick={() => setParams(name ? { surface: name } : {})}
                  className="min-h-10 rounded-full border border-border px-4 text-small aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-fg"
                >
                  {name ?? 'Default variants'}
                </button>
              ))}
            </div>
          </Block>
        </Container>
        {SECTION_TYPES.map((type, index) => (
          <div key={type} data-catalogue-section={type}>
            <p className="container-site py-2 font-mono text-[0.6875rem] text-fg-subtle">{type}</p>
            <SectionView
              index={type === 'hero' ? 0 : index + 1}
              section={{
                key: `cat-${type}`,
                type,
                anchorId: null,
                variant: {
                  background:
                    override ??
                    (type === 'hero' || type === 'ctaBanner'
                      ? 'dark'
                      : index % 2
                        ? 'muted'
                        : 'light'),
                  spacing: 'compact',
                },
                data: FIXTURE_SECTIONS[type],
              }}
            />
          </div>
        ))}

        <Container>
          <Block id="missing" title="Missing and optional data">
            <p className="text-fg-muted">
              Each row renders a section with optional fields removed; empty lists hide the section.
            </p>
          </Block>
        </Container>
        <SectionView
          index={1}
          section={{
            key: 'm-hero',
            type: 'hero',
            variant: { background: 'light' },
            data: { heading: 'Hero with only a heading', visual: 'bitgrid' },
          }}
        />
        <SectionView
          index={1}
          section={{
            key: 'm-list',
            type: 'serviceGrid',
            variant: { background: 'muted' },
            data: { ...FIXTURE_SECTIONS.serviceGrid, layout: 'list', intro: null },
          }}
        />
        <SectionView
          index={1}
          section={{
            key: 'm-jobs',
            type: 'jobList',
            variant: { background: 'light' },
            data: { ...FIXTURE_SECTIONS.jobList, items: [] },
          }}
        />
        <SectionView
          index={1}
          section={{
            key: 'm-empty',
            type: 'testimonials',
            variant: { background: 'light' },
            data: { heading: 'Hidden: no testimonials', items: [] },
          }}
        />
        <SectionView
          index={1}
          section={{
            key: 'm-unknown',
            type: 'carousel',
            variant: { background: 'light' },
            data: {},
          }}
        />
        <SectionView
          index={1}
          section={{
            key: 'm-split',
            type: 'splitContent',
            variant: { background: 'muted' },
            data: {
              heading: 'Split content without an image or CTA',
              body: '<p>Text only.</p>',
              image: null,
              cta: null,
            },
          }}
        />
      </main>
    </>
  );
}

/** The real header and footer, fed by fixtures (transform makes the fixed header local). */
function RootLayoutDemo() {
  return (
    <div className="h-full overflow-y-auto">
      <SiteHeader />
      <div className="container-site pt-(--header-h) pb-10 text-fg-muted">
        <p className="py-10">Page content area</p>
      </div>
      <SiteFooter />
    </div>
  );
}

/**
 * Development-only component catalogue at /__dev/catalogue (and /__dev/catalogue/home for the
 * full homepage preview). See README → "Component catalogue".
 */
export default function CataloguePage() {
  const [client] = useState(() => fixtureClient());
  return (
    <QueryClientProvider client={client}>
      <Routes>
        <Route index element={<Overview />} />
        <Route element={<RootLayout />}>
          <Route path="home" element={<HomePage />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}
