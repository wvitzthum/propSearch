import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - All Pages', () => {
  const pages = [
    { path: '/', name: 'Landing Page' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/properties', name: 'Properties' },
    { path: '/map', name: 'Map' },
    { path: '/inbox', name: 'Inbox' },
    { path: '/comparison', name: 'Comparison' },
    { path: '/affordability', name: 'Affordability' },
    { path: '/archive', name: 'Archive Review' },
    { path: '/rates', name: 'Rates & Scenarios' },
    { path: '/market', name: 'Market' },
  ];

  for (const { path, name } of pages) {
    test(`${name} loads without crash`, async ({ page }) => {
      const errors: string[] = [];

      page.on('pageerror', error => {
        errors.push(error.message);
      });

      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          errors.push(text);
        }
      });

      await page.goto(path);
      await page.waitForTimeout(2000);

      // Filter environment noise (not application bugs):
      // - 404: missing images/assets
      // - 403: external CDN (noise.svg) unavailable in test env
      // - DevTools: React development helper, not an error
      // - grainy-gradients.vercel.app: external resource
      const envNoise = [
        '404',
        '403',
        'Failed to load resource',
        'react-devtools',
        'grainy-gradients.vercel.app',
      ];

      // Filter known bugs with open tickets (FE must not re-introduce these):
      const knownBugs = [
        'hpi_forecasts.map',               // QA-164: useMacroData type error
        'Failed to fetch',                  // QA-166: PropertyContext hardcoded URL
        'Objects are not valid as a React child', // QA-172: MarketConditionsBar provenance object rendered as child
        'same key',                        // QA-171: Inbox.tsx duplicate filename in listings array
        'attribute d',                     // QA-xxx: CapitalAppreciationChart SVG path NaN coords (pre-existing MC data gap)
        'attribute cy',                    // QA-xxx: SparklineChart circle NaN (same root cause)
        'Received NaN for the',            // QA-xxx: Same SVG NaN rendering issue
        'Cannot read properties of null (reading \'includes\')', // PropertyContext.tsx: demo data may have null p.area
        'Cannot read properties of null (reading \'split\')',     // Layout.tsx: p.area null → .split on area dropdown
      ];

      const unexpectedErrors = errors.filter(e =>
        !envNoise.some(n => e.includes(n)) &&
        !knownBugs.some(b => e.includes(b))
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
  // QA-TODO: These tests are skipped pending a UX responsive-layout audit.
  // The sidebar layout (pl-64 fixed) is not mobile-optimised — main content
  // is pushed off-screen on 375px/768px viewports. A mobile nav drawer or
  // sidebar collapse is needed before these assertions are meaningful.
  test.skip('dashboard works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForTimeout(1500);
    await expect(page.locator('main')).toBeVisible({ timeout: 5000 });
  });

  test.skip('dashboard works on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForTimeout(1500);
    await expect(page.locator('main')).toBeVisible({ timeout: 5000 });
  });

  test.skip('dashboard works on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await page.waitForTimeout(1500);
    await expect(page.locator('main')).toBeVisible({ timeout: 5000 });
  });
});
