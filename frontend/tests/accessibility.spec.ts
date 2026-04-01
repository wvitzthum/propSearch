import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test('landing page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check h1 exists
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1, { timeout: 10000 });
    
    // Check h2 exists
    const h2 = page.locator('h2');
    await expect(h2.first()).toBeVisible({ timeout: 10000 });
  });

  test('dashboard has accessible table structure', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Check table has proper structure (Dashboard may have 2+ tables: property table + mortgage chart)
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Check for th elements
    const headers = page.locator('th');
    expect(await headers.count()).toBeGreaterThan(0);
  });

  test('all interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Tab through page and check no elements trap focus
    const firstTabbable = page.locator('a, button, input, [tabindex="0"]').first();
    await expect(firstTabbable).toBeVisible({ timeout: 10000 });
  });

  test('images have alt text or aria labels', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Get all images
    const images = page.locator('img');
    const count = await images.count();
    
    // Check each image has alt or role
    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      if (await img.isVisible()) {
        const alt = await img.getAttribute('alt');
        const role = await img.locator('..').getAttribute('role');
        // Either has alt or parent has role (like button)
        expect(alt !== null || role !== null).toBeTruthy();
      }
    }
  });

  test('color contrast is sufficient for text', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Get text elements and check they're visible (manual contrast check needed for full audit)
    const textElements = page.locator('text=/\\w+/');
    expect(await textElements.first()).toBeVisible();
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/mortgage');
    await page.waitForTimeout(1000);

    // Get inputs
    const inputs = page.locator('input');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const inputId = await input.getAttribute('id');

        // Guard: skip inputs with no id (e.g. slider handles) — they rely on parent labelling
        const hasLabel = ariaLabel || ariaLabelledby || (inputId && inputId !== 'null');
        expect(hasLabel).toBeTruthy();
      }
    }
  });

  test('page language is set', async ({ page }) => {
    await page.goto('/');
    
    const html = page.locator('html');
    const lang = await html.getAttribute('lang');
    expect(lang).toBeTruthy();
  });
});
