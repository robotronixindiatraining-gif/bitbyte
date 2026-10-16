import { cx } from '../components/ui/cx.js';
import { Container } from '../components/ui/Section.jsx';
import { Heading } from '../components/ui/Typography.jsx';

const LG_COLUMNS = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' };

/** Key figures (§9.5). Only figures the owner has verified can be published (placeholders block). */
export function StatsSection({ data, level, headingId }) {
  const items = data.items ?? [];
  return (
    <Container className="flex flex-col gap-10">
      {data.heading && (
        <Heading level={level} id={headingId} className="max-w-3xl">
          {data.heading}
        </Heading>
      )}
      <dl
        className={cx(
          'grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2',
          LG_COLUMNS[items.length],
        )}
      >
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex flex-col-reverse justify-end gap-2 bg-bg p-8"
          >
            <dt className="font-medium text-fg-body">
              {item.label}
              {item.footnote && (
                <span className="mt-1 block text-small text-fg-subtle">{item.footnote}</span>
              )}
            </dt>
            <dd className="font-display text-h1 font-extrabold text-fg">{item.value}</dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}
