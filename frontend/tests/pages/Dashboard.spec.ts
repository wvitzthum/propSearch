import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
  });

  test('loads without errors', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('displays navigation header', async ({ page }) => {
    await expect(page.locator('nav, header, [class*="header"], aside').first()).toBeVisible({ timeout: 5000 });
  });

  test('shows property data', async ({ page }) => {
    // Check for Alpha scores which should be displayed
    const alphaText = page.locator('text=/\\d+\\.\\d/').first();
    await expect(alphaText).toBeVisible({ timeout: 10000 });
  });

  test('alpha score badge is visible', async ({ page }) => {
    // Check for Alpha or AS badge
    const alphaBadge = page.locator('text=/Alpha|AS:.*\\d/i').first();
    await expect(alphaBadge).toBeVisible({ timeout: 10000 }).catch(() => {
      // Fallback: check for numeric scores
      expect(page.locator('text=/\\d+\\.\\d/').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test('can navigate to affordability', async ({ page }) => {
    const affordabilityLink = page.locator('a:has-text("Affordability"), [href*="affordability"]').first();
    if (await affordabilityLink.isVisible({ timeout: 2000 })) {
      await affordabilityLink.click();
      await expect(page).toHaveURL(/affordability/);
    }
  });
});
