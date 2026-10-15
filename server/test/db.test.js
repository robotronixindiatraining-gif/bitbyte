import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/config/db.js';
import { silentLogger } from './helpers.js';

describe('createDatabase', () => {
  it('reports "disabled" and starts without error when no URI is configured', async () => {
    const db = createDatabase({ uri: null, logger: silentLogger });
    expect(db.getState()).toBe('disabled');
    await expect(db.start()).resolves.toBeUndefined();
    await expect(db.stop()).resolves.toBeUndefined();
  });

  it('reports "connecting" before the first attempt completes', () => {
    const db = createDatabase({ uri: 'mongodb://127.0.0.1:1/never', logger: silentLogger });
    expect(db.getState()).toBe('connecting');
  });
});
