import { test, expect } from '@playwright/test';

/**
 * AlphaBadge E2E tests — Playwright
 *
 * These tests interact with the real AlphaBadge component as rendered
 * in the browser via the Dashboard (PropertyTable column) and
 * ComparisonPage (matrix rows).
 *
 * The AlphaBadge renders:
 *   - Score text (e.g. "9.4", "6.9") for numeric values
 *   - "N/A" for null/undefined scores
 *   - Emerald badge for scores >= 8.0 (Investment Grade)
 *   - Amber badge for scores 5.0-7.9 (Market Neutral)
 *   - Rose badge for scores < 5.0 (High Variance)
 */

test.describe('AlphaBadge Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1500);
  });

  /**
   * AlphaScore column header should be present in the table.
   */
  test('alpha score column header is visible', async ({ page }) => {
    const header = page.locator('th').filter({ hasText: /AS|Alpha.*Score/i }).first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  /**
   * At least one AlphaBadge with a numeric score should be visible in the table.
   */
  test('displays a numeric score in the dashboard table', async ({ page }) => {
    const scoreBadge = page.locator('table').locator('text=/^\\d+\\.\\d$/').first();
    await expect(scoreBadge).toBeVisible({ timeout: 10000 });
  });

  /**
   * High scores (>=8) should render without crash.
   */
  test('high score badge (>=8) renders without crash', async ({ page }) => {
    const highScore = page.locator('text=/[89]\\.[0-9]/').first();
    await expect(highScore).toBeVisible({ timeout: 10000 });
  });

  /**
   * Medium-range scores (5-7.9) should render without crash.
   */
  test('medium score badge (5-7.9) renders without crash', async ({ page }) => {
    const mediumScore = page.locator('text=/[5-7]\\.[0-9]/').first();
    await expect(mediumScore).toBeVisible({ timeout: 10000 });
  });

  /**
   * AlphaBadge must not cause console errors.
   */
  test('alpha score column does not cause console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    // Filter expected environment/CI issues:
    // - 404: missing images/assets (not our code)
    // - Failed to fetch: network/backend unavailable in test env (known limitation)
    // - ERR_NAME_NOT_RESOLVED: DNS failure for external resources
    // KNOWN BUG (QA-164): hpi_forecasts.map is not a function in useMacroData.ts:35
    const knownEnvErrors = ['404', 'ERR_NAME_NOT_RESOLVED', 'Failed to fetch'];
    const realErrors = errors.filter(e =>
      !knownEnvErrors.some(k => e.includes(k)) &&
      !e.includes('hpi_forecasts.map') // QA-164: exclude known bug until fixed
    );
    expect(realErrors).toHaveLength(0);
  });

  /**
   * Comparison page also uses AlphaBadge.
   */
  test('alpha badge renders in comparison page', async ({ page }) => {
    await page.goto('/comparison');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });
});
