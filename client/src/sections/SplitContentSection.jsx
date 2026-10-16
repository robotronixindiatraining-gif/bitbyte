import { LinkButton } from '../components/ui/Button.jsx';
import { cx } from '../components/ui/cx.js';
import { ResponsiveImage } from '../components/ui/ResponsiveImage.jsx';
import { Container } from '../components/ui/Section.jsx';
import { Heading } from '../components/ui/Typography.jsx';

/** Image + text (§9.5); the image comes first on mobile and on the chosen side on desktop. */
export function SplitContentSection({ data, level, headingId }) {
  const imageRight = data.imagePosition === 'right';
  return (
    <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {data.image?.url && (
        <ResponsiveImage
          image={data.image}
          ratio="4 / 3"
          sizes="(min-width: 1024px) 50vw, 100vw"
          className={cx('rounded-xl border border-border shadow-md', imageRight && 'lg:order-2')}
        />
      )}
      <div className={cx('flex flex-col gap-6', !data.image?.url && 'lg:col-span-2 lg:max-w-3xl')}>
        <Heading level={level} id={headingId}>
          {data.heading}
        </Heading>
        {data.body && (
          <div className="prose-site" dangerouslySetInnerHTML={{ __html: data.body }} />
        )}
        {data.cta && (
          <LinkButton link={data.cta} variant="secondary" arrow className="self-start" />
        )}
      </div>
    </Container>
  );
}
