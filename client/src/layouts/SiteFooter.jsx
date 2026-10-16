import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import { BitGrid } from '../components/ui/BitGrid.jsx';
import { SmartLink } from '../components/ui/SmartLink.jsx';
import { Wordmark } from '../components/ui/Wordmark.jsx';
import { useSite } from '../features/content/queries.js';
import { telHref } from './navigation.js';

const SOCIAL_LABELS = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  youtube: 'YouTube',
  github: 'GitHub',
  whatsapp: 'WhatsApp',
};
const EDGE = ['01000010', '00100100', '01000010'];
const LINK = 'inline-flex min-h-10 items-center text-fg-body transition-colors hover:text-fg';

/**
 * Site footer (§9.8). Every value comes from published settings: link columns, contact details
 * and social profiles appear only once they are published, so nothing unverified is shown.
 */
export function SiteFooter() {
  const { data: site } = useSite();
  const footer = site?.footer;
  const contact = footer?.showContact !== false ? site?.contact : null;
  const profiles = site?.social?.profiles ?? [];
  const year = new Date().getFullYear();

  return (
    <footer className="surface-dark relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute top-0 right-10 opacity-60">
        <BitGrid pattern={EDGE} cell={6} gap={4} />
      </div>
      <div className="container-site grid gap-12 pt-20 pb-12 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-5">
          <Wordmark general={site?.general} />
          {site?.general?.tagline && (
            <p className="max-w-[36ch] text-fg-muted">{site.general.tagline}</p>
          )}
          {profiles.length > 0 && (
            <ul role="list" aria-label="Social media" className="flex flex-wrap gap-2">
              {profiles.map((profile, index) => (
                <li key={`${profile.url}-${index}`}>
                  <SmartLink
                    href={profile.url}
                    openInNewTab
                    className="inline-flex min-h-10 items-center gap-1 rounded-full border border-border px-3 text-small text-fg-body hover:border-border-strong hover:text-fg"
                  >
                    {SOCIAL_LABELS[profile.platform] ?? profile.platform}
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </SmartLink>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(footer?.columns ?? []).map((column, index) => (
          <nav key={`${column.heading}-${index}`} aria-label={column.heading}>
            <h2 className="mb-3 font-mono text-eyebrow font-medium text-fg-subtle uppercase">
              {column.heading}
            </h2>
            <ul role="list">
              {column.links.map((link, index) => (
                <li key={`${link.href}-${index}`}>
                  <SmartLink href={link.href} openInNewTab={link.openInNewTab} className={LINK}>
                    {link.label}
                  </SmartLink>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {contact && (
          <div>
            <h2 className="mb-3 font-mono text-eyebrow font-medium text-fg-subtle uppercase">
              Contact
            </h2>
            <address className="flex flex-col gap-3 not-italic">
              {contact.addressLines?.length > 0 && (
                <p className="flex gap-3 text-fg-body">
                  <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-link" />
                  <span>
                    {contact.addressLines.join(', ')}
                    {[contact.city, contact.region, contact.postalCode].filter(Boolean).length >
                      0 && (
                      <>
                        <br />
                        {[contact.city, contact.region, contact.postalCode]
                          .filter(Boolean)
                          .join(', ')}
                      </>
                    )}
                  </span>
                </p>
              )}
              {(contact.phones ?? []).map((phone, index) => (
                <p key={`${phone.number}-${index}`} className="flex items-center gap-3">
                  <Phone aria-hidden="true" className="size-4 shrink-0 text-link" />
                  <SmartLink href={telHref(phone.number)} className={LINK}>
                    <span className="sr-only">{phone.label}: </span>
                    {phone.number}
                  </SmartLink>
                </p>
              ))}
              {(contact.emails ?? []).map((email, index) => (
                <p key={`${email.address}-${index}`} className="flex items-center gap-3">
                  <Mail aria-hidden="true" className="size-4 shrink-0 text-link" />
                  <SmartLink href={`mailto:${email.address}`} className={`${LINK} break-all`}>
                    <span className="sr-only">{email.label}: </span>
                    {email.address}
                  </SmartLink>
                </p>
              ))}
            </address>
          </div>
        )}
      </div>
      <div className="border-t border-border">
        <div className="container-site flex flex-col gap-3 py-6 text-small text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>{footer?.copyrightHolder ? `© ${year} ${footer.copyrightHolder}` : null}</p>
          {(footer?.bottomLinks ?? []).length > 0 && (
            <ul role="list" className="flex flex-wrap gap-x-5">
              {footer.bottomLinks.map((link, index) => (
                <li key={`${link.href}-${index}`}>
                  <SmartLink
                    href={link.href}
                    className="inline-flex min-h-10 items-center hover:text-fg"
                  >
                    {link.label}
                  </SmartLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
