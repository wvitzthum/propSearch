import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  test('loads without errors', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('displays main content', async ({ page }) => {
    // Landing page should have some content
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });

  test('has navigation links', async ({ page }) => {
    // Should have some links to other pages
    const links = page.locator('a[href]');
    expect(await links.count()).toBeGreaterThan(0);
  });
});
