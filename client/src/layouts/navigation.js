/**
 * Navigation comes ONLY from the published `navigation` settings (links to unpublished pages are
 * already dropped by the server). Children of a menu item that match published services are
 * enriched with the service's icon and summary for the mega-panel.
 */
export function buildNavigation(navigation, services) {
  const byPath = new Map((services ?? []).map((service) => [service.path, service]));
  const header = (navigation?.header ?? [])
    .filter((item) => item?.href && item?.label)
    .map((item) => ({
      ...item,
      children: (item.children ?? [])
        .filter((child) => child?.href && child?.label)
        .map((child) => {
          const service = byPath.get(child.href);
          return { ...child, icon: service?.icon ?? null, summary: service?.summary ?? null };
        }),
    }));
  return { header, cta: navigation?.cta?.href ? navigation.cta : null };
}

/** WhatsApp chat link for a phone flagged as WhatsApp in the contact settings. */
export function whatsappHref(number) {
  const digits = String(number ?? '').replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

export function telHref(number) {
  const cleaned = String(number ?? '').replace(/[^\d+]/g, '');
  return cleaned.length >= 6 ? `tel:${cleaned}` : null;
}
