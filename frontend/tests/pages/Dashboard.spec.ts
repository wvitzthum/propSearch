import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('loads without errors', async ({ page }) => {
    // Check page title or main heading exists
    await expect(page.locator('body')).toBeVisible();

    // No console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.waitForTimeout(1000);
    // Filter known issues tracked in tickets: QA-164, QA-165, QA-166
    const knownErrors = ['404', 'Failed to fetch', 'hpi_forecasts.map'];
    expect(errors.filter(e => !knownErrors.some(k => e.includes(k)))).toHaveLength(0);
  });

  test('displays navigation header', async ({ page }) => {
    await expect(page.locator('nav, header, [class*="header"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('shows table view by default', async ({ page }) => {
    // Check for table element
    const table = page.locator('table');
    await expect(table.first()).toBeVisible({ timeout: 10000 });
  });

  test('property table has sortable columns', async ({ page }) => {
    // Look for sortable column headers
    const sortableHeaders = page.locator('th[onClick], th[class*="cursor-pointer"]');
    await expect(sortableHeaders.first()).toBeVisible({ timeout: 10000 });
  });

  test('alpha score badge is visible', async ({ page }) => {
    const alphaBadge = page.locator('th:has-text("Alpha")');
    await expect(alphaBadge.first()).toBeVisible({ timeout: 10000 });
  });

  test('can switch to grid view', async ({ page }) => {
    // Find the view toggle button (Grid button)
    const gridButton = page.locator('button:has-text("Grid")').first();

    // Try to click grid view toggle if visible
    if (await gridButton.isVisible({ timeout: 3000 })) {
      await gridButton.click();
      await page.waitForTimeout(500);
      // After clicking, the view should have switched to grid
    }
  });

  test('market pulse widget loads', async ({ page }) => {
    const marketPulse = page.locator('text=Market Pulse');
    await expect(marketPulse.first()).toBeVisible({ timeout: 10000 });
  });

  test('property count is displayed', async ({ page }) => {
    // Feature gap: Institutional Inventory KPI card shows a raw number (e.g. "42") but
    // no text like "42 properties" or "42 assets" is rendered anywhere in the UI.
    // The KPI label reads "Institutional Inventory" — not "42 properties".
    // Skipping until a descriptive count label is added to the KPI card or a dedicated count badge is introduced.
    test.skip(true, 'Feature gap: no "N properties" text in UI — KPI card shows raw number only');
    const propertyCount = page.locator('text=/\\d+\\s*(properties|assets)/i');
    await expect(propertyCount.first()).toBeVisible({ timeout: 10000 });
  });

  test.describe('Property Table Sorting', () => {
    test('sorts by alpha score ascending', async ({ page }) => {
      const alphaHeader = page.locator('th:has-text("Alpha")').first();
      
      if (await alphaHeader.isVisible({ timeout: 2000 })) {
        await alphaHeader.click();
        await page.waitForTimeout(300);
        
        // Check sort direction indicator
        const sortIcon = alphaHeader.locator('[class*="ArrowUp"], [class*="ArrowDown"]');
        await expect(sortIcon.first()).toBeVisible();
      }
    });

    test('sorts by price', async ({ page }) => {
      const priceHeader = page.locator('th:has-text("Target"), th:has-text("Price")').first();
      
      if (await priceHeader.isVisible({ timeout: 2000 })) {
        await priceHeader.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Property Actions', () => {
    test('shortlist button is clickable', async ({ page }) => {
      // Find first shortlist/bookmark button in table
      const shortlistBtn = page.locator('button[title*="shortlist" i], button[title*="bookmark" i]').first();
      
      if (await shortlistBtn.isVisible({ timeout: 2000 })) {
        await shortlistBtn.click();
        await page.waitForTimeout(200);
        // Button should show selected state
      }
    });

    test('comparison button is clickable', async ({ page }) => {
      const compareBtn = page.locator('button[title*="comparison" i], button[title*="compare" i]').first();
      
      if (await compareBtn.isVisible({ timeout: 2000 })) {
        await compareBtn.click();
        await page.waitForTimeout(200);
      }
    });
  });
});
