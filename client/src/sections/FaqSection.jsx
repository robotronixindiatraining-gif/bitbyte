import { Disclosure } from '../components/ui/Disclosure.jsx';
import { Container } from '../components/ui/Section.jsx';
import { SectionHeader } from '../components/ui/Typography.jsx';

/** FAQ accordion (§9.5): each question is a heading containing a disclosure button. */
export function FaqSection({ data, level, headingId }) {
  return (
    <Container className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
      <SectionHeader heading={data.heading} level={level} id={headingId} eyebrow="FAQ" />
      <div className="border-t border-border">
        {(data.items ?? []).map((item, index) => (
          <Disclosure
            key={`${item.question}-${index}`}
            summary={item.question}
            headingLevel={Math.min(level + 1, 6)}
            className="border-b border-border"
            buttonClassName="min-h-14 text-h4"
          >
            <div className="prose-site pb-6" dangerouslySetInnerHTML={{ __html: item.answer }} />
          </Disclosure>
        ))}
      </div>
    </Container>
  );
}
