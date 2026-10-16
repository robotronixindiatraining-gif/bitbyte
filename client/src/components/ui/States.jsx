import { RefreshCw } from 'lucide-react';
import { BitGrid } from './BitGrid.jsx';
import { Button } from './Button.jsx';
import { cx } from './cx.js';

/** Content placeholder while data loads (announced once via the parent's aria-busy). */
export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-md bg-border', className)} />;
}

const EMPTY_PATTERN = ['00000000', '00100100', '00000000'];

/** Intentional empty state with a small BitGrid (§8). */
export function EmptyState({ title, children, className, action }) {
  return (
    <div
      className={cx(
        'flex flex-col items-start gap-4 rounded-lg border border-dashed border-border-strong p-8',
        className,
      )}
    >
      <BitGrid pattern={EMPTY_PATTERN} cell={8} gap={4} />
      {title && <p className="font-display text-h4 font-semibold text-fg">{title}</p>}
      {children && <div className="max-w-[60ch] text-fg-muted">{children}</div>}
      {action}
    </div>
  );
}

/** Error state: plain-language message and an optional retry. Never shows technical details. */
export function ErrorState({
  title = 'This content could not be loaded',
  children,
  onRetry,
  className,
}) {
  return (
    <div
      role="alert"
      className={cx(
        'flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-8',
        className,
      )}
    >
      <p className="font-display text-h4 font-semibold text-fg">{title}</p>
      <div className="max-w-[60ch] text-fg-muted">
        {children ?? 'Please check your connection and try again in a moment.'}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
