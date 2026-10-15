import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config/env.js';

const PRODUCTION_SECRETS = {
  TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  RECOVERY_CODE_PEPPER: 'p'.repeat(32),
  IP_HASH_SALT: 's'.repeat(16),
};

describe('loadConfig', () => {
  it('applies development defaults', () => {
    const config = loadConfig({});
    expect(config.env).toBe('development');
    expect(config.port).toBe(4000);
    expect(config.logPretty).toBe(true);
    expect(config.mongodbUri).toBeNull();
    expect(path.isAbsolute(config.clientDistDir)).toBe(true);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('treats empty strings as unset', () => {
    const config = loadConfig({ MONGODB_URI: '', LOG_LEVEL: '  ', PORT: '' });
    expect(config.mongodbUri).toBeNull();
    expect(config.port).toBe(4000);
  });

  it('is silent in tests by default', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).logLevel).toBe('silent');
  });

  it('rejects invalid values with every problem listed', () => {
    let error;
    try {
      loadConfig({ PORT: '99999', MONGODB_URI: 'postgres://x', LOG_LEVEL: 'loud' });
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(ConfigError);
    const paths = error.issues.map((issue) => issue.path);
    expect(paths).toEqual(expect.arrayContaining(['PORT', 'MONGODB_URI', 'LOG_LEVEL']));
  });

  it('requires a database, https site URL and plain logs in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(
      /MONGODB_URI: Required in production/,
    );
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://db/bitbyte',
        PUBLIC_SITE_URL: 'http://www.example.com',
      }),
    ).toThrow(/must use https/i);
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb+srv://cluster.example.net/bitbyte',
        PUBLIC_SITE_URL: 'https://www.example.com',
      }),
    ).toThrow(/TOTP_ENCRYPTION_KEY: Required in production/);
    const config = loadConfig({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://cluster.example.net/bitbyte',
      PUBLIC_SITE_URL: 'https://www.example.com',
      ...PRODUCTION_SECRETS,
    });
    expect(config.isProduction).toBe(true);
    expect(config.session).toMatchObject({ cookieName: '__Host-bb_sid', secureCookie: true });
    expect(config.allowedOrigins).toEqual(['https://www.example.com']);
    expect(config.secrets.totpKey).toHaveLength(32);
    expect(config.logPretty).toBe(false);
    expect(config.logLevel).toBe('info');
  });

  it('builds the origin allowlist and cookie settings for development', () => {
    const config = loadConfig({
      ALLOWED_ORIGINS: 'https://staging.example.com, http://localhost:3000/',
    });
    expect(config.allowedOrigins).toEqual(
      expect.arrayContaining([
        'https://staging.example.com',
        'http://localhost:3000',
        'http://localhost:5173',
      ]),
    );
    expect(config.session).toMatchObject({
      cookieName: 'bb_sid',
      secureCookie: false,
      idleMs: 7_200_000,
    });
    expect(() => loadConfig({ ALLOWED_ORIGINS: 'not a url' })).toThrow(ConfigError);
    expect(() => loadConfig({ TOTP_ENCRYPTION_KEY: 'c2hvcnQ=' })).toThrow(/32 random bytes/);
  });
});
