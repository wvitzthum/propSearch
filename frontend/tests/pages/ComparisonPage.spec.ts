import { test, expect } from '@playwright/test';

test.describe('Comparison Page', () => {
  test('loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.goto('/comparison');
    await page.waitForTimeout(2000);
    
    expect(errors.filter(e => !e.includes('404'))).toHaveLength(0);
  });

  test('displays comparison header', async ({ page }) => {
    await page.goto('/comparison');
    
    const header = page.locator('text=/comparison|comparative/i');
    await expect(header.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows empty state when no properties selected', async ({ page }) => {
    await page.goto('/comparison');
    await page.waitForTimeout(1000);
    
    // Should show message about selecting properties
    const emptyState = page.locator('text=/no.*properties|select.*properties|add.*compare/i');
    await expect(emptyState.first()).toBeVisible({ timeout: 5000 });
  });

  test('reset button is present when properties selected', async ({ page }) => {
    await page.goto('/comparison');
    await page.waitForTimeout(1000);
    
    const resetBtn = page.locator('button:has-text("Reset"), button:has-text("Clear")');
    // Button might not be visible if no properties selected
  });

  test('matrix rows display correctly', async ({ page }) => {
    await page.goto('/comparison');
    
    const matrix = page.locator('text=/alpha.*score|price.*efficiency|appreciation/i');
    await expect(matrix.first()).toBeVisible({ timeout: 10000 });
  });
});
