import { cx } from '../components/ui/cx.js';
import { IconTile } from '../components/ui/Icon.jsx';
import { Reveal } from '../components/ui/Reveal.jsx';
import { Container } from '../components/ui/Section.jsx';
import { SectionHeader } from '../components/ui/Typography.jsx';

const COLUMNS = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 lg:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4',
};

/** Icon + title + text grid (§9.5); 2–4 columns from the CMS. */
export function FeatureListSection({ data, level, headingId, background }) {
  const Title = `h${level + 1}`;
  return (
    <Container className="flex flex-col gap-12">
      <SectionHeader heading={data.heading} intro={data.intro} level={level} id={headingId} />
      <ul role="list" className={cx('grid gap-5', COLUMNS[data.columns ?? 3] ?? COLUMNS[3])}>
        {(data.items ?? []).map((item, index) => (
          <Reveal
            as="li"
            key={`${item.title}-${index}`}
            index={index}
            className={cx(
              'flex flex-col gap-4 rounded-lg border border-border bg-surface p-7',
              background === 'dark' && 'transition-shadow duration-200 hover:shadow-glow',
            )}
          >
            {item.icon && <IconTile name={item.icon} />}
            <Title className="text-h4 font-semibold">{item.title}</Title>
            <p className="text-fg-muted">{item.text}</p>
          </Reveal>
        ))}
      </ul>
    </Container>
  );
}
