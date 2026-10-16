import { ArrowRight } from 'lucide-react';
import { BitGrid } from '../components/ui/BitGrid.jsx';
import { Card, STRETCHED_LINK } from '../components/ui/Card.jsx';
import { cx } from '../components/ui/cx.js';
import { IconTile } from '../components/ui/Icon.jsx';
import { Reveal } from '../components/ui/Reveal.jsx';
import { Container } from '../components/ui/Section.jsx';
import { SmartLink } from '../components/ui/SmartLink.jsx';
import { SectionHeader } from '../components/ui/Typography.jsx';

/**
 * Bento placement on the 3-column grid (lg): the first card spans two columns beside one
 * standard card, then rows of three; the last card stretches so no row ends with a gap.
 * On md (2 columns) the first card spans the row and an odd last card stretches.
 */
export function bentoSpan(index, count) {
  const classes = [];
  const last = index === count - 1;
  if (index === 0) classes.push(count === 1 ? 'md:col-span-2 lg:col-span-3' : 'md:col-span-2');
  if (index > 0 && last) {
    if ((count - 1) % 2 === 1) classes.push('md:col-span-2 lg:col-span-1');
    const rest = (count - 2) % 3;
    if (count > 2 && rest === 1) classes.push('lg:col-span-3');
    if (count > 2 && rest === 2) classes.push('lg:col-span-2');
  }
  return classes.join(' ');
}

const FEATURE_PATTERN = ['00000000', '01000010', '00000000', '00011000', '00000000'];

function ServiceCard({ item, featured, level }) {
  const Title = `h${level + 1}`;
  return (
    <Card
      interactive
      className={cx('h-full', featured && 'lg:flex-row lg:items-center lg:gap-10 lg:p-10')}
    >
      <div className="flex flex-1 flex-col gap-4">
        <IconTile name={item.icon ?? 'layers'} />
        <Title className={cx('font-display font-bold text-fg', featured ? 'text-h3' : 'text-h4')}>
          <SmartLink href={item.path} className={STRETCHED_LINK}>
            {item.title}
          </SmartLink>
        </Title>
        {item.summary && (
          <p className={cx('text-fg-muted', featured ? 'max-w-[44ch] text-lead' : 'line-clamp-3')}>
            {item.summary}
          </p>
        )}
        <span
          aria-hidden="true"
          className="mt-auto inline-flex items-center gap-2 pt-2 text-small font-semibold text-link"
        >
          Explore service
          <ArrowRight className="group-hover-nudge size-4" />
        </span>
      </div>
      {featured && (
        <div aria-hidden="true" className="hidden shrink-0 rounded-lg bg-neutral-50 p-6 lg:block">
          <BitGrid pattern={FEATURE_PATTERN} cell={14} gap={7} highlightRows={[1]} />
        </div>
      )}
    </Card>
  );
}

function ServiceList({ items, level }) {
  const Title = `h${level + 1}`;
  return (
    <ol className="divide-y divide-border border-y border-border" role="list">
      {items.map((item, index) => (
        <li
          key={`${item.slug}-${index}`}
          className="group relative flex items-center gap-6 py-6 sm:gap-10"
        >
          <span aria-hidden="true" className="w-8 shrink-0 font-mono text-small text-fg-subtle">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-8">
            <Title className="text-h4 font-semibold sm:w-1/3">
              <SmartLink href={item.path} className={STRETCHED_LINK}>
                {item.title}
              </SmartLink>
            </Title>
            {item.summary && <p className="flex-1 text-fg-muted">{item.summary}</p>}
          </div>
          <ArrowRight aria-hidden="true" className="group-hover-nudge size-5 shrink-0 text-link" />
        </li>
      ))}
    </ol>
  );
}

/** Services grid: bento (§9.2) or a numbered editorial list. Items are published services only. */
export function ServiceGridSection({ data, level, headingId }) {
  const items = data.items ?? [];
  return (
    <Container className="flex flex-col gap-12">
      <SectionHeader
        heading={data.heading}
        intro={data.intro}
        level={level}
        id={headingId}
        eyebrow="Services"
      />
      {data.layout === 'list' ? (
        <ServiceList items={items} level={level} />
      ) : (
        <ul
          role="list"
          className="grid gap-5 md:grid-cols-2 lg:auto-rows-fr lg:grid-cols-3 lg:gap-6"
        >
          {items.map((item, index) => (
            <Reveal
              as="li"
              key={`${item.slug}-${index}`}
              index={index}
              className={bentoSpan(index, items.length)}
            >
              <ServiceCard item={item} featured={index === 0 && items.length > 1} level={level} />
            </Reveal>
          ))}
        </ul>
      )}
    </Container>
  );
}
