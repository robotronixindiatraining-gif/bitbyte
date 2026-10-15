import { plainText } from './html.js';

const EMPLOYMENT_TYPES = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  internship: 'INTERN',
  contract: 'CONTRACTOR',
};

/**
 * JSON-LD built ONLY from published CMS values (no invented facts). Missing values are left out.
 * @param {string} siteUrl absolute origin
 */
export function organizationLd(site, siteUrl) {
  const general = site.general;
  if (!general?.companyName) return null;
  const contact = site.contact;
  const address = contact?.addressLines?.length
    ? {
        '@type': 'PostalAddress',
        streetAddress: contact.addressLines.join(', '),
        ...(contact.city ? { addressLocality: contact.city } : {}),
        ...(contact.region ? { addressRegion: contact.region } : {}),
        ...(contact.postalCode ? { postalCode: contact.postalCode } : {}),
        ...(contact.country ? { addressCountry: contact.country } : {}),
      }
    : undefined;
  const sameAs = site.social?.profiles?.map((p) => p.url) ?? [];
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: general.companyName,
    legalName: general.legalName || undefined,
    url: siteUrl,
    logo: general.logo?.url ? absolute(general.logo.url, siteUrl) : undefined,
    address,
    telephone: contact?.phones?.[0]?.number,
    email: contact?.emails?.[0]?.address,
    sameAs: sameAs.length ? sameAs : undefined,
  });
}

export function serviceLd(service, site, siteUrl) {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.summary,
    url: service.seo?.canonical,
    provider: site.general?.companyName
      ? { '@type': 'Organization', name: site.general.companyName, url: siteUrl }
      : undefined,
  });
}

export function jobPostingLd(job, site, siteUrl) {
  if (!site.general?.companyName) return null;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: plainText(job.description) || job.summary,
    datePosted: job.postedAt ? new Date(job.postedAt).toISOString().slice(0, 10) : undefined,
    validThrough: job.closesAt ?? undefined,
    employmentType: EMPLOYMENT_TYPES[job.employmentType],
    hiringOrganization: {
      '@type': 'Organization',
      name: site.general.companyName,
      sameAs: siteUrl,
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location },
    },
  });
}

function absolute(url, siteUrl) {
  try {
    return new URL(url, siteUrl).href;
  } catch {
    return undefined;
  }
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
}
