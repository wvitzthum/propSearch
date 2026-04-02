import { test, expect } from '@playwright/test';

test.describe('AlphaBadge Component', () => {
  test('dashboard displays alpha scores', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Dashboard should display alpha scores (numeric values like 9.4, 8.9, etc.)
    const alphaScores = page.locator('text=/\\d+\\.\\d/');
    await expect(alphaScores.first()).toBeVisible({ timeout: 10000 });
  });
});
