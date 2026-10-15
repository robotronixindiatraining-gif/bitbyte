import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requestId } from '../src/middleware/requestId.js';
import { validate } from '../src/middleware/validate.js';
import { buildApp } from './helpers.js';

describe('health endpoints', () => {
  it('reports liveness with the database state', async () => {
    const res = await request(buildApp({ dbState: 'down' })).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok', db: 'down' } });
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reports readiness only when the database is up', async () => {
    const ready = await request(buildApp({ dbState: 'up' })).get('/api/v1/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.data).toEqual({ status: 'ready', db: 'up' });

    const notReady = await request(buildApp({ dbState: 'connecting' })).get('/api/v1/health/ready');
    expect(notReady.status).toBe(503);
    expect(notReady.body.error).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      details: { db: 'connecting' },
    });
    expect(notReady.body.error.requestId).toBe(notReady.headers['x-request-id']);
  });
});

describe('request correlation', () => {
  it('reuses a well-formed incoming request id and replaces unsafe ones', async () => {
    const app = buildApp();
    const kept = await request(app).get('/api/v1/health').set('X-Request-Id', 'proxy-abc-12345');
    expect(kept.headers['x-request-id']).toBe('proxy-abc-12345');

    const replaced = await request(app)
      .get('/api/v1/health')
      .set('X-Request-Id', 'bad id <script>INJECT');
    expect(replaced.headers['x-request-id']).not.toContain('INJECT');
    expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('API error envelope', () => {
  it('returns 404 JSON for unknown API routes', async () => {
    const res = await request(buildApp()).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(buildApp())
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await request(buildApp())
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ blob: 'x'.repeat(300 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('never leaks internal error messages or stacks', async () => {
    const app = express();
    app.use(requestId());
    app.get('/boom', () => {
      throw new Error('connection string mongodb://user:secret@db');
    });
    let tracked = null;
    app.use(errorHandler({ onUnexpectedError: (err) => (tracked = err) }));

    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/secret|stack|mongodb/);
    expect(tracked).toBeInstanceOf(Error);
  });
});

describe('validate middleware', () => {
  const app = express();
  app.use(express.json());
  app.post(
    '/items/:id',
    validate({
      params: z.object({ id: z.string().regex(/^\d+$/) }),
      body: z.object({ title: z.string().min(1) }).strict(),
    }),
    (req, res) => res.json({ data: req.validated }),
  );
  app.use(errorHandler());

  it('exposes parsed input on req.validated', async () => {
    const res = await request(app).post('/items/7').send({ title: 'Hello' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ params: { id: '7' }, body: { title: 'Hello' } });
  });

  it('reports every invalid field with a prefixed path', async () => {
    const res = await request(app).post('/items/abc').send({ title: '', extra: 1 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d) => d.path);
    // 'body' itself is reported for the unknown key rejected by .strict().
    expect(paths).toEqual(expect.arrayContaining(['params.id', 'body.title', 'body']));
    expect(res.body.error.details.some((d) => d.path === 'body' || d.path.startsWith('body'))).toBe(
      true,
    );
  });
});

describe('security headers', () => {
  it('sets CSP and hardening headers without x-powered-by', async () => {
    const res = await request(buildApp()).get('/api/v1/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('https://challenges.cloudflare.com');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toContain('camera=()');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });
});

describe('client hosting', () => {
  let distDir;

  beforeAll(() => {
    distDir = mkdtempSync(path.join(tmpdir(), 'bitbyte-dist-'));
    mkdirSync(path.join(distDir, 'assets'));
    writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><div id="root"></div>');
    writeFileSync(path.join(distDir, 'assets', 'app-abc123.js'), 'console.log(1)');
  });
  afterAll(() => rmSync(distDir, { recursive: true, force: true }));

  it('serves the SPA shell for client routes and caches hashed assets', async () => {
    const app = buildApp({ env: { CLIENT_DIST_DIR: distDir } });

    const home = await request(app).get('/');
    expect(home.status).toBe(200);
    expect(home.text).toContain('id="root"');
    expect(home.headers['cache-control']).toBe('no-cache');

    const deep = await request(app).get('/cms-development');
    expect(deep.status).toBe(200);
    expect(deep.text).toContain('id="root"');

    const asset = await request(app).get('/assets/app-abc123.js');
    expect(asset.status).toBe(200);
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');

    const api = await request(app).get('/api/v1/unknown');
    expect(api.status).toBe(404);
    expect(api.body.error.code).toBe('NOT_FOUND');
  });

  it('returns JSON 404 for non-API routes when no client build exists', async () => {
    const res = await request(buildApp()).get('/anything');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('error logging levels', () => {
  function appWithCapturedLogs(handler) {
    const entries = [];
    const app = express();
    app.use(requestId());
    app.use((req, _res, next) => {
      req.log = Object.fromEntries(
        ['error', 'warn', 'info'].map((level) => [
          level,
          (obj, msg) => entries.push({ level, obj, msg }),
        ]),
      );
      next();
    });
    app.get('/x', handler);
    app.use(errorHandler());
    return { app, entries };
  }

  it('logs expected 5xx AppErrors as warnings without the error object', async () => {
    const { AppError } = await import('../src/utils/AppError.js');
    const { app, entries } = appWithCapturedLogs(() => {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Service is not ready.');
    });
    await request(app).get('/x').expect(503);
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('warn');
    expect(entries[0].obj.err).toBeUndefined();
  });

  it('logs unexpected errors at error level with the error object', async () => {
    const { app, entries } = appWithCapturedLogs(() => {
      throw new Error('boom');
    });
    await request(app).get('/x').expect(500);
    expect(entries[0].level).toBe('error');
    expect(entries[0].obj.err).toBeInstanceOf(Error);
  });
});
