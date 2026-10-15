import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { Admin, AuditLog } from '../src/models/index.js';
import { TEST_ENV } from './helpers.js';
import { useTestDatabase } from './support/db.js';

const db = useTestDatabase();
const run = promisify(execFile);
const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Run a CLI script against the isolated test database. */
function cli(script, args = [], env = {}) {
  return run(process.execPath, [`src/cli/${script}.js`, ...args], {
    cwd: serverDir,
    env: {
      PATH: process.env.PATH,
      ...TEST_ENV,
      NODE_ENV: 'development',
      SKIP_ENV_FILE: 'true',
      MONGODB_URI: `${db.uri()}bitbyte_test`,
      ...env,
    },
  }).catch((err) => ({ stdout: err.stdout, stderr: err.stderr, code: err.code }));
}

describe('administrator CLI', () => {
  it('creates the first admin with a generated temporary password and is safe to rerun', async () => {
    const first = await cli('admin-create', ['--email', 'Owner@Example.com', '--name', 'Owner']);
    expect(first.stdout).toMatch(/Created super admin owner@example\.com/);
    const temporary = first.stdout.match(/shown once\): (\S+)/)[1];
    expect(temporary).toMatch(/^[\w]{5}(-[\w]{5}){3}$/);

    const before = await Admin.findOne({ email: 'owner@example.com' })
      .select('+passwordHash')
      .lean();
    expect(before).toMatchObject({ role: 'super_admin', mustChangePassword: true });
    const again = await cli('admin-create', [
      '--email',
      'owner@example.com',
      '--name',
      'Someone else',
    ]);
    expect(again.stdout).toMatch(/already exists\. Nothing was changed/);
    const after = await Admin.findOne({ email: 'owner@example.com' })
      .select('+passwordHash')
      .lean();
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.name).toBe('Owner');
    expect(await AuditLog.findOne({ action: 'admin.create' })).toMatchObject({
      actorEmail: 'system:cli',
      outcome: 'succeeded',
    });
  });

  it('refuses production without explicit authorisation and never takes passwords from arguments', async () => {
    const production = await cli('admin-create', ['--email', 'a@example.com', '--name', 'A'], {
      NODE_ENV: 'production',
      PUBLIC_SITE_URL: 'https://www.example.com',
    });
    expect(production.code).toBe(1);
    expect(production.stderr).toMatch(/--allow-production/);
    const withPassword = await cli('admin-create', [
      '--email',
      'a@example.com',
      '--name',
      'A',
      '--password',
      'x',
    ]);
    expect(withPassword.code).toBe(1);
    expect(await Admin.countDocuments()).toBe(0);
  });

  it('resets the password (2FA kept) and 2FA (password kept) as separate actions', async () => {
    await cli('admin-create', ['--email', 'owner@example.com', '--name', 'Owner']);
    await Admin.updateOne(
      { email: 'owner@example.com' },
      { $set: { 'twoFactor.enabled': true, 'twoFactor.secretEncrypted': 'v1.x.y.z' } },
    );
    const hashBefore = (await Admin.findOne().select('+passwordHash')).passwordHash;

    const reset = await cli('admin-reset-password', ['--email', 'owner@example.com']);
    expect(reset.stdout).toMatch(/two-factor is unchanged/);
    const afterPassword = await Admin.findOne().select('+passwordHash +twoFactor');
    expect(afterPassword.passwordHash).not.toBe(hashBefore);
    expect(afterPassword.twoFactor.enabled).toBe(true);

    const reset2fa = await cli('admin-reset-2fa', ['--email', 'owner@example.com']);
    expect(reset2fa.stdout).toMatch(/password is unchanged/);
    const afterTwoFactor = await Admin.findOne().select('+passwordHash +twoFactor');
    expect(afterTwoFactor.passwordHash).toBe(afterPassword.passwordHash);
    expect(afterTwoFactor.twoFactor.enabled).toBe(false);

    const missing = await cli('admin-reset-2fa', ['--email', 'nobody@example.com']);
    expect(missing.code).toBe(1);
  });

  it('prints fresh secrets without touching the database', async () => {
    const { stdout } = await cli('secrets-generate', [], { MONGODB_URI: '' });
    const values = Object.fromEntries(
      stdout
        .trim()
        .split('\n')
        .map((line) => line.split(/=(.*)/s).slice(0, 2)),
    );
    expect(Buffer.from(values.TOTP_ENCRYPTION_KEY, 'base64')).toHaveLength(32);
    expect(values.RECOVERY_CODE_PEPPER.length).toBeGreaterThanOrEqual(32);
    expect(values.IP_HASH_SALT.length).toBeGreaterThanOrEqual(16);
  });
});
