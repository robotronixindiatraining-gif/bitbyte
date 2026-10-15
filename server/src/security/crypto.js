import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

/** URL-safe random token (default 256 bits). */
export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function hmacHex(key, value) {
  return createHmac('sha256', key).update(value).digest('hex');
}

export function safeEqualHex(a, b) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Random string from an alphabet using an unbiased CSPRNG. */
export function randomString(length, alphabet) {
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[randomInt(alphabet.length)];
  return out;
}

/**
 * AES-256-GCM encryption for secrets at rest (TOTP secrets, D-039).
 * Format: v1.<iv>.<tag>.<ciphertext> (base64url parts).
 */
export function encryptSecret(plaintext, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv, tag, ciphertext]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.');
}

export function decryptSecret(blob, key) {
  const [version, iv, tag, ciphertext] = String(blob).split('.');
  if (version !== 'v1') throw new Error('Unsupported secret format');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** Salted, truncated IP hash: enough to correlate abuse, not to recover the address. */
export function hashIp(ip, salt) {
  if (!salt || !ip) return null;
  return hmacHex(salt, ip).slice(0, 32);
}
