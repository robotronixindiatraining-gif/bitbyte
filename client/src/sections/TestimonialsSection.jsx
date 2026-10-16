import { Quote } from 'lucide-react';
import { cx } from '../components/ui/cx.js';
import { ResponsiveImage } from '../components/ui/ResponsiveImage.jsx';
import { Container } from '../components/ui/Section.jsx';
import { SmartLink } from '../components/ui/SmartLink.jsx';
import { SectionHeader } from '../components/ui/Typography.jsx';

/**
 * Testimonials (§9.5): editorial quotes in a static grid (no carousel). Only testimonials with
 * recorded consent are delivered by the server; the section is hidden when there are none.
 */
export function TestimonialsSection({ data, level, headingId }) {
  const items = data.items ?? [];
  const single = items.length === 1;
  return (
    <Container className="flex flex-col gap-12">
      <SectionHeader heading={data.heading} level={level} id={headingId} eyebrow="Testimonials" />
      <ul role="list" className={cx('grid gap-6', !single && 'lg:grid-cols-2')}>
        {items.map((item, index) => (
          <li key={`${item.authorName}-${index}`}>
            <figure
              className={cx(
                'flex h-full flex-col gap-6 rounded-xl border border-border bg-surface p-8 sm:p-10',
                single && 'max-w-4xl',
              )}
            >
              <Quote aria-hidden="true" className="size-9 text-highlight" strokeWidth={1.5} />
              <blockquote
                className={cx('font-display font-semibold text-fg', single ? 'text-h3' : 'text-h4')}
              >
                <p>{item.quote}</p>
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-4">
                {item.photo?.url && (
                  <ResponsiveImage
                    image={{ ...item.photo, alt: '' }}
                    ratio="1 / 1"
                    sizes="48px"
                    className="size-12 shrink-0 rounded-full"
                  />
                )}
                <span className="flex flex-col">
                  <span className="font-semibold text-fg">{item.authorName}</span>
                  <span className="text-small text-fg-subtle">
                    {[item.authorRole, item.company].filter(Boolean).join(', ')}
                  </span>
                  {item.project?.path && (
                    <SmartLink href={item.project.path} className="link-inline text-small">
                      {item.project.title}
                    </SmartLink>
                  )}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Container>
  );
}
