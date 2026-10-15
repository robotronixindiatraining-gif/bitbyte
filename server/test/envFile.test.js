import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadEnvFile } from '../src/config/envFile.js';

describe('loadEnvFile', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'bitbyte-env-'));
  const file = path.join(dir, '.env');
  writeFileSync(file, 'BITBYTE_TEST_FROM_FILE=file\nBITBYTE_TEST_PRESET=file\n');

  afterEach(() => {
    delete process.env.BITBYTE_TEST_FROM_FILE;
    delete process.env.BITBYTE_TEST_PRESET;
    delete process.env.SKIP_ENV_FILE;
  });

  it('returns false when the file does not exist', () => {
    expect(loadEnvFile(path.join(dir, 'missing.env'))).toBe(false);
  });

  it('loads variables without overriding the real environment', () => {
    process.env.BITBYTE_TEST_PRESET = 'environment';
    expect(loadEnvFile(file)).toBe(true);
    expect(process.env.BITBYTE_TEST_FROM_FILE).toBe('file');
    expect(process.env.BITBYTE_TEST_PRESET).toBe('environment');
  });

  it('can be disabled with SKIP_ENV_FILE=true', () => {
    process.env.SKIP_ENV_FILE = 'true';
    expect(loadEnvFile(file)).toBe(false);
    expect(process.env.BITBYTE_TEST_FROM_FILE).toBeUndefined();
  });

  it('cleans up', () => rmSync(dir, { recursive: true, force: true }));
});
