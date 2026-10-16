import { cx } from './cx.js';

const BACKGROUNDS = { light: 'surface-light', muted: 'surface-muted', dark: 'surface-dark' };

/**
 * Section wrapper (§4, §8): applies the light / muted / dark surface (which remaps every
 * semantic colour token) and the default or compact vertical rhythm.
 */
export function Section({
  background = 'light',
  spacing = 'default',
  className,
  children,
  as: Tag = 'section',
  ...rest
}) {
  return (
    <Tag
      className={cx(
        'relative',
        BACKGROUNDS[background] ?? BACKGROUNDS.light,
        spacing === 'none' ? '' : spacing === 'compact' ? 'section-space-compact' : 'section-space',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Container({ className, children, wide = false }) {
  return (
    <div className={cx('container-site', wide && 'max-w-[calc(1440px+80px)]', className)}>
      {children}
    </div>
  );
}
