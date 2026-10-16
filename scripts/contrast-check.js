#!/usr/bin/env node
/**
 * WCAG 2.x contrast check for the design tokens (docs/DESIGN_SYSTEM.md §2.2, §2.4).
 * Reads client/src/styles/index.css, resolves every surface's semantic tokens to hex values and
 * verifies the text/UI pairs components actually use. Run after any palette change (D-024).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(path.join(root, 'client/src/styles/index.css'), 'utf8');

const palette = Object.fromEntries(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]),
);

function surface(name) {
  const block = css.match(new RegExp(`@utility surface-${name} \\{([\\s\\S]*?)\\n\\}`));
  if (!block) throw new Error(`surface-${name} not found`);
  const tokens = {};
  for (const [, key, value] of block[1].matchAll(/--s-([a-z-]+):\s*([^;]+);/g)) {
    const ref = value.match(/var\(--color-([a-z0-9-]+)\)/);
    tokens[key] = ref ? palette[ref[1]] : null; // translucent values are decorative borders
  }
  return tokens;
}

const channel = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** [foreground, background, minimum ratio, use] — 4.5 for text, 3 for UI/large text. */
const PAIRS = [
  ['fg', 'bg', 4.5, 'headings'],
  ['fg-body', 'bg', 4.5, 'body text'],
  ['fg-muted', 'bg', 4.5, 'secondary text'],
  ['fg-subtle', 'bg', 4.5, 'meta text'],
  ['link', 'bg', 4.5, 'links'],
  ['highlight', 'bg', 4.5, 'highlighted words, eyebrows'],
  ['fg', 'surface', 4.5, 'card headings'],
  ['fg-body', 'surface', 4.5, 'card text'],
  ['fg-subtle', 'surface', 4.5, 'card meta text'],
  ['link', 'surface', 4.5, 'links in cards'],
  ['primary-fg', 'primary', 4.5, 'primary button label'],
  ['primary-fg', 'primary-hover', 4.5, 'primary button label (hover)'],
  ['tile-fg', 'tile', 4.5, 'icon tiles, chips'],
  ['focus', 'bg', 3, 'focus ring'],
  ['focus', 'surface', 3, 'focus ring on cards'],
  ['primary', 'bg', 3, 'outline button border'],
];

let failures = 0;
for (const name of ['light', 'muted', 'dark']) {
  const tokens = surface(name);
  console.log(`\nsurface-${name}`);
  for (const [fg, bg, min, use] of PAIRS) {
    if (!tokens[fg] || !tokens[bg])
      throw new Error(`surface-${name}: missing --s-${fg} or --s-${bg}`);
    const ratio = contrast(tokens[fg], tokens[bg]);
    const ok = ratio >= min;
    if (!ok) failures += 1;
    console.log(
      `  ${ok ? '✓' : '✗'} ${fg} on ${bg}`.padEnd(38) +
        `${ratio.toFixed(2).padStart(6)} (≥ ${min}) ${use}`,
    );
  }
}

if (failures > 0) {
  console.error(`\n✗ ${failures} contrast pair(s) below the WCAG 2.2 AA minimum.`);
  process.exit(1);
}
console.log('\n✓ All semantic colour pairs meet WCAG 2.2 AA.');
