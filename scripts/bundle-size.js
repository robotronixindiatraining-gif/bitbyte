#!/usr/bin/env node
/**
 * Initial-JavaScript budget (docs/DESIGN_SYSTEM.md §11): sums the gzip size of every script the
 * built index.html loads up front — the entry module plus any <link rel="modulepreload"> chunks.
 * Lazily imported chunks (e.g. the contact form) are listed separately and not counted.
 * Run after `npm run build`. Fails above 120 KiB (122 880 bytes).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 120 * 1024;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'client', 'dist');
const html = readFileSync(path.join(dist, 'index.html'), 'utf8');

const initial = new Set(
  [
    ...html.matchAll(
      /<script[^>]+src="\/([^"]+\.js)"|<link[^>]+rel="modulepreload"[^>]+href="\/([^"]+\.js)"/g,
    ),
  ].map((m) => m[1] ?? m[2]),
);
const gz = (file) => gzipSync(readFileSync(path.join(dist, file)), { level: 9 }).length;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KiB (${bytes.toLocaleString('en-US')} B)`;

let total = 0;
console.log('Initial JavaScript (gzip -9):');
for (const file of initial) {
  const size = gz(file);
  total += size;
  console.log(`  ${file.padEnd(40)} ${kb(size)}`);
}
const lazy = readdirSync(path.join(dist, 'assets'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => `assets/${f}`)
  .filter((f) => !initial.has(f));
for (const file of lazy) console.log(`  (lazy) ${file.padEnd(33)} ${kb(gz(file))}`);
const css = readdirSync(path.join(dist, 'assets')).filter((f) => f.endsWith('.css'));
for (const file of css)
  console.log(`  (css)  assets/${file.padEnd(33)} ${kb(gz(`assets/${file}`))}`);

console.log(`Total initial JS: ${kb(total)} of ${kb(BUDGET_BYTES)} budget`);
if (total > BUDGET_BYTES) {
  console.error('✗ Initial JavaScript is over budget.');
  process.exit(1);
}
console.log('✓ Within budget.');
