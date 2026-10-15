#!/usr/bin/env node
import { Admin } from '../models/index.js';
import { generateTemporaryPassword } from '../security/passwords.js';
import { bootstrapCli, requireArg } from './bootstrap.js';

const USAGE = `Usage: npm run admin:create -- --email <email> --name "<name>" [--allow-production]

Creates a super-admin account with a generated one-time temporary password (shown once).
The new admin must set up two-factor authentication and change the password at first sign-in.
Safe to re-run: an existing account is never modified.`;

const { args, services, close } = await bootstrapCli({
  name: 'admin:create',
  options: { email: { type: 'string' }, name: { type: 'string' } },
});
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
const email = requireArg(args, 'email', USAGE).trim().toLowerCase();
const name = requireArg(args, 'name', USAGE).trim();

if (await Admin.exists({ email })) {
  console.log(`An administrator with e-mail ${email} already exists. Nothing was changed.`);
  await close();
  process.exit(0);
}

const temporaryPassword = generateTemporaryPassword();
await services.admins.create('system', { name, email, temporaryPassword }, {});
const total = await Admin.countDocuments();
console.log(`Created super admin ${email} (${total} administrator${total === 1 ? '' : 's'} in total).

  Temporary password (shown once): ${temporaryPassword}

Next: sign in at /admin/login, set up the authenticator app, store the recovery codes offline,
then choose a new password.`);
await close();
