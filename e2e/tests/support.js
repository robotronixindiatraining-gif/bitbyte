import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import {
  FIXTURE_HOME_PAGE,
  FIXTURE_SERVICES,
  FIXTURE_SITE,
} from '../../client/src/dev/fixtures.js';

export const WIDTHS = [360, 390, 768, 1024, 1440];
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const json = (data, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(status < 400 ? { data } : data),
});

/**
 * Mock the public API. `overrides` maps a path below /api/v1 to { status, body } or data.
 * Everything else answers 404, exactly like unpublished content on the real API.
 */
export async function mockApi(page, overrides = {}) {
  const routes = {
    '/public/site': FIXTURE_SITE,
    '/public/services': FIXTURE_SERVICES,
    '/public/pages/home': FIXTURE_HOME_PAGE,
    ...overrides,
  };
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const value = routes[path];
    if (value === undefined) {
      return route.fulfill(json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, 404));
    }
    if (value && value.__status) return route.fulfill(json(value.body, value.__status));
    return route.fulfill(json(value));
  });
}

/** Turnstile is a third-party script; tests replace it with a local stub (never the network). */
export async function stubTurnstile(page) {
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'window.turnstile={render:function(el,o){el.textContent="Bot check (test stub)";setTimeout(function(){o.callback("stub-token")});return "w1"},reset:function(){}};',
    }),
  );
}

export async function expectNoAxeViolations(page, { include, exclude } = {}) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder = builder.include(include);
  if (exclude) builder = builder.exclude(exclude);
  const { violations } = await builder.analyze();
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(', ')}`,
  );
  expect(summary, summary.join('\n')).toEqual([]);
}

export async function horizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}
