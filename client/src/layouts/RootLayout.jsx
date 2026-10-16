import { useMemo, useState } from 'react';
import { Outlet } from 'react-router';
import { cx } from '../components/ui/cx.js';
import { PageChromeContext } from './pageChrome.js';
import { SiteFooter } from './SiteFooter.jsx';
import { SiteHeader } from './SiteHeader.jsx';

/** Public layout: skip link → header → main → footer (landmarks per §11). */
export function RootLayout() {
  const [overlayHeader, setOverlayHeader] = useState(false);
  const chrome = useMemo(() => ({ setOverlayHeader }), []);
  return (
    <PageChromeContext.Provider value={chrome}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-neutral-0 focus:px-4 focus:py-3 focus:font-semibold focus:text-accent-700 focus:shadow-md"
      >
        Skip to content
      </a>
      <SiteHeader overlay={overlayHeader} />
      <main
        id="main"
        tabIndex={-1}
        className={cx('min-h-[60vh] outline-none', !overlayHeader && 'pt-(--header-h)')}
      >
        <Outlet />
      </main>
      <SiteFooter />
    </PageChromeContext.Provider>
  );
}
