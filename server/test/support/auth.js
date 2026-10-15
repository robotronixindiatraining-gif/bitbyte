import request from 'supertest';
import { Admin } from '../../src/models/index.js';
import { encryptSecret } from '../../src/security/crypto.js';
import { hashPassword } from '../../src/security/passwords.js';
import {
  generateRecoveryCodes,
  generateTotp,
  generateTotpSecret,
  hashRecoveryCode,
} from '../../src/security/totp.js';
import { TEST_ENV, buildApp } from '../helpers.js';

export const ORIGIN = 'http://localhost:5173';
export const HEADERS = Object.freeze({ Origin: ORIGIN, 'X-Requested-With': 'fetch' });
export const DEFAULT_PASSWORD = 'correct horse battery staple';
const totpKey = Buffer.from(TEST_ENV.TOTP_ENCRYPTION_KEY, 'base64');

/** Generous limits so multi-step tests are not throttled; rate limiting has its own tests. */
export const RELAXED_LIMITS = {
  loginPerAccount: { windowMs: 60_000, limit: 1000 },
  loginPerIp: { windowMs: 60_000, limit: 1000 },
  mfaPerIp: { windowMs: 60_000, limit: 1000 },
};

export function buildTestApp(overrides = {}) {
  return buildApp({ overrides: { limits: RELAXED_LIMITS, ...overrides } });
}

/** Create an admin directly in the database (optionally already enrolled in 2FA). */
export async function createAdmin({
  email = 'admin@example.com',
  name = 'Test Admin',
  password = DEFAULT_PASSWORD,
  enrolled = true,
  mustChangePassword = false,
} = {}) {
  const secret = generateTotpSecret();
  const recoveryCodes = generateRecoveryCodes(10);
  const admin = await Admin.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    mustChangePassword,
    twoFactor: enrolled
      ? {
          enabled: true,
          secretEncrypted: encryptSecret(secret, totpKey),
          enrolledAt: new Date(),
          recoveryCodeHashes: recoveryCodes.map((c) =>
            hashRecoveryCode(c, TEST_ENV.RECOVERY_CODE_PEPPER),
          ),
          recoveryCodesGeneratedAt: new Date(),
        }
      : {},
  });
  return { admin, email, password, secret, recoveryCodes };
}

/**
 * A current TOTP code that has not been used yet. Tests that perform several authenticated steps
 * within one 30-second window clear the replay marker first (replay itself is tested separately).
 */
export async function freshCode(adminId, secret) {
  await Admin.updateOne({ _id: adminId }, { $set: { 'twoFactor.lastUsedStep': null } });
  return generateTotp(secret);
}

/** Full sign-in (password + TOTP) with a cookie-keeping agent. */
export async function signIn(app, account) {
  const agent = request.agent(app);
  const login = await agent
    .post('/api/v1/auth/login')
    .set(HEADERS)
    .send({ email: account.email, password: account.password });
  if (login.status !== 200)
    throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
  const code = await freshCode(account.admin._id, account.secret);
  const verify = await agent.post('/api/v1/auth/login/verify').set(HEADERS).send({ code });
  if (verify.status !== 200)
    throw new Error(`verify failed: ${verify.status} ${JSON.stringify(verify.body)}`);
  return agent;
}

/** Password + TOTP re-authentication for sensitive actions. */
export async function stepUp(agent, account) {
  const code = await freshCode(account.admin._id, account.secret);
  const res = await agent
    .post('/api/v1/auth/step-up')
    .set(HEADERS)
    .send({ password: account.password, code });
  if (res.status !== 200)
    throw new Error(`step-up failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res;
}

export function sessionCookie(res) {
  return (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('bb_sid='));
}
