import * as OTPAuth from 'otpauth';
import { RECOVERY_CODE_ALPHABET } from '@bitbyte/shared';
import { hmacHex, randomString } from './crypto.js';

export const TOTP_ISSUER = 'BitByte Admin';
const PERIOD = 30;
const DIGITS = 6;
/** Accept the previous/next 30-second step to tolerate small clock drift. */
const WINDOW = 1;

function totpFor(secretBase32, label = 'admin') {
  return new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label,
    algorithm: 'SHA1',
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

/** New 160-bit TOTP secret (base32). */
export function generateTotpSecret() {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function buildOtpauthUri(secretBase32, label) {
  return totpFor(secretBase32, label).toString();
}

/**
 * Validate a code and return the absolute time-step it belongs to, or null.
 * Callers must reject steps <= the last accepted step (replay protection).
 */
export function matchTotp(secretBase32, code, timestamp = Date.now()) {
  const delta = totpFor(secretBase32).validate({ token: String(code), timestamp, window: WINDOW });
  if (delta === null) return null;
  return Math.floor(timestamp / 1000 / PERIOD) + delta;
}

/** Test/support helper: the code for a given time. */
export function generateTotp(secretBase32, timestamp = Date.now()) {
  return totpFor(secretBase32).generate({ timestamp });
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const raw = randomString(10, RECOVERY_CODE_ALPHABET);
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function normalizeRecoveryCode(code) {
  return String(code)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function hashRecoveryCode(code, pepper) {
  return hmacHex(pepper, normalizeRecoveryCode(code));
}
