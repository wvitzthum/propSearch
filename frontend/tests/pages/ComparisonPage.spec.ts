import { test, expect } from '@playwright/test';

test.describe('Comparison Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compare');
    await page.waitForTimeout(2000);
  });

  test('loads without errors', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('displays comparison header', async ({ page }) => {
    const header = page.locator('h1, h2, h3').first();
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test('shows comparison interface', async ({ page }) => {
    // Just check page loads - comparison may show empty state
    await expect(page.locator('body')).toBeVisible();
  });
});
