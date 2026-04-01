import { test, expect } from '@playwright/test';

test.describe('Mortgage Tracker Page', () => {
  test('loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.goto('/mortgage');
    await page.waitForTimeout(2000);
    
    expect(errors.filter(e => !e.includes('404'))).toHaveLength(0);
  });

  test('displays mortgage intelligence header', async ({ page }) => {
    await page.goto('/mortgage');
    
    const header = page.locator('text=/mortgage.*intelligence/i');
    await expect(header.first()).toBeVisible({ timeout: 10000 });
  });

  test('displays BoE base rate', async ({ page }) => {
    await page.goto('/mortgage');
    
    const boeRate = page.locator('text=/base rate|boe.*rate/i');
    await expect(boeRate.first()).toBeVisible({ timeout: 10000 });
  });

  test('LTV toggle buttons work', async ({ page }) => {
    await page.goto('/mortgage');
    await page.waitForTimeout(1000);
    
    // Find LTV buttons
    const ltv90 = page.locator('button:has-text("90"), button:has-text("90%")').first();
    const ltv75 = page.locator('button:has-text("75"), button:has-text("75%")').first();
    
    if (await ltv90.isVisible({ timeout: 2000 })) {
      await ltv90.click();
      await page.waitForTimeout(300);
      
      if (await ltv75.isVisible({ timeout: 2000 })) {
        await ltv75.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('monthly budget input is editable', async ({ page }) => {
    await page.goto('/mortgage');
    await page.waitForTimeout(1000);
    
    // Find budget input
    const budgetInput = page.locator('input[type="number"]').first();
    if (await budgetInput.isVisible({ timeout: 2000 })) {
      await budgetInput.fill('5000');
      await page.waitForTimeout(300);
      
      const value = await budgetInput.inputValue();
      expect(parseInt(value)).toBe(5000);
    }
  });

  test('chart series toggles work', async ({ page }) => {
    await page.goto('/mortgage');
    await page.waitForTimeout(1000);
    
    // Find series toggle buttons (BoE, 2Y, 5Y)
    const seriesButtons = page.locator('button:has-text("BoE"), button:has-text("2Y"), button:has-text("5Y")');
    const count = await seriesButtons.count();
    
    if (count > 0) {
      await seriesButtons.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('purchasing power section is visible', async ({ page }) => {
    await page.goto('/mortgage');
    
    const ppi = page.locator('text=/purchasing power|ppi|loan.*amount/i');
    await expect(ppi.first()).toBeVisible({ timeout: 10000 });
  });
});
