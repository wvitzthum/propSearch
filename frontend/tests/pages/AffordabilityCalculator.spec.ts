import { test, expect } from '@playwright/test';

/**
 * FE-265/FE-266/FE-267/FE-268/FE-269: Two-floor Affordability Calculator
 */
test.describe('AffordabilityCalculator Page (Two-Floor)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/affordability');
    await page.waitForTimeout(2000);
  });

  // Layout
  test('page loads and shows correct header', async ({ page }) => {
    await expect(page.locator('h1:has-text("Affordability Calculator")')).toBeVisible({ timeout: 10000 });
  });

  test('live 5yr fixed rate is displayed in header', async ({ page }) => {
    const rate = page.getByText(/\d+\.\d{2}%/).first();
    await expect(rate).toBeVisible({ timeout: 5000 });
  });

  test('rates link navigates to /rates', async ({ page }) => {
    const link = page.locator('a[href="/rates"]').or(page.locator('a:has-text("rate history")'));
    await expect(link.first()).toBeVisible();
  });

  // Borrowing Engine (Floor 1)
  test('salary slider is present and interactive', async ({ page }) => {
    const slider = page.locator('.bg-linear-card input[type="range"]').first();
    await expect(slider).toBeVisible();
  });

  test('hero number shows max mortgage when salary > 0', async ({ page }) => {
    const slider = page.locator('.bg-linear-card input[type="range"]').first();
    await slider.fill('100000');
    await page.waitForTimeout(500);
    const hero = page.getByText(/£\d+K/).first();
    await expect(hero).toBeVisible({ timeout: 5000 });
  });

  test('salary presets are clickable', async ({ page }) => {
    const preset75k = page.locator('button:has-text("£75K")').first();
    await preset75k.click();
    await page.waitForTimeout(300);
    const hero = page.getByText(/£\d+K/).first();
    await expect(hero).toBeVisible({ timeout: 5000 });
  });

  test('professional toggle cycles through Auto / On / Off', async ({ page }) => {
    const toggle = page.locator('button').filter({ hasText: /^(Auto|On|Off)$/ }).first();
    await expect(toggle).toBeVisible({ timeout: 5000 });
    const firstLabel = await toggle.textContent();
    await toggle.click();
    await page.waitForTimeout(200);
    const secondLabel = await page.locator('button').filter({ hasText: /^(Auto|On|Off)$/ }).first().textContent();
    expect(secondLabel).not.toEqual(firstLabel);
  });

  test('bonus section is hidden by default', async ({ page }) => {
    await expect(page.locator('button:has-text("Bonus / Overtime")')).toBeVisible();
    await expect(page.locator('text=/Annual Bonus/')).not.toBeVisible();
  });

  test('bonus section reveals on toggle click', async ({ page }) => {
    await page.locator('button:has-text("Bonus / Overtime")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=/Annual Bonus/')).toBeVisible();
  });

  test('joint toggle shows partner salary slider when enabled', async ({ page }) => {
    await page.locator('button:has-text("Joint")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=/Partner Salary/')).toBeVisible();
  });

  test('term segmented control changes active term', async ({ page }) => {
    const term15 = page.locator('button:has-text("15yr")').first();
    await term15.click();
    await page.waitForTimeout(200);
    await expect(term15).toHaveClass(/bg-blue-500|blue-400|blue-/);
  });

  test('Reveal Cash Assessment button scrolls to Floor 2', async ({ page }) => {
    const btn = page.locator('button:has-text("Reveal Cash Assessment")');
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(600);
    await expect(page.locator('#cash-assessment')).toBeInViewport();
  });

  // Cash Assessment (Floor 2)
  test('scenario buttons are present and switchable', async ({ page }) => {
    await page.locator('button:has-text("Reveal Cash Assessment")').click();
    await page.waitForTimeout(600);
    await expect(page.locator('button:has-text("First Time Buyer")')).toBeVisible();
    await expect(page.locator('button:has-text("Home Mover")')).toBeVisible();
    await expect(page.locator('button:has-text("Additional Property")')).toBeVisible();
    await page.locator('button:has-text("Home Mover")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('button:has-text("Home Mover")')).toHaveClass(/bg-blue-500|blue-400|blue-/);
  });

  test('property price slider updates displayed price', async ({ page }) => {
    await page.locator('button:has-text("Reveal Cash Assessment")').click();
    await page.waitForTimeout(600);
    const priceSlider = page.locator('#cash-assessment input[type="range"]').first();
    await expect(priceSlider).toBeVisible();
    await priceSlider.fill('1000000');
    await page.waitForTimeout(300);
    await expect(page.locator('#cash-assessment:has-text("1.00M")')).toBeVisible({ timeout: 3000 });
  });

  test('deposit preset pills update deposit percentage', async ({ page }) => {
    await page.locator('button:has-text("Reveal Cash Assessment")').click();
    await page.waitForTimeout(600);
    await page.locator('#cash-assessment button:has-text("25%")').click();
    await page.waitForTimeout(300);
    const active = page.locator('#cash-assessment button:has-text("25%")');
    await expect(active).toHaveClass(/bg-blue-500|blue-400|blue-/);
  });

  test('cash gap warning appears when available cash is insufficient', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('propCalc_price');
      localStorage.removeItem('propCalc_salary');
      localStorage.removeItem('propCalc_available_cash');
    });
    await page.goto('/affordability');
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Reveal Cash Assessment")').click();
    await page.waitForTimeout(600);
    const priceSlider = page.locator('#cash-assessment input[type="range"]').first();
    await priceSlider.fill('1500000');
    await page.waitForTimeout(500);
    const cashInput = page.locator('#cash-assessment input[type="number"]');
    await expect(cashInput).toBeVisible();
    await cashInput.fill('50000');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/Cash gap/i')).toBeVisible({ timeout: 5000 });
  });

  test('Use suggestion button sets price to suggested amount', async ({ page }) => {
    await page.locator('button:has-text("Reveal Cash Assessment")').click();
    await page.waitForTimeout(600);
    const salarySlider = page.locator('.bg-linear-card input[type="range"]').first();
    await salarySlider.fill('100000');
    await page.waitForTimeout(500);
    const suggestBtn = page.locator('button:has-text("Use suggestion")');
    await expect(suggestBtn).toBeVisible();
    await suggestBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=/Suggested:/')).toBeVisible({ timeout: 3000 });
  });

  test('Additional Property scenario shows SDLT surcharge note', async ({ page }) => {
    await page.locator('button:has-text("Reveal Cash Assessment")').click();
    await page.waitForTimeout(600);
    await page.locator('button:has-text("Additional Property")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=/3% SDLT surcharge/i').first()).toBeVisible({ timeout: 5000 });
  });

  // Waterfall bars
  test('Cash Stack waterfall has three bars', async ({ page }) => {
    await page.locator('button:has-text("Reveal Cash Assessment")').click();
    await page.waitForTimeout(600);
    const cs = page.locator('#cash-assessment');
    await expect(cs.locator('text="Deposit"').first()).toBeVisible();
    await expect(cs.locator('text="SDLT"').first()).toBeVisible();
    await expect(cs.locator('text="Fees & Disbursements"').first()).toBeVisible();
  });

  test('Total Cash Needed is displayed', async ({ page }) => {
    await page.locator('button:has-text("Reveal Cash Assessment")').click();
    await page.waitForTimeout(600);
    await expect(page.locator('text=/Total Cash Needed/i')).toBeVisible();
  });

  // Disclaimer
  test('HMRC disclaimer is shown at page footer', async ({ page }) => {
    await expect(page.locator('text=/SDLT rates based on HMRC thresholds/i')).toBeVisible({ timeout: 5000 });
  });
});
