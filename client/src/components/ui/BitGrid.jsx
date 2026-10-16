import { cx } from './cx.js';

/**
 * The BitGrid motif (§1, §9.1): rows of eight cells — one byte each. "On" cells use the accent;
 * "off" cells are quiet. Purely decorative (aria-hidden). In the hero the on-cells cascade in
 * once (CSS only, disabled under reduced motion) and then stay static.
 *
 * `pattern` is an array of 8-character strings: '1' = on, '2' = on (strong), '0' = off.
 */
export const BYTE_B = '01000010'; // ASCII "B"

export const HERO_PATTERN = Object.freeze([
  '00000100',
  BYTE_B,
  '00000000',
  '00100000',
  '00000000',
  '00000001',
  BYTE_B,
  '00000000',
  '10000000',
  '00001000',
]);

export function BitGrid({
  pattern = HERO_PATTERN,
  cell = 12,
  gap = 6,
  animate = false,
  highlightRows = [],
  className,
  title,
}) {
  const cols = 8;
  const rows = pattern.length;
  const size = (n) => n * cell + (n - 1) * gap;
  let onIndex = 0;
  return (
    <svg
      viewBox={`0 0 ${size(cols)} ${size(rows)}`}
      width={size(cols)}
      height={size(rows)}
      aria-hidden="true"
      focusable="false"
      className={cx(animate && 'bitgrid-animate', className)}
    >
      {title ? <title>{title}</title> : null}
      {pattern.map((row, r) =>
        row
          .padEnd(cols, '0')
          .slice(0, cols)
          .split('')
          .map((bit, c) => {
            const x = c * (cell + gap);
            const y = r * (cell + gap);
            const on = bit !== '0';
            const strong = bit === '2' || highlightRows.includes(r);
            if (!on) {
              return (
                <rect
                  key={`${r}-${c}`}
                  x={x + 0.5}
                  y={y + 0.5}
                  width={cell - 1}
                  height={cell - 1}
                  rx={3}
                  className="fill-bit-off stroke-bit-off-stroke"
                  strokeWidth={1}
                />
              );
            }
            const i = onIndex++;
            return (
              <rect
                key={`${r}-${c}`}
                x={x}
                y={y}
                width={cell}
                height={cell}
                rx={3}
                className={cx('bit-on', strong ? 'fill-bit-on-strong' : 'fill-bit-on')}
                style={{ '--bit-i': i }}
              />
            );
          }),
      )}
    </svg>
  );
}
