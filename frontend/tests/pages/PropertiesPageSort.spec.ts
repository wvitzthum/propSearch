import { test, expect } from '@playwright/test';

/**
 * properties_sort.spec.ts — QA-199 & QA-200
 *
 * BUG-007: PropertiesPage ignores sortBy/sortOrder URL params on initial page load.
 * Without the fix, navigating to /properties?status=watchlist&sortBy=alpha_score&sortOrder=ASC
 * would show DESC ordering (alpha 5.1 first) because sortOrder was never read from the URL.
 *
 * NOTE on LIMIT 100: The backend query uses LIMIT 100. With ASC sort, watchlist properties
 * with higher alpha scores (4.2-5.1) fall beyond row 100, so only 1 is returned by the API.
 * With DESC sort, 6 watchlist properties are within the first 100 rows. This is a separate
 * backend limitation (DE-242). The tests below verify BUG-007 fix is working correctly
 * by checking that sort DIRECTION is respected, not absolute row counts.
 */

test.describe('BUG-007 / QA-199 / QA-200: PropertiesPage Sort Order from URL', () => {

  // ── QA-199 Test 1: ASC sort from URL — BUG-007 core behavior ─────────────────
  test('URL sortOrder=ASC is respected on initial load — lowest alpha_score row appears first', async ({ page }) => {
    await page.goto('/properties?status=watchlist&sortBy=alpha_score&sortOrder=ASC');
    await page.waitForTimeout(3000);

    // The first table data row should have an alpha score of 3.6 (lowest watchlist alpha).
    // BUG-007 symptom (before fix): first row would show 5.1 because sortOrder was ignored.
    const firstAlphaCell = page.locator('tbody tr td').nth(2);
    await expect(firstAlphaCell).toBeVisible({ timeout: 10000 });
    const alphaText = await firstAlphaCell.textContent();
    expect(alphaText?.trim()).toBe('3.6');
  });

  // ── QA-199 Test 2: DESC sort from URL — verify sort direction is respected ──────
  test('URL sortOrder=DESC is respected on initial load — highest alpha_score row appears first', async ({ page }) => {
    await page.goto('/properties?status=watchlist&sortBy=alpha_score&sortOrder=DESC');
    await page.waitForTimeout(3000);

    // First alpha cell should show 5.1 (highest alpha among returned rows)
    const firstAlphaCell = page.locator('tbody tr td').nth(2);
    await expect(firstAlphaCell).toBeVisible({ timeout: 10000 });
    const alphaText = await firstAlphaCell.textContent();
    expect(alphaText?.trim()).toBe('5.1');
  });

  // ── QA-200 Test 3: Watchlist shows ≥1 row in ASC (not zero) ───────────────────
  test('watchlist sort ASC shows at least 1 watchlist property (BUG-007: sort applied correctly)', async ({ page }) => {
    await page.goto('/properties?status=watchlist&sortBy=alpha_score&sortOrder=ASC');
    await page.waitForTimeout(3000);

    // With ASC, the backend LIMIT 100 returns only the lowest-alpha watchlist property (3.6).
    // At minimum, 1 row should be visible.
    const propertyRows = page.locator('tbody tr');
    const count = await propertyRows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // The Watchlist status chip in the first row should say "Watchlist"
    // First td is batch checkbox (empty), second td is status cell
    const firstStatusCell = page.locator('tbody tr td').nth(1);
    await expect(firstStatusCell).toContainText(/Watchlist/i);
  });

  // ── QA-200 Test 4: Watchlist shows multiple rows in DESC ───────────────────────
  test('watchlist sort DESC shows multiple watchlist properties', async ({ page }) => {
    await page.goto('/properties?status=watchlist&sortBy=alpha_score&sortOrder=DESC');
    await page.waitForTimeout(3000);

    // With DESC, the backend LIMIT 100 returns 6 watchlist properties
    const propertyRows = page.locator('tbody tr');
    const count = await propertyRows.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // ── QA-199 Test 5: Toggle sort direction via UI ───────────────────────────────
  test('clicking Alpha column toggles sort direction — BUG-007 UI interaction', async ({ page }) => {
    await page.goto('/properties?status=watchlist&sortBy=alpha_score&sortOrder=DESC');
    await page.waitForTimeout(3000);

    // Verify DESC loaded correctly (first row alpha = 5.1)
    let firstAlphaCell = page.locator('tbody tr td').nth(2);
    await expect(firstAlphaCell).toBeVisible({ timeout: 10000 });
    await expect(firstAlphaCell).toHaveText('5.1');

    // Click the Alpha header to toggle to ASC
    const alphaHeader = page.locator('th', { hasText: /Alpha/i }).first();
    await alphaHeader.click();
    await page.waitForTimeout(1500);

    // Now first row should show 3.6 (ASC: lowest alpha first)
    firstAlphaCell = page.locator('tbody tr td').nth(2);
    await expect(firstAlphaCell).toBeVisible({ timeout: 10000 });
    await expect(firstAlphaCell).toHaveText('3.6');
  });

  // ── QA-199 Test 6: URL is updated when sort direction changes via UI ───────────
  test('URL is updated when sort direction changes via UI — syncAllFiltersToUrl working', async ({ page }) => {
    await page.goto('/properties?status=watchlist');
    await page.waitForTimeout(3000);

    // Initial URL should NOT have sort params (defaults applied client-side)
    await expect(page).toHaveURL(/\/properties\?status=watchlist$/);

    // Click the Alpha header — should set ASC
    const alphaHeader = page.locator('th', { hasText: /Alpha/i }).first();
    await alphaHeader.click();

    // Wait for the URL to include sortOrder=ASC (debounce + React render)
    await page.waitForURL('**/properties?status=watchlist&sortBy=alpha_score&sortOrder=ASC', { timeout: 5000 });
  });

  // ── QA-199 Test 7: Page does not crash when navigating to ASC URL ──────────────
  test('page loads without crash when navigating to ASC sort URL', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/properties?status=watchlist&sortBy=alpha_score&sortOrder=ASC');
    await page.waitForTimeout(3000);

    // Table should be present
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // No JS crashes
    const jsErrors = errors.filter(e =>
      !e.includes('404') &&
      !e.includes('Failed to load resource') &&
      !e.includes('grainy-gradients')
    );
    expect(jsErrors).toHaveLength(0);
  });
});
