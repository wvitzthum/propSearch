import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - All Pages', () => {
  const pages = [
    { path: '/', name: 'Landing Page' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/comparison', name: 'Comparison' },
    { path: '/mortgage', name: 'Mortgage Tracker' },
    { path: '/inbox', name: 'Inbox' },
  ];

  for (const { path, name } of pages) {
    test(`${name} loads without crash`, async ({ page }) => {
      const errors: string[] = [];

      page.on('pageerror', error => {
        errors.push(error.message);
      });

      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('404')) {
          errors.push(msg.text());
        }
      });

      await page.goto(path);
      await page.waitForTimeout(2000);

      // Filter known bugs already tracked in tickets:
      // QA-164: hpi_forecasts.map is not a function (useMacroData type error)
      // QA-166: Failed to fetch (PropertyContext hardcoded localhost URL in test env)
      const knownBugPatterns = [
        'hpi_forecasts.map',
        'Failed to fetch',
      ];
      const unexpectedErrors = errors.filter(e =>
        !knownBugPatterns.some(p => e.includes(p)) &&
        (e.includes('Uncaught') || e.includes('TypeError'))
      );
      expect(unexpectedErrors).toHaveLength(0);
    });
  }

  test('navigation works between pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const dashboardLink = page.locator('a[href="/dashboard"]').first();
    if (await dashboardLink.isVisible({ timeout: 3000 })) {
      await dashboardLink.click();
      await expect(page).toHaveURL(/\/dashboard/);
      await page.waitForTimeout(1000);

      const mortgageLink = page.locator('a[href="/mortgage"]').first();
      if (await mortgageLink.isVisible({ timeout: 2000 })) {
        await mortgageLink.click();
        await expect(page).toHaveURL(/\/mortgage/);
      }
    }
  });
});

test.describe('Responsive Design', () => {
  test('dashboard works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('dashboard works on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('dashboard works on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });
});
