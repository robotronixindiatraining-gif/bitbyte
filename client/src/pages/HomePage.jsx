import { BitGrid, HERO_PATTERN } from '../components/ui/BitGrid.jsx';
import { Container, Section } from '../components/ui/Section.jsx';
import { ErrorState, Skeleton } from '../components/ui/States.jsx';
import { Eyebrow } from '../components/ui/Typography.jsx';
import { usePage, useSite } from '../features/content/queries.js';
import { useDocumentTitle } from '../features/content/useDocumentTitle.js';
import { useOverlayHeader } from '../layouts/pageChrome.js';
import { hasContent, SectionList } from '../sections/SectionRenderer.jsx';

function firstVisible(sections) {
  return sections.find((section) => hasContent(section?.type, section?.data ?? {})) ?? null;
}

function HomeLoading() {
  return (
    <Section background="dark" spacing="none" aria-busy="true" aria-label="Loading">
      <Container className="flex flex-col gap-6 pt-[calc(var(--header-h)+96px)] pb-28">
        <Skeleton className="h-4 w-40 bg-navy-800" />
        <Skeleton className="h-16 w-full max-w-2xl bg-navy-800" />
        <Skeleton className="h-6 w-full max-w-xl bg-navy-800" />
        <Skeleton className="mt-2 h-13 w-48 bg-navy-800" />
      </Container>
    </Section>
  );
}

/**
 * Shown while the homepage is not published yet (nothing unverified is ever displayed). It is a
 * deliberate, branded holding state — no company claims, only what the settings publish.
 */
function HomeUnpublished({ site }) {
  const contact = site?.contact;
  const email = contact?.emails?.[0]?.address;
  return (
    <Section background="dark" spacing="none" aria-labelledby="home-pending-heading">
      <div className="relative isolate overflow-hidden pt-[calc(var(--header-h)+80px)] pb-24 lg:pb-32">
        <div aria-hidden="true" className="hero-backdrop hero-backdrop-dark" />
        <Container className="relative grid items-center gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Eyebrow>Coming soon</Eyebrow>
            <h1 id="home-pending-heading" className="max-w-[18ch] text-h1 font-extrabold">
              Our new website is being prepared
            </h1>
            <p className="max-w-[52ch] text-lead text-fg-muted">
              The content is being reviewed and will be published here shortly.
              {email && (
                <>
                  {' '}
                  In the meantime you can reach us at{' '}
                  <a className="link-inline" href={`mailto:${email}`}>
                    {email}
                  </a>
                  .
                </>
              )}
            </p>
          </div>
          <div className="hidden justify-end lg:col-span-5 lg:flex">
            <BitGrid pattern={HERO_PATTERN} cell={18} gap={9} animate highlightRows={[1, 6]} />
          </div>
        </Container>
      </div>
    </Section>
  );
}

/** The public homepage: the published `home` page, rendered section by section (D-008). */
export function HomePage() {
  const { data: site } = useSite();
  const page = usePage('home', '/');
  const sections = page.data?.sections ?? [];
  const first = firstVisible(sections);
  const darkHero = first?.type === 'hero' && first?.variant?.background === 'dark';
  useOverlayHeader(page.isPending || page.data === null || darkHero);
  useDocumentTitle(page.data?.seo?.title || page.data?.title, site?.seo?.titleTemplate);

  if (page.isPending) return <HomeLoading />;
  if (page.isError) {
    return (
      <Section background="muted">
        <Container>
          <h1 className="sr-only">Home</h1>
          <ErrorState onRetry={() => page.refetch()} />
        </Container>
      </Section>
    );
  }
  if (page.data === null || !first) return <HomeUnpublished site={site} />;
  return (
    <>
      {first.type !== 'hero' && <h1 className="sr-only">{page.data.title}</h1>}
      <SectionList sections={sections} />
    </>
  );
}
