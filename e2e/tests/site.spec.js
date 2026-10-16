import { expect, test } from '@playwright/test';
import { FIXTURE_SITE } from '../../client/src/dev/fixtures.js';
import { WIDTHS, expectNoAxeViolations, horizontalOverflow, mockApi } from './support.js';

/** Production build (vite preview) with the public API mocked from fixtures. */

test.describe('homepage — production build', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  for (const width of WIDTHS) {
    test(`renders without horizontal overflow at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        'Software, web and IoT solutions',
      );
      expect(await horizontalOverflow(page)).toBe(0);
      await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
    });
  }

  test('has no automatically detectable WCAG 2.2 A/AA violations (desktop and mobile)', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoAxeViolations(page);
  });

  test('has one h1, landmarks and a skip link as the first focusable element', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('desktop mega-menu works with the keyboard, Escape and outside clicks', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const button = page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Services' });
    await button.focus();
    await page.keyboard.press('ArrowDown');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: /Web Development/ }).first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('link', { name: /Internet of Things/ }).first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();
    await button.click();
    await page.mouse.click(700, 800);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile drawer traps focus, closes on Escape and restores focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const menu = page.getByRole('button', { name: 'Menu', exact: true });
    await menu.click();
    const dialog = page.getByRole('dialog', { name: 'Menu' });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(
        () =>
          Boolean(document.activeElement?.closest('#mobile-menu')) ||
          document.activeElement === document.body,
      );
      expect(inside).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(menu).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    // Touch-sized targets in the drawer.
    await menu.click();
    const box = await dialog.getByRole('link', { name: 'Portfolio' }).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('respects reduced motion: nothing is hidden waiting for an animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.classList.contains('motion-ok')),
    ).toBe(false);
    const hidden = await page.evaluate(
      () =>
        [...document.querySelectorAll('[data-reveal]')].filter(
          (el) => getComputedStyle(el).opacity !== '1',
        ).length,
    );
    expect(hidden).toBe(0);
  });

  test('with motion enabled, below-the-fold content reveals when scrolled into view', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    expect(
      await page.evaluate(() => document.documentElement.classList.contains('motion-ok')),
    ).toBe(true);
    const card = page.locator('[data-reveal]').first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute('data-revealed', '');
    await expect(card).toHaveCSS('opacity', '1');
  });

  test('shows an intentional holding page when the homepage is not published', async ({ page }) => {
    await page.unroute('**/api/v1/**');
    await mockApi(page, {
      '/public/pages/home': {
        __status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Not found.' } },
      },
      '/public/site': { ...FIXTURE_SITE, navigation: null, footer: null },
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Our new website is being prepared',
    );
    await expect(page.locator('body')).not.toContainText('[CONFIRM');
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test('shows a friendly error (no internals) when the API fails', async ({ page }) => {
    await page.unroute('**/api/v1/**');
    await mockApi(page, {
      '/public/pages/home': {
        __status: 503,
        body: {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'MongoServerSelectionError at db.js:12' },
        },
      },
    });
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText('This content could not be loaded');
    await expect(page.locator('body')).not.toContainText('MongoServerSelectionError');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('the development catalogue and fixtures are not part of the production build', async ({
    page,
  }) => {
    const scripts = [];
    page.on('response', async (response) => {
      if (response.url().endsWith('.js')) scripts.push(await response.text());
    });
    await page.goto('/__dev/catalogue');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
    await page.waitForLoadState('networkidle');
    const code = scripts.join('\n');
    expect(code.length).toBeGreaterThan(1000);
    expect(code).not.toContain('Development catalogue');
    expect(code).not.toContain('DEVELOPMENT FIXTURES');
    expect(code).not.toContain('Example Project A');
  });
});
