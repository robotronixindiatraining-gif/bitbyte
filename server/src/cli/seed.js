#!/usr/bin/env node
import { runSeed } from '../seed/seedService.js';
import { bootstrapCli } from './bootstrap.js';

const { args, close } = await bootstrapCli({ name: 'seed' });
if (args.help) {
  console.log(`Usage: npm run seed [-- --allow-production]

Inserts missing placeholder content (settings, system pages, services, categories, orderings).
Never updates existing documents, never touches administrator accounts, publishes nothing.`);
  process.exit(0);
}
const report = await runSeed();
console.log(
  `Seed finished: ${report.created.length} created, ${report.skipped.length} already present (unchanged).`,
);
for (const item of report.created) console.log(`  + ${item}`);
await close();
