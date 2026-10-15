import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config/env.js';

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
    const config = loadConfig({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://cluster.example.net/bitbyte',
      PUBLIC_SITE_URL: 'https://www.example.com',
    });
    expect(config.isProduction).toBe(true);
    expect(config.logPretty).toBe(false);
    expect(config.logLevel).toBe('info');
  });
});
