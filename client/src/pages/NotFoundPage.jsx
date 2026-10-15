import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-5 py-20 sm:px-8">
      <p className="font-mono text-xs tracking-[0.12em] text-accent-700 uppercase">Error 404</p>
      <h1 className="text-4xl font-bold tracking-tight">Page not found</h1>
      <p className="text-lg text-neutral-600">The page you are looking for does not exist.</p>
      <p>
        <Link className="text-accent-600 underline underline-offset-4 hover:text-accent-700" to="/">
          Go to the homepage
        </Link>
      </p>
    </section>
  );
}
