#!/usr/bin/env node
/**
 * Fails when TypeScript enters the repository (D-001): .ts/.tsx/.mts/.cts files, tsconfig files,
 * or `typescript` / `@types/*` declared in any workspace package.json.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
]);
const TS_FILE = /\.(ts|tsx|mts|cts)$/i;
const TS_CONFIG = /^tsconfig(\..+)?\.json$/i;

const problems = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      continue;
    }
    const relative = path.relative(root, path.join(dir, entry.name));
    if (TS_FILE.test(entry.name)) problems.push(`TypeScript file: ${relative}`);
    if (TS_CONFIG.test(entry.name)) problems.push(`TypeScript config: ${relative}`);
    if (entry.name === 'package.json') checkManifest(path.join(dir, entry.name), relative);
  }
}

function checkManifest(file, relative) {
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (name === 'typescript' || name.startsWith('@types/')) {
        problems.push(`TypeScript dependency "${name}" in ${relative} (${field})`);
      }
    }
  }
}

walk(root);

if (problems.length > 0) {
  console.error('TypeScript is not allowed in this project (JavaScript only):');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('No TypeScript found.');
