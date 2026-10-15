#!/usr/bin/env node
import { Admin } from '../models/index.js';
import { generateTemporaryPassword } from '../security/passwords.js';
import { bootstrapCli, fail, requireArg } from './bootstrap.js';

const USAGE = `Usage: npm run admin:reset-password -- --email <email> [--allow-production]

Sets a generated one-time temporary password (shown once) and signs the admin out everywhere.
Two-factor authentication is NOT changed (D-039). Use when no other administrator can help.`;

const { args, services, close } = await bootstrapCli({
  name: 'admin:reset-password',
  options: { email: { type: 'string' } },
});
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
const email = requireArg(args, 'email', USAGE).trim().toLowerCase();
const admin = await Admin.findOne({ email });
if (!admin) fail(`No administrator with e-mail ${email}.`);

const temporaryPassword = generateTemporaryPassword();
await services.admins.resetPassword('system', admin._id, { temporaryPassword }, {});
console.log(`Password reset for ${email}. All of its sessions were ended; two-factor is unchanged.

  Temporary password (shown once): ${temporaryPassword}

The administrator must sign in with it plus their authenticator code, then choose a new password.`);
await close();
