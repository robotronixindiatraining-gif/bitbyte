import { ArrowRight } from 'lucide-react';
import { cx } from './cx.js';
import { SmartLink } from './SmartLink.jsx';

const VARIANTS = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
  secondary: 'border border-border-strong text-fg hover:border-fg hover:bg-fg/5',
  ghost: 'text-link hover:text-link-hover px-1',
};
const SIZES = {
  sm: 'min-h-9 px-3.5 text-small gap-1.5',
  md: 'min-h-11 px-5 text-body gap-2',
  lg: 'min-h-13 px-6 text-body gap-2',
};

/**
 * Button (§8). Renders a link when given `href`, otherwise a <button>. Surface-aware through the
 * semantic tokens, so it works on light, muted and dark sections unchanged.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  href,
  openInNewTab,
  arrow = false,
  block = false,
  className,
  children,
  type = 'button',
  ...rest
}) {
  const classes = cx(
    'group inline-flex items-center justify-center rounded-md font-semibold whitespace-nowrap',
    'transition-colors duration-150 ease-out motion-safe:active:scale-[0.98]',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    variant === 'ghost' ? 'min-h-11' : SIZES[size],
    block && 'w-full',
    className,
  );
  const content = (
    <>
      {children}
      {arrow && (
        <ArrowRight aria-hidden="true" className="group-hover-nudge size-[1.1em] shrink-0" />
      )}
    </>
  );
  if (href !== undefined) {
    return (
      <SmartLink href={href} openInNewTab={openInNewTab} className={classes} {...rest}>
        {content}
      </SmartLink>
    );
  }
  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  );
}

/** Renders a CMS link object `{ label, href, external, openInNewTab }` as a button. */
export function LinkButton({ link, ...props }) {
  if (!link?.href || !link?.label) return null;
  return (
    <Button href={link.href} openInNewTab={link.openInNewTab} {...props}>
      {link.label}
    </Button>
  );
}
