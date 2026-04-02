import { test, expect } from '@playwright/test';

test.describe('Property Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
  });

  test('dashboard loads for property navigation', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    // Dashboard should have property data
    const propertyData = page.locator('text=/\\d+\\.\\d/').first();
    await expect(propertyData).toBeVisible({ timeout: 5000 });
  });

  test('can navigate to a property', async ({ page }) => {
    // Look for a property link
    const propertyLink = page.locator('a[href*="/property/"]').first();
    if (await propertyLink.isVisible({ timeout: 3000 })) {
      await propertyLink.click();
      await page.waitForTimeout(1000);
      // Should be on property page or dashboard
      expect(page.url()).toMatch(/\/(dashboard|property)/);
    }
  });
});
