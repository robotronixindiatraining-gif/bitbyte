import { Container } from '../components/ui/Section.jsx';
import { SectionHeader } from '../components/ui/Typography.jsx';

/** Numbered process (§9.5): vertical with a connecting line on small screens, horizontal on lg. */
export function ProcessStepsSection({ data, level, headingId }) {
  const steps = data.steps ?? [];
  const Title = `h${level + 1}`;
  return (
    <Container className="flex flex-col gap-12">
      <SectionHeader heading={data.heading} level={level} id={headingId} eyebrow="Process" />
      <ol
        role="list"
        className="relative grid gap-10 lg:grid-cols-[repeat(var(--steps),minmax(0,1fr))] lg:gap-6"
        style={{ '--steps': steps.length }}
      >
        {steps.map((step, index) => (
          <li key={`${step.title}-${index}`} className="relative flex gap-5 lg:flex-col lg:gap-5">
            <div className="relative flex flex-col items-center lg:flex-row lg:items-center">
              <span className="relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border-strong bg-bg font-mono text-small font-medium text-highlight">
                {String(index + 1).padStart(2, '0')}
              </span>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-11 bottom-[-2.5rem] left-1/2 w-px -translate-x-1/2 bg-border-strong lg:static lg:top-auto lg:h-px lg:w-auto lg:flex-1 lg:translate-x-0"
                />
              )}
            </div>
            <div className="flex flex-col gap-2 pt-2 lg:pt-0 lg:pr-4">
              <Title className="text-h4 font-semibold">{step.title}</Title>
              <p className="text-fg-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Container>
  );
}
