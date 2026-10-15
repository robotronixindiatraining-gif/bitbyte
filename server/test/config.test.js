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

  it('configures media, mail, Turnstile, jobs and SEO switches for Stage 05', () => {
    const dev = loadConfig({});
    expect(dev.media.driver).toBe('local');
    expect(dev.mail).toMatchObject({ driver: 'log', resendApiKey: null, leadRecipients: [] });
    expect(dev.turnstile).toEqual({ secretKey: null, allowedHostnames: [] });
    expect(dev.canonicalHost).toBeNull();
    expect(dev.robotsAllowIndexing).toBe(false);
    expect(loadConfig({ NODE_ENV: 'test' }).jobsEnabled).toBe(false);

    expect(() => loadConfig({ MAIL_DRIVER: 'resend' })).toThrow(/RESEND_API_KEY: Required/);
    expect(() => loadConfig({ MEDIA_DRIVER: 'cloudinary' })).toThrow(/CLOUDINARY_URL: Required/);
    expect(() => loadConfig({ CLOUDINARY_URL: 'https://key:secret@x' })).toThrow(/CLOUDINARY_URL/);
    expect(() => loadConfig({ LEAD_NOTIFICATION_EMAILS: 'ok@example.com, nope' })).toThrow(
      /LEAD_NOTIFICATION_EMAILS/,
    );
    expect(() => loadConfig({ CANONICAL_HOST: 'https://www.example.com/' })).toThrow(
      /CANONICAL_HOST/,
    );

    const production = {
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://cluster.example.net/bitbyte',
      PUBLIC_SITE_URL: 'https://www.example.com',
      ...PRODUCTION_SECRETS,
    };
    // Production never uses local disk for media; without Cloudinary, uploads are disabled.
    expect(loadConfig(production).media.driver).toBe('disabled');
    expect(() => loadConfig({ ...production, MEDIA_DRIVER: 'local' })).toThrow(/development only/);
    expect(loadConfig(production).robotsAllowIndexing).toBe(false);
    const live = loadConfig({
      ...production,
      MEDIA_DRIVER: 'cloudinary',
      CLOUDINARY_URL: 'cloudinary://key:secret@demo-cloud',
      MAIL_DRIVER: 'resend',
      RESEND_API_KEY: 're_placeholder_key',
      MAIL_FROM: 'Website <noreply@example.com>',
      TURNSTILE_SECRET_KEY: 'placeholder-turnstile-secret',
      TURNSTILE_ALLOWED_HOSTNAMES: 'www.example.com, Example.com',
      LEAD_NOTIFICATION_EMAILS: 'Sales@Example.com',
      ROBOTS_ALLOW_INDEXING: 'true',
      CANONICAL_HOST: 'WWW.example.com',
    });
    expect(live.media.driver).toBe('cloudinary');
    expect(live.turnstile.allowedHostnames).toEqual(['www.example.com', 'example.com']);
    expect(live.mail.leadRecipients).toEqual(['sales@example.com']);
    expect(live.robotsAllowIndexing).toBe(true);
    expect(live.canonicalHost).toBe('www.example.com');
    expect(live.jobsEnabled).toBe(true);
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
