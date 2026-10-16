import { BitGrid, BYTE_B, HERO_PATTERN } from '../components/ui/BitGrid.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import { cx } from '../components/ui/cx.js';
import { ResponsiveImage } from '../components/ui/ResponsiveImage.jsx';
import { Container } from '../components/ui/Section.jsx';
import { Eyebrow, Heading } from '../components/ui/Typography.jsx';

const MOBILE_STRIP = ['00000000', BYTE_B, '00000000'];

/** Splits the heading so the CMS `highlight` phrase is accented (or appended on its own line). */
function HeadingText({ heading, highlight }) {
  if (!highlight) return heading;
  const at = heading.toLowerCase().indexOf(highlight.toLowerCase());
  if (at < 0) {
    return (
      <>
        {heading} <span className="text-highlight">{highlight}</span>
      </>
    );
  }
  return (
    <>
      {heading.slice(0, at)}
      <span className="text-highlight">{heading.slice(at, at + highlight.length)}</span>
      {heading.slice(at + highlight.length)}
    </>
  );
}

/**
 * Hero (§9.1). The signature BitGrid composition — rows of eight cells, one byte each, with the
 * two highlighted rows reading 01000010 ("B") — sits beside an editorial headline. The grid is
 * inline SVG (no network image), so the headline text stays the LCP element.
 */
export function HeroSection({ data, level, headingId, isFirst, background }) {
  const dark = background === 'dark';
  const imageVisual = data.visual === 'image' && data.image?.url;
  return (
    <div
      className={cx(
        'relative isolate overflow-hidden',
        isFirst
          ? 'pt-[calc(var(--header-h)+56px)] lg:pt-[calc(var(--header-h)+96px)]'
          : 'pt-20 lg:pt-28',
        'pb-20 lg:pb-28',
      )}
    >
      <div
        aria-hidden="true"
        className={cx('hero-backdrop', dark ? 'hero-backdrop-dark' : 'hero-backdrop-light')}
      />
      <Container className="relative grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-6 lg:col-span-7">
          {!imageVisual && (
            <BitGrid pattern={MOBILE_STRIP} cell={10} gap={5} animate className="lg:hidden" />
          )}
          <Eyebrow>{data.eyebrow}</Eyebrow>
          <Heading
            level={level}
            size={level === 1 ? 'display' : 'h1'}
            id={headingId}
            className="max-w-[18ch]"
          >
            <HeadingText heading={data.heading} highlight={data.highlight} />
          </Heading>
          {data.subheading && (
            <p className="max-w-[56ch] text-lead text-fg-muted">{data.subheading}</p>
          )}
          {(data.primaryCta || data.secondaryCta) && (
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <LinkButton link={data.primaryCta} size="lg" arrow className="w-full sm:w-auto" />
              <LinkButton
                link={data.secondaryCta}
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto"
              />
            </div>
          )}
        </div>
        <div className="lg:col-span-5">
          {imageVisual ? (
            <ResponsiveImage
              image={data.image}
              priority={isFirst}
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="rounded-xl border border-border shadow-lg"
            />
          ) : (
            <div className="relative hidden justify-end lg:flex">
              <div className="relative rounded-xl border border-border bg-surface/40 p-10 shadow-glow backdrop-blur-[2px]">
                <BitGrid pattern={HERO_PATTERN} cell={20} gap={10} animate highlightRows={[1, 6]} />
                <div
                  aria-hidden="true"
                  className="mt-6 flex justify-between font-mono text-[0.6875rem] tracking-[0.2em] text-fg-subtle"
                >
                  <span>8 BITS</span>
                  <span>1 BYTE</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
