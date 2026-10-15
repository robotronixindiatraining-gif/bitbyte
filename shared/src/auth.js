import { z } from 'zod';

/** Password rules (docs/API_REFERENCE.md §2): length-based, no composition rules, common passwords blocked. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/** Small blocklist of very common passwords that satisfy the length rule. */
const COMMON_PASSWORDS = new Set([
  'password1234',
  'password12345',
  'password123456',
  'passwordpassword',
  '123456789012',
  '1234567890123',
  'qwertyuiopas',
  'qwerty123456',
  'administrator',
  'administrator1',
  'adminadmin123',
  'letmein12345',
  'welcome12345',
  'iloveyou1234',
  'changeme1234',
  'bitbyte12345',
  'bitbyteindia',
  'superadmin123',
]);

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Must be at most ${PASSWORD_MAX_LENGTH} characters`)
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), 'This password is too common');

/** Six-digit TOTP code. */
export const totpCodeSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');

/** Recovery code: 10 characters from an unambiguous alphabet, optionally grouped 5-5. */
export const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const recoveryCodeSchema = z
  .string()
  .regex(/^[A-HJ-NP-Z2-9]{5}-?[A-HJ-NP-Z2-9]{5}$/i, 'Enter a recovery code such as ABCDE-23456');

/** Session stages (D-039). */
export const SESSION_STAGES = Object.freeze({
  MFA_PENDING: 'mfa_pending',
  ENROLLMENT: 'enrollment',
  ACTIVE: 'active',
});

export const ADMIN_STATUSES = Object.freeze(['active', 'disabled']);
