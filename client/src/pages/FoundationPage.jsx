import { ApiHealthStatus } from '../features/system/ApiHealthStatus.jsx';

/**
 * Temporary Stage 03 page confirming the client and API run together.
 * It contains no business content and is replaced by the CMS-driven homepage in Stage 07.
 */
export function FoundationPage() {
  return (
    <section className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-5 py-20 sm:px-8">
      <p className="font-mono text-xs tracking-[0.12em] text-accent-700 uppercase">
        Stage 03 · Project foundation
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Website foundation</h1>
      <p className="max-w-[68ch] text-lg text-neutral-600">
        The new website is under construction. This page confirms that the client application is
        running and can reach the API.
      </p>
      <div>
        <ApiHealthStatus />
      </div>
    </section>
  );
}
