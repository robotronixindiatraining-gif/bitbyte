import { cx } from './cx.js';

const SIZES = {
  display: 'text-display font-extrabold',
  h1: 'text-h1 font-extrabold',
  h2: 'text-h2 font-bold',
  h3: 'text-h3 font-bold',
  h4: 'text-h4 font-semibold',
};

/** Heading whose semantic level and visual size are independent (§3, §8). */
export function Heading({ level = 2, size, className, children, ...rest }) {
  const Tag = `h${Math.min(Math.max(level, 1), 6)}`;
  return (
    <Tag className={cx(SIZES[size ?? `h${Math.min(level, 4)}`], 'text-fg', className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Mono uppercase label above a heading ("SERVICES"). */
export function Eyebrow({ className, children, as: Tag = 'p' }) {
  if (!children) return null;
  return (
    <Tag
      className={cx(
        'flex items-center gap-2.5 font-mono text-eyebrow font-medium text-highlight uppercase',
        className,
      )}
    >
      <span aria-hidden="true" className="inline-flex gap-[3px]">
        <span className="size-1.5 rounded-[1px] bg-current" />
        <span className="size-1.5 rounded-[1px] bg-current opacity-40" />
      </span>
      {children}
    </Tag>
  );
}

export function Lead({ className, children }) {
  if (!children) return null;
  return <p className={cx('text-lead text-fg-muted', className)}>{children}</p>;
}

/** Eyebrow + heading + intro, used at the top of most sections. */
export function SectionHeader({
  eyebrow,
  heading,
  intro,
  level = 2,
  align = 'start',
  className,
  id,
}) {
  if (!heading && !intro) return null;
  return (
    <div
      className={cx(
        'flex max-w-3xl flex-col gap-4',
        align === 'center' && 'mx-auto items-center text-center',
        className,
      )}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      {heading && (
        <Heading level={level} id={id}>
          {heading}
        </Heading>
      )}
      <Lead className="max-w-[62ch]">{intro}</Lead>
    </div>
  );
}
