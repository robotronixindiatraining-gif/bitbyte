import { cx } from './cx.js';

/**
 * Responsive image from the media resolver (`{ url, alt, decorative, width, height,
 * dominantColor, variants }`). Width/height are always set and the dominant colour fills the box
 * while loading, so images never shift the layout (§5). Lazy unless `priority`.
 */
export function ResponsiveImage({
  image,
  sizes = '100vw',
  priority = false,
  ratio,
  className,
  imgClassName,
}) {
  if (!image?.url) return null;
  const variants = Array.isArray(image.variants)
    ? image.variants.filter((v) => v?.url && v?.width)
    : [];
  const srcSet =
    variants.length > 1 ? variants.map((v) => `${v.url} ${v.width}w`).join(', ') : undefined;
  return (
    <div
      className={cx('overflow-hidden', className)}
      style={{
        backgroundColor: image.dominantColor ?? undefined,
        aspectRatio:
          ratio ?? (image.width && image.height ? `${image.width} / ${image.height}` : undefined),
      }}
    >
      <img
        src={image.url}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        width={image.width}
        height={image.height}
        alt={image.decorative ? '' : (image.alt ?? '')}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className={cx('size-full object-cover', imgClassName)}
      />
    </div>
  );
}
