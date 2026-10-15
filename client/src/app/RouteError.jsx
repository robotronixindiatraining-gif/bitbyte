import { useRouteError } from 'react-router';

/** Fallback for unexpected rendering errors. Details go to the console, never to the page. */
export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <section className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-4 px-5 py-20 sm:px-8">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="text-neutral-600">
        Please reload the page. If the problem continues, try again later.
      </p>
    </section>
  );
}
