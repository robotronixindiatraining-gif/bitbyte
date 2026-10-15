#!/usr/bin/env node
import { bootstrapCli } from './bootstrap.js';

const { args, services, close } = await bootstrapCli({ name: 'admin:list' });
if (args.help) {
  console.log('Usage: npm run admin:list — lists administrators (no secrets).');
  process.exit(0);
}
const admins = await services.admins.list();
if (admins.length === 0)
  console.log(
    'No administrators yet. Create one with: npm run admin:create -- --email … --name "…"',
  );
for (const a of admins) {
  console.log(
    `${a.email}\t${a.name}\t${a.status}\t2FA:${a.twoFactorEnabled ? 'on' : 'not set up'}\tlast sign-in:${a.lastLoginAt?.toISOString() ?? 'never'}`,
  );
}
await close();
