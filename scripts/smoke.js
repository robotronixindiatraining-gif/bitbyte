#!/usr/bin/env node
/**
 * Smoke test: the client build exists and the production server starts, serves the built app and
 * answers its health checks. Run after `npm run build`. No real database is needed: the server is
 * pointed at an unreachable MongoDB URI and must still start (D-041).
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = path.join(root, 'client', 'dist', 'index.html');
const STARTUP_TIMEOUT_MS = 20_000;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early with code ${child.exitCode}`);
    try {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      if (res.ok) return res;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('server did not become healthy in time');
}

async function main() {
  assert(existsSync(distIndex), 'client build exists (client/dist/index.html)');
  assert(
    readFileSync(distIndex, 'utf8').includes('id="root"'),
    'client build contains the app root',
  );

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server/src/server.js'], {
    cwd: root,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'production',
      SKIP_ENV_FILE: 'true',
      HOST: '127.0.0.1',
      PORT: String(port),
      PUBLIC_SITE_URL: baseUrl,
      MONGODB_URI: 'mongodb://127.0.0.1:1/bitbyte_smoke',
      LOG_LEVEL: 'warn',
      // Throwaway secrets for this run only (production refuses to start without them).
      TOTP_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      RECOVERY_CODE_PEPPER: randomBytes(32).toString('base64url'),
      IP_HASH_SALT: randomBytes(24).toString('base64url'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));

  try {
    const health = await waitForHealth(baseUrl, child);
    const body = await health.json();
    assert(body.data?.status === 'ok', 'production server starts and liveness reports ok');

    const ready = await fetch(`${baseUrl}/api/v1/health/ready`);
    assert(ready.status === 503, 'readiness reports 503 without a database');

    const home = await fetch(`${baseUrl}/`);
    const html = await home.text();
    assert(
      home.status === 503 && html.includes('id="root"') && html.includes('noindex'),
      'server serves the built client shell (503 + noindex while the database is down)',
    );
    assert(
      (home.headers.get('content-security-policy') ?? '').includes("default-src 'self'"),
      'security headers are present',
    );
    assert(
      (home.headers.get('strict-transport-security') ?? '').includes('max-age='),
      'HSTS is enabled in production',
    );

    const deepLink = await fetch(`${baseUrl}/internet-of-things`);
    const deepHtml = await deepLink.text();
    assert(deepHtml.includes('id="root"'), 'content routes are served by the app shell');

    const robots = await (await fetch(`${baseUrl}/robots.txt`)).text();
    assert(
      robots.includes('Disallow: /\n'),
      'robots.txt blocks indexing until ROBOTS_ALLOW_INDEXING is enabled',
    );

    const lead = await fetch(`${baseUrl}/api/v1/public/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
        'X-Requested-With': 'fetch',
      },
      body: '{}',
    });
    assert(lead.status === 403, 'lead submissions from other origins are rejected');

    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl, 'X-Requested-With': 'fetch' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'irrelevant password' }),
    });
    assert(login.status === 503, 'auth answers 503 (not a hang or 500) while the database is down');

    const csrf = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
        'X-Requested-With': 'fetch',
      },
      body: '{}',
    });
    assert(csrf.status === 403, 'cross-origin state-changing requests are rejected');

    const missingApi = await fetch(`${baseUrl}/api/v1/nope`);
    const missingBody = await missingApi.json();
    assert(
      missingApi.status === 404 && missingBody.error?.code === 'NOT_FOUND',
      'unknown API routes return the JSON error envelope',
    );
  } catch (err) {
    fail(err.message);
    if (output) console.error(`--- server output ---\n${output}`);
  } finally {
    child.kill('SIGTERM');
    const exited = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 12_000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
    if (!exited) {
      child.kill('SIGKILL');
      fail('server did not shut down gracefully');
    } else if (process.exitCode !== 1) {
      console.log('✓ server shuts down gracefully on SIGTERM');
    }
  }
}

main().catch((err) => fail(err.message));
