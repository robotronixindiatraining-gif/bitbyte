import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, horizontalOverflow, stubTurnstile } from './support.js';

const SECTION_TYPES = [
  'hero',
  'richText',
  'serviceGrid',
  'projectShowcase',
  'testimonials',
  'stats',
  'featureList',
  'processSteps',
  'splitContent',
  'ctaBanner',
  'faq',
  'engagementModels',
  'contactForm',
  'jobList',
  'clientLogos',
];

/** Development server: the catalogue exists only here. */
test.describe('component catalogue (development only)', () => {
  test.beforeEach(async ({ page }) => {
    await stubTurnstile(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('renders all 15 section types', async ({ page }) => {
    await page.goto('/__dev/catalogue');
    for (const type of SECTION_TYPES) {
      await expect(
        page.locator(`[data-catalogue-section="${type}"] [data-section-type="${type}"]`),
      ).toHaveCount(1);
    }
  });

  for (const surface of ['light', 'muted', 'dark']) {
    test(`every section on the ${surface} surface passes axe and fits 360px`, async ({
      page,
    }, testInfo) => {
      await page.goto(`/__dev/catalogue?surface=${surface}`);
      await expect(page.locator('[data-section-type="hero"]').first()).toBeVisible();
      await expectNoAxeViolations(page, { include: '[data-catalogue-section]' });
      await page.setViewportSize({ width: 360, height: 800 });
      expect(await horizontalOverflow(page)).toBe(0);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({
        path: testInfo.outputPath(`catalogue-${surface}.png`),
        fullPage: true,
      });
    });
  }

  test('tokens, primitives and states pass axe', async ({ page }) => {
    await page.goto('/__dev/catalogue');
    await expectNoAxeViolations(page, { exclude: '[data-catalogue-section]' });
  });

  test('shows the full homepage preview from fixtures', async ({ page }) => {
    await page.goto('/__dev/catalogue/home');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('built bit by bit');
    await expectNoAxeViolations(page);
  });
});
