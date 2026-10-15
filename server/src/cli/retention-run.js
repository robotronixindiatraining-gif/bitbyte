#!/usr/bin/env node
import { bootstrapCli } from './bootstrap.js';

const { args, services, close } = await bootstrapCli({
  name: 'retention:run',
  options: { apply: { type: 'boolean', default: false } },
});
if (args.help) {
  console.log(`Usage: npm run retention:run [-- --apply] [-- --allow-production]

Lead retention purge (D-032). Without --apply it only COUNTS the leads whose retention period
has ended (dry run). With --apply it deletes them, exactly like the daily scheduled job.
Deleted leads cannot be recovered (database backups age out within 35 days).`);
  process.exit(0);
}
const result = await services.retention.purgeExpired({ dryRun: !args.apply });
if (result.dryRun) {
  console.log(`Dry run: ${result.expired} lead(s) past their retention date. Nothing was deleted.`);
  console.log('Run again with --apply to delete them.');
} else {
  console.log(`Retention purge: ${result.deleted} of ${result.expired} expired lead(s) deleted.`);
}
await close();
