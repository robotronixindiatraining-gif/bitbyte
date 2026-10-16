import { cx } from './cx.js';

/**
 * Card (§8). `interactive` cards contain exactly one stretched link (the title link covers the
 * card via ::after), so the card has one accessible name and no nested interactive elements.
 */
export function Card({
  interactive = false,
  flush = false,
  className,
  children,
  as: Tag = 'article',
}) {
  return (
    <Tag
      className={cx(
        'relative flex flex-col rounded-lg border border-border bg-surface',
        !flush && 'p-6 sm:p-7',
        interactive &&
          'group hover-lift focus-within:border-link hover:border-accent-300 [.surface-dark_&]:hover:border-accent-400/40',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Classes for the one link inside an interactive card. */
export const STRETCHED_LINK =
  'after:absolute after:inset-0 after:rounded-lg after:content-[""] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus';

export function Badge({ tone = 'accent', className, children }) {
  if (!children) return null;
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-small font-medium',
        tone === 'accent' && 'bg-tile text-tile-fg',
        tone === 'neutral' && 'border border-border text-fg-muted',
        tone === 'mono' &&
          'border border-border font-mono text-[0.75rem] tracking-wide text-fg-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}
