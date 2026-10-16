import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Skeleton } from '../components/ui/States.jsx';
import { Container } from '../components/ui/Section.jsx';
import { SmartLink } from '../components/ui/SmartLink.jsx';
import { SectionHeader } from '../components/ui/Typography.jsx';
import { useSite } from '../features/content/queries.js';
import { telHref } from '../layouts/navigation.js';

// The form (with the shared validation schema) loads only on pages that contain it.
const LeadForm = lazy(() => import('../features/leads/LeadForm.jsx'));

function ContactDetails({ contact }) {
  const address = [
    ...(contact.addressLines ?? []),
    [contact.city, contact.region, contact.postalCode].filter(Boolean).join(', '),
  ].filter(Boolean);
  const rows = [
    address.length > 0 && {
      icon: MapPin,
      label: 'Address',
      content: (
        <address className="not-italic">
          {address.map((line, i) => (
            <span key={`${line}-${i}`} className="block">
              {line}
            </span>
          ))}
        </address>
      ),
    },
    ...(contact.phones ?? []).map((phone) => ({
      icon: Phone,
      label: phone.label,
      content: (
        <SmartLink href={telHref(phone.number)} className="link-inline">
          {phone.number}
        </SmartLink>
      ),
    })),
    ...(contact.emails ?? []).map((email) => ({
      icon: Mail,
      label: email.label,
      content: (
        <SmartLink href={`mailto:${email.address}`} className="link-inline break-all">
          {email.address}
        </SmartLink>
      ),
    })),
    contact.hours && { icon: Clock, label: 'Hours', content: contact.hours },
  ].filter(Boolean);
  if (rows.length === 0) return null;
  return (
    <ul role="list" className="flex flex-col gap-5">
      {rows.map(({ icon: RowIcon, label, content }, index) => (
        <li key={`${label}-${index}`} className="flex gap-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-tile text-tile-fg">
            <RowIcon aria-hidden="true" className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-small text-fg-subtle">{label}</span>
            <div className="text-fg-body">{content}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Contact form section (§9.7): contact details from the published settings beside the enquiry
 * form. The form appears only when the contact-form settings and the Turnstile site key are
 * published (the server refuses submissions otherwise, D-051).
 */
export function ContactFormSection({ data, level, headingId }) {
  const { data: site } = useSite();
  const contact = data.showContactDetails === false ? null : site?.contact;
  const formReady = Boolean(site?.leadForm && site?.integrations?.turnstileSiteKey);
  return (
    <Container className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
      <div className="flex flex-col gap-8">
        <SectionHeader heading={data.heading} intro={data.intro} level={level} id={headingId} />
        {contact && <ContactDetails contact={contact} />}
      </div>
      <div className="self-start rounded-xl border border-border bg-surface p-6 shadow-md sm:p-10">
        {formReady ? (
          <Suspense
            fallback={
              <div aria-busy="true" className="flex flex-col gap-5">
                <Skeleton className="h-11" />
                <Skeleton className="h-11" />
                <Skeleton className="h-32" />
              </div>
            }
          >
            <LeadForm leadForm={site.leadForm} siteKey={site.integrations.turnstileSiteKey} />
          </Suspense>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-display text-h4 font-semibold text-fg">
              Online enquiries are not open yet
            </p>
            <p className="text-fg-muted">
              {contact
                ? 'Please use the contact details on this page in the meantime.'
                : 'Please check back soon.'}
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}
