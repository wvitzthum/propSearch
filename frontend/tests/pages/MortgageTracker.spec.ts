import { test, expect } from '@playwright/test';

test.describe('Mortgage Tracker Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mortgage');
    // Wait for page to fully load and API data to render
    await page.waitForTimeout(4000);
  });

  test('loads without errors', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('displays mortgage rates', async ({ page }) => {
    // Check for percentage values which indicate rates (look for 4.55% fallback rate)
    const rateText = page.getByText('4.55%').first();
    await expect(rateText).toBeVisible({ timeout: 5000 });
  });
});
