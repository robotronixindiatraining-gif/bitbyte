import { BitGrid } from '../components/ui/BitGrid.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import { cx } from '../components/ui/cx.js';
import { Container } from '../components/ui/Section.jsx';
import { Heading } from '../components/ui/Typography.jsx';

const EDGE = ['00000001', '00000010', '00000101', '00001010', '00010101'];

/** Call-to-action panel (§9.5): a dark panel with a BitGrid edge accent, full-bleed on mobile. */
export function CtaBannerSection({ data, level, headingId, background }) {
  return (
    <Container className="max-sm:px-0">
      <div
        className={cx(
          'surface-dark relative overflow-hidden px-6 py-14 sm:rounded-xl sm:px-12 lg:px-16 lg:py-20',
          background === 'dark' && 'border border-border !bg-navy-900',
        )}
      >
        <div aria-hidden="true" className="hero-backdrop hero-backdrop-dark opacity-70" />
        <div aria-hidden="true" className="absolute top-8 right-8 hidden opacity-80 md:block">
          <BitGrid pattern={EDGE} cell={10} gap={6} />
        </div>
        <div className="relative flex max-w-2xl flex-col gap-5">
          <Heading level={level} id={headingId}>
            {data.heading}
          </Heading>
          {data.text && <p className="text-lead text-fg-muted">{data.text}</p>}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <LinkButton link={data.primaryCta} size="lg" arrow />
            <LinkButton link={data.secondaryCta} size="lg" variant="secondary" />
          </div>
        </div>
      </div>
    </Container>
  );
}
