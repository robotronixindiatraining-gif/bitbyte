#!/usr/bin/env node
import { Admin } from '../models/index.js';
import { bootstrapCli, fail, requireArg } from './bootstrap.js';

const USAGE = `Usage: npm run admin:reset-2fa -- --email <email> [--allow-production]

Clears the admin's two-factor authentication and recovery codes and signs them out everywhere.
The password is NOT changed (D-039); they must set up a new authenticator at the next sign-in.`;

const { args, services, close } = await bootstrapCli({
  name: 'admin:reset-2fa',
  options: { email: { type: 'string' } },
});
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
const email = requireArg(args, 'email', USAGE).trim().toLowerCase();
const admin = await Admin.findOne({ email });
if (!admin) fail(`No administrator with e-mail ${email}.`);

await services.admins.resetTwoFactor('system', admin._id, {});
console.log(
  `Two-factor authentication reset for ${email}. All of its sessions were ended; the password is unchanged.`,
);
await close();
