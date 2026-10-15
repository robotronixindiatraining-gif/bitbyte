#!/usr/bin/env node
import { randomBytes } from 'node:crypto';

/**
 * Prints fresh random values for the security secrets. Nothing is written to disk: paste them
 * into server/.env (development) or the host's secret store (production). Changing
 * TOTP_ENCRYPTION_KEY later makes existing 2FA enrolments unreadable (re-enrol with admin:reset-2fa);
 * changing RECOVERY_CODE_PEPPER invalidates existing recovery codes.
 */
console.log(`TOTP_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}
RECOVERY_CODE_PEPPER=${randomBytes(32).toString('base64url')}
IP_HASH_SALT=${randomBytes(24).toString('base64url')}`);
