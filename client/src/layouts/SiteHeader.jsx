import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { LinkButton } from '../components/ui/Button.jsx';
import { cx } from '../components/ui/cx.js';
import { isCurrentPath } from '../components/ui/links.js';
import { SmartLink } from '../components/ui/SmartLink.jsx';
import { FALLBACK_BRAND, Wordmark } from '../components/ui/Wordmark.jsx';
import { useServices, useSite } from '../features/content/queries.js';
import { MegaMenu } from './MegaMenu.jsx';
import { MobileNav } from './MobileNav.jsx';
import { buildNavigation } from './navigation.js';

const SCROLL_THRESHOLD = 16;

/**
 * Fixed site header (§9.6). Over a dark hero it starts transparent with light text and turns
 * solid after 16 px of scrolling; elsewhere it is always solid. Navigation is built only from
 * the published settings (nothing hard-coded, nothing unpublished).
 */
export function SiteHeader({ overlay = false }) {
  const { data: site } = useSite();
  const { data: services } = useServices();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const nav = buildNavigation(site?.navigation, services);
  const transparent = overlay && !scrolled;
  const brand = site?.general?.companyName || FALLBACK_BRAND;

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-40 h-(--header-h) transition-[background-color,border-color,box-shadow] duration-200',
        transparent
          ? 'surface-dark border-b border-transparent'
          : 'surface-light border-b border-border shadow-sm backdrop-blur-md',
      )}
      style={{ backgroundColor: transparent ? 'transparent' : 'rgb(255 255 255 / 0.92)' }}
    >
      <div className="container-site flex h-full items-center justify-between gap-6">
        <Link
          to="/"
          className="-mx-1 inline-flex min-h-11 items-center rounded-md px-1"
          aria-label={`${brand} — home`}
        >
          <Wordmark general={site?.general} />
        </Link>
        {nav.header.length > 0 && (
          <nav aria-label="Main" className="hidden lg:block">
            <ul role="list" className="flex items-center gap-1">
              {nav.header.map((item, index) => (
                <li key={`${item.href}-${index}`}>
                  {item.children.length > 0 ? (
                    <MegaMenu item={item} />
                  ) : (
                    <SmartLink
                      href={item.href}
                      openInNewTab={item.openInNewTab}
                      aria-current={isCurrentPath(item.href, pathname) ? 'page' : undefined}
                      className="nav-link"
                    >
                      {item.label}
                    </SmartLink>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="flex items-center gap-2">
          {nav.cta && (
            <span className="hidden sm:block">
              <LinkButton link={nav.cta} size="sm" />
            </span>
          )}
          <MobileNav nav={nav} contact={site?.contact} general={site?.general} />
        </div>
      </div>
    </header>
  );
}
