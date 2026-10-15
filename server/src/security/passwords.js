import argon2 from 'argon2';
import { randomString, randomToken } from './crypto.js';

/** argon2id with the OWASP baseline parameters (API_REFERENCE.md §2). */
const ARGON2_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
});

let dummyHashPromise = null;

export function hashPassword(password) {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Spend the same work as a real verification when the account does not exist, so response
 * timing does not reveal which e-mail addresses have accounts.
 */
export async function verifyAgainstDummy(password) {
  dummyHashPromise ??= hashPassword(randomToken());
  await verifyPassword(await dummyHashPromise, password);
  return false;
}

const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** One-time temporary password (4 groups of 5, ~114 bits). Must be changed at first sign-in. */
export function generateTemporaryPassword() {
  return Array.from({ length: 4 }, () => randomString(5, TEMP_ALPHABET)).join('-');
}
