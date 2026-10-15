import { Outlet } from 'react-router';

export function RootLayout() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-neutral-0 focus:px-4 focus:py-2 focus:text-accent-700 focus:shadow-md"
      >
        Skip to content
      </a>
      <main id="main" className="min-h-dvh">
        <Outlet />
      </main>
    </>
  );
}
