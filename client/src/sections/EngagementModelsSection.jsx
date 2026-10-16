import { Check } from 'lucide-react';
import { Badge } from '../components/ui/Card.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import { cx } from '../components/ui/cx.js';
import { Container } from '../components/ui/Section.jsx';
import { SectionHeader } from '../components/ui/Typography.jsx';

const COLUMNS = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 lg:grid-cols-3',
  4: 'md:grid-cols-2 xl:grid-cols-4',
};

/** Engagement models (§9.5): 1–4 cards; a price is shown only when the CMS provides one. */
export function EngagementModelsSection({ data, level, headingId }) {
  const models = data.models ?? [];
  const Title = `h${level + 1}`;
  return (
    <Container className="flex flex-col gap-12">
      <SectionHeader heading={data.heading} intro={data.intro} level={level} id={headingId} />
      <ul role="list" className={cx('grid gap-6', COLUMNS[models.length])}>
        {models.map((model, index) => (
          <li
            key={`${model.name}-${index}`}
            className={cx(
              'relative flex flex-col gap-5 rounded-xl border bg-surface p-8',
              model.highlighted ? 'border-primary shadow-md ring-1 ring-primary' : 'border-border',
            )}
          >
            {model.highlighted && <Badge className="self-start">Recommended</Badge>}
            <Title className="text-h3 font-bold">{model.name}</Title>
            {model.priceDisplay && (
              <p className="font-display text-h4 font-semibold text-fg">{model.priceDisplay}</p>
            )}
            <p className="text-fg-muted">{model.description}</p>
            {model.features?.length > 0 && (
              <ul role="list" className="flex flex-col gap-2.5 border-t border-border pt-5">
                {model.features.map((feature, featureIndex) => (
                  <li key={`${feature}-${featureIndex}`} className="flex gap-3 text-fg-body">
                    <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-highlight" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}
            <LinkButton
              link={model.cta}
              variant={model.highlighted ? 'primary' : 'secondary'}
              block
              className="mt-auto"
            />
          </li>
        ))}
      </ul>
    </Container>
  );
}
