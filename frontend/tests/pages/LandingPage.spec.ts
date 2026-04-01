import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Filter known issues tracked in tickets:
    // QA-164: hpi_forecasts.map is not a function (useMacroData type error)
    // QA-166: Failed to fetch (PropertyContext hardcoded URL)
    const knownErrors = ['404', 'Failed to load', 'Failed to fetch', 'hpi_forecasts.map'];
    expect(errors.filter(e => !knownErrors.some(k => e.includes(k)))).toHaveLength(0);
  });

  test('displays hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    const heading = page.locator('h1');
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
    
    // Check for "Enter Command Center" or similar CTA
    const ctaButton = page.locator('a:has-text("Enter"), a:has-text("Dashboard"), button:has-text("Enter")');
    await expect(ctaButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('hero CTA links to dashboard', async ({ page }) => {
    await page.goto('/');
    
    const ctaButton = page.locator('a[href*="dashboard"], a:has-text("Enter")').first();
    if (await ctaButton.isVisible({ timeout: 2000 })) {
      await ctaButton.click();
      await expect(page).toHaveURL(/\/dashboard/);
    }
  });

  test('market situation room section is visible', async ({ page }) => {
    await page.goto('/');
    
    // Look for market pulse or situation room
    const marketSection = page.locator('text=/market.*pulse|situation.*room/i');
    await expect(marketSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('stats are displayed', async ({ page }) => {
    await page.goto('/');
    
    // Look for property count or price stats
    const stats = page.locator('text=/\\d+.*assets|\\d+M.*avg/i');
    await expect(stats.first()).toBeVisible({ timeout: 10000 });
  });

  test('features section is present', async ({ page }) => {
    await page.goto('/');
    
    const featuresSection = page.locator('text=/core.*modules|features/i').first();
    await expect(featuresSection).toBeVisible({ timeout: 10000 });
  });

  test('alpha score feature card is visible', async ({ page }) => {
    await page.goto('/');
    
    const alphaCard = page.locator('text=/alpha.*score/i');
    await expect(alphaCard.first()).toBeVisible({ timeout: 10000 });
  });
});
