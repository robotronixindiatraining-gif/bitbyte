import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import pino from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServices } from '../src/container.js';
import { startJobs } from '../src/jobs/scheduler.js';
import { AuditLog, Lead } from '../src/models/index.js';
import { HEADERS, RELAXED_LIMITS, createAdmin, signIn, stepUp } from './support/auth.js';
import { useTestDatabase } from './support/db.js';
import { TEST_ENV, buildApp, testConfig } from './helpers.js';

// Every lead below is synthetic and lives only in this throwaway database.
const db = useTestDatabase();
const DAY = 86_400_000;

function lead({ ageDays, expiresInDays, status = 'new', email = 'person@example.com' }) {
  const createdAt = new Date(Date.now() - ageDays * DAY);
  return {
    type: 'project_enquiry',
    fullName: 'Synthetic Person',
    email,
    phone: '+91 90000 00000',
    message: 'Synthetic test message.',
    consent: { given: true, text: 'ok', at: createdAt },
    status,
    createdAt,
    expiresAt: new Date(Date.now() + expiresInDays * DAY),
  };
}

const services = () => createServices({ config: testConfig(), logger: pino({ level: 'silent' }) });

describe('retention purge (D-032)', () => {
  it('deletes only expired leads, supports a dry run, is safe to rerun and audits counts only', async () => {
    await Lead.insertMany([
      lead({ ageDays: 400, expiresInDays: -35, email: 'old1@example.com' }),
      lead({ ageDays: 366, expiresInDays: -1, email: 'old2@example.com' }),
      lead({ ageDays: 31, expiresInDays: -1, status: 'spam', email: 'spam@example.com' }),
      lead({ ageDays: 10, expiresInDays: 355, email: 'keep@example.com' }),
    ]);
    const { retention } = services();

    expect(await retention.purgeExpired({ dryRun: true })).toMatchObject({
      dryRun: true,
      expired: 3,
      deleted: 0,
    });
    expect(await Lead.countDocuments()).toBe(4);

    expect(await retention.purgeExpired()).toMatchObject({ expired: 3, deleted: 3 });
    expect((await Lead.find().lean()).map((l) => l.email)).toEqual(['keep@example.com']);
    expect(await retention.purgeExpired()).toMatchObject({ expired: 0, deleted: 0 });

    const entries = await AuditLog.find({ action: 'lead.retention_purge' }).lean();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ outcome: 'succeeded', meta: { expired: 3, deleted: 3 } });
    expect(JSON.stringify(entries)).not.toMatch(/example\.com|Synthetic/);
  });

  it('recomputes every expiry date when new privacy settings are published', async () => {
    await Lead.insertMany([
      lead({ ageDays: 100, expiresInDays: 265 }),
      lead({ ageDays: 5, expiresInDays: 25, status: 'spam' }),
    ]);
    const { Setting } = await import('../src/models/index.js');
    await Setting.create({
      key: 'privacy',
      draft: { leadRetentionDays: 90, spamRetentionDays: 7 },
    });
    const app = buildApp({ overrides: { limits: RELAXED_LIMITS } });
    const owner = await createAdmin();
    const agent = await signIn(app, owner);
    await stepUp(agent, owner);
    const res = await agent
      .post('/api/v1/admin/settings/privacy/publish')
      .set(HEADERS)
      .send({ revision: 1 });
    expect(res.status).toBe(200);
    const leads = await Lead.find().sort({ createdAt: 1 }).lean();
    expect(leads.map((l) => Math.round((l.expiresAt - l.createdAt) / DAY))).toEqual([90, 7]);
  });
});

describe('retention CLI', () => {
  const run = promisify(execFile);
  const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const cli = (args) =>
    run(process.execPath, ['src/cli/retention-run.js', ...args], {
      cwd: serverDir,
      env: {
        PATH: process.env.PATH,
        ...TEST_ENV,
        NODE_ENV: 'development',
        SKIP_ENV_FILE: 'true',
        MONGODB_URI: `${db.uri()}bitbyte_test`,
      },
    }).catch((err) => ({ stdout: err.stdout, stderr: err.stderr, code: err.code }));

  it('is a dry run unless --apply is given', async () => {
    await Lead.insertMany([
      lead({ ageDays: 400, expiresInDays: -1 }),
      lead({ ageDays: 1, expiresInDays: 364 }),
    ]);
    const dry = await cli([]);
    expect(dry.stdout).toMatch(/Dry run: 1 lead\(s\) past their retention date/);
    expect(await Lead.countDocuments()).toBe(2);
    const applied = await cli(['--apply']);
    expect(applied.stdout).toMatch(/1 of 1 expired lead\(s\) deleted/);
    expect(await Lead.countDocuments()).toBe(1);
  });

  it('refuses production without --allow-production', async () => {
    const res = await run(process.execPath, ['src/cli/retention-run.js'], {
      cwd: serverDir,
      env: {
        PATH: process.env.PATH,
        ...TEST_ENV,
        NODE_ENV: 'production',
        SKIP_ENV_FILE: 'true',
        MONGODB_URI: 'mongodb://127.0.0.1:1/x',
      },
    }).catch((err) => err);
    expect(res.code).toBe(1);
    expect(res.stderr).toMatch(/--allow-production/);
  });
});

describe('scheduler', () => {
  afterEach(() => vi.useRealTimers());

  it('runs jobs on their schedule, never overlapping, and survives failures', async () => {
    vi.useFakeTimers();
    let release;
    const purge = vi.fn(() => new Promise((resolve) => (release = resolve)));
    const retry = vi.fn(async () => {
      throw new Error('boom');
    });
    const logger = { error: vi.fn() };
    const jobs = startJobs({
      retention: { purgeExpired: purge, recomputeExpiry: async () => ({ updated: 0 }) },
      notifications: { retryDue: retry },
      logger,
      intervals: { 'retention-purge': 1000 },
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(purge).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(purge).toHaveBeenCalledTimes(1); // still running: no overlap
    release();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(purge).toHaveBeenCalledTimes(2);
    expect(retry).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'lead-notification-retry' }),
      'scheduled job failed',
    );
    jobs.stop();
  });
});
