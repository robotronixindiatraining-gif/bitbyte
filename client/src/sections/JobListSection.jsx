import { ArrowRight, MapPin } from 'lucide-react';
import { Badge, Card, STRETCHED_LINK } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/States.jsx';
import { Container } from '../components/ui/Section.jsx';
import { SmartLink } from '../components/ui/SmartLink.jsx';
import { SectionHeader } from '../components/ui/Typography.jsx';

export const EMPLOYMENT_TYPES = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  internship: 'Internship',
  contract: 'Contract',
};

/** Open positions (§9.5); the CMS empty-state text is shown when none are open. */
export function JobListSection({ data, level, headingId }) {
  const items = data.items ?? [];
  const Title = `h${level + 1}`;
  return (
    <Container className="flex flex-col gap-10">
      <SectionHeader
        heading={data.heading}
        intro={data.intro}
        level={level}
        id={headingId}
        eyebrow="Careers"
      />
      {items.length === 0 ? (
        <EmptyState>{data.emptyText}</EmptyState>
      ) : (
        <ul role="list" className="grid gap-4">
          {items.map((job) => (
            <li key={job.slug}>
              <Card interactive className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2">
                  <Title className="text-h4 font-semibold">
                    <SmartLink href={job.path} className={STRETCHED_LINK}>
                      {job.title}
                    </SmartLink>
                  </Title>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-fg-muted">
                    <Badge>{EMPLOYMENT_TYPES[job.employmentType] ?? job.employmentType}</Badge>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin aria-hidden="true" className="size-4" />
                      {job.location}
                    </span>
                    {job.experience && <span>{job.experience}</span>}
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="inline-flex items-center gap-2 text-small font-semibold text-link"
                >
                  View role
                  <ArrowRight className="group-hover-nudge size-4" />
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
