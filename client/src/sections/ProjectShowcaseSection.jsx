import { useMemo, useState } from 'react';
import { Badge, Card, STRETCHED_LINK } from '../components/ui/Card.jsx';
import { cx } from '../components/ui/cx.js';
import { ResponsiveImage } from '../components/ui/ResponsiveImage.jsx';
import { Container } from '../components/ui/Section.jsx';
import { SmartLink } from '../components/ui/SmartLink.jsx';
import { SectionHeader } from '../components/ui/Typography.jsx';

function ProjectCard({ item, level, wide }) {
  const Title = `h${level + 1}`;
  return (
    <Card
      interactive
      flush
      className={cx('h-full overflow-hidden', wide && 'lg:grid lg:grid-cols-[3fr_2fr]')}
    >
      <ResponsiveImage
        image={item.cover}
        ratio="16 / 10"
        sizes={wide ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 768px) 50vw, 100vw'}
        className="border-b border-border lg:[.grid>&]:border-r lg:[.grid>&]:border-b-0"
        imgClassName="transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
      />
      <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7 lg:justify-center">
        <div className="flex flex-wrap items-center gap-2">
          {item.category && <Badge>{item.category.name}</Badge>}
          {item.year && <span className="font-mono text-small text-fg-subtle">{item.year}</span>}
        </div>
        <Title className={cx('font-display font-bold text-fg', wide ? 'text-h3' : 'text-h4')}>
          <SmartLink href={item.path} className={STRETCHED_LINK}>
            {item.title}
          </SmartLink>
        </Title>
        {item.summary && <p className="text-fg-muted">{item.summary}</p>}
        {item.technologies?.length > 0 && (
          <ul role="list" aria-label="Technologies" className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {item.technologies.map((tech, index) => (
              <li key={`${tech.slug}-${index}`}>
                <Badge tone="mono">{tech.name}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/**
 * Portfolio showcase (§9.4). Only projects with recorded client permission reach this component
 * (filtered by the server). Category filters are toggle buttons with a polite live summary.
 */
export function ProjectShowcaseSection({ data, level, headingId }) {
  const [category, setCategory] = useState(null);
  const items = useMemo(
    () => (data.items ?? []).filter((item) => !category || item.category?.slug === category),
    [data.items, category],
  );
  const categories = data.showFilters ? (data.categories ?? []) : [];
  const active = categories.find((c) => c.slug === category);
  const [first, ...rest] = items;
  const featureFirst = first?.featured && items.length > 1;

  const choose = (slug) => {
    const update = () => setCategory(slug);
    if (
      document.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      document.startViewTransition(update);
    } else update();
  };

  return (
    <Container className="flex flex-col gap-10">
      <SectionHeader
        heading={data.heading}
        intro={data.intro}
        level={level}
        id={headingId}
        eyebrow="Portfolio"
      />
      {categories.length > 1 && (
        <div className="flex flex-col gap-3">
          <div
            role="group"
            aria-label="Filter projects by category"
            className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {[{ slug: null, name: 'All' }, ...categories].map((option) => (
              <button
                key={option.slug ?? 'all'}
                type="button"
                aria-pressed={category === option.slug}
                onClick={() => choose(option.slug)}
                className="min-h-10 shrink-0 rounded-full border border-border px-4 text-small font-medium text-fg-body transition-colors hover:border-border-strong aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-fg"
              >
                {option.name}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="sr-only">
            Showing {items.length} {items.length === 1 ? 'project' : 'projects'}
            {active ? `: ${active.name}` : ''}
          </p>
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-fg-muted">No projects in this category yet.</p>
      ) : (
        <ul role="list" className="grid gap-6 md:grid-cols-2">
          {featureFirst && (
            <li className="md:col-span-2">
              <ProjectCard item={first} level={level} wide />
            </li>
          )}
          {(featureFirst ? rest : items).map((item) => (
            <li key={item.slug}>
              <ProjectCard item={item} level={level} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
