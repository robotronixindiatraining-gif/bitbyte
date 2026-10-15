import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { adminRouteTable } from '../src/routes/admin/index.js';
import { publicLeadRouter, publicRouter } from '../src/routes/public/index.js';

const docPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../docs/API_REFERENCE.md',
);
const doc = readFileSync(docPath, 'utf8');
const stub = new Proxy(() => {}, { get: () => stub });
const limiters = new Proxy({}, { get: () => (_req, _res, next) => next() });

/** "GET /admin/x/:id" → regex that also matches the doc's backticked form. */
const documented = (method, route) => {
  const escaped = `${method.toUpperCase()} ${route}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\`${escaped}(\\?[^\`]*)?\``);
};

function routesOf(router) {
  return router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map((method) => [method, layer.route.path]),
    );
}

describe('API_REFERENCE.md matches the implementation', () => {
  it('documents every admin route with its exact method and path', () => {
    const missing = adminRouteTable({
      administrators: stub,
      auditLogs: stub,
      content: stub,
      resources: stub,
    })
      .map((r) => [r.method, `/admin${r.path}`])
      .filter(([method, route]) => !documented(method, route).test(doc))
      .map(([method, route]) => `${method.toUpperCase()} ${route}`);
    expect(missing).toEqual([]);
  });

  it('documents every public route', () => {
    const routes = [
      ...routesOf(publicRouter({ controller: stub, limiters })).map(([m, p]) => [m, `/public${p}`]),
      ...routesOf(publicLeadRouter({ controller: stub, limiters, allowedOrigins: [] })),
    ];
    const missing = routes
      .filter(([method, route]) => !documented(method, route).test(doc))
      .map(([method, route]) => `${method.toUpperCase()} ${route}`);
    expect(routes.length).toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });

  it('marks exactly the step-up routes with ⇑', () => {
    const stepUp = adminRouteTable({
      administrators: stub,
      auditLogs: stub,
      content: stub,
      resources: stub,
    }).filter((r) => r.stepUp);
    for (const route of stepUp) {
      const line = doc
        .split('\n')
        .find((l) => documented(route.method, `/admin${route.path}`).test(l));
      expect(line, `${route.method} ${route.path}`).toContain('⇑');
    }
  });
});
