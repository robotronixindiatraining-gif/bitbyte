import { cx } from './cx.js';

/** The fallback name shown until the company name is published (CONTENT_GAPS CG-01). */
export const FALLBACK_BRAND = 'BitByte';

/**
 * Logo slot (§8, D-024): the published logo image when one exists; otherwise a plain TEXT
 * wordmark. No logo or brand mark is designed or invented here.
 */
export function Wordmark({ general, className }) {
  const name = general?.companyName || FALLBACK_BRAND;
  if (general?.logo?.url) {
    return (
      <img
        src={general.logo.url}
        alt={name}
        width={general.logo.width}
        height={general.logo.height}
        className={cx('h-8 w-auto', className)}
      />
    );
  }
  return (
    <span
      className={cx(
        'font-display text-[1.375rem] leading-none font-extrabold tracking-[-0.02em] text-fg',
        className,
      )}
    >
      {FALLBACK_BRAND}
      {name !== FALLBACK_BRAND && <span className="sr-only"> — {name}</span>}
    </span>
  );
}
