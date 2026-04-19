import { test, expect } from '@playwright/test';

// Helper: wait for map to fully load
const waitForMap = async (page: any) => {
  await page.goto('/map');
  await page.waitForSelector('.leaflet-marker-icon', { timeout: 15000 });
  await page.waitForTimeout(500);
};

// Helper: open the filter panel and wait for it to be visible
const openFilterPanel = async (page: any) => {
  await page.locator('button:has-text("Filters")').click({ timeout: 5000 });
  // Wait for the filter panel header to be visible
  await expect(page.locator('text=Map Filters')).toBeVisible({ timeout: 5000 });
};

// FE-251: Alpha Score Colour Grade Toggle
test.describe('MapView — Alpha Colour Toggle (FE-251)', () => {

  test('Alpha Colour toggle button is present and defaults to OFF', async ({ page }) => {
    await waitForMap(page);
    const alphaBtn = page.locator('button[title="Colour markers by Alpha Score"]');
    await expect(alphaBtn).toBeVisible({ timeout: 5000 });
    await expect(alphaBtn).toHaveClass(/text-linear-text-muted/);
  });

  test('toggling Alpha Colour switches button to active state', async ({ page }) => {
    await waitForMap(page);
    const alphaBtn = page.locator('button[title="Colour markers by Alpha Score"]');
    await alphaBtn.click({ timeout: 5000 });
    await expect(alphaBtn).toHaveClass(/text-blue-400/);
    await alphaBtn.click({ timeout: 5000 });
    await expect(alphaBtn).toHaveClass(/text-linear-text-muted/);
  });

  test('Alpha Colour toggle has colour dot indicator', async ({ page }) => {
    await waitForMap(page);
    const alphaBtn = page.locator('button[title="Colour markers by Alpha Score"]');
    await expect(alphaBtn).toBeVisible({ timeout: 5000 });
    await expect(alphaBtn.locator('span').nth(0)).toBeVisible();
    await expect(alphaBtn.locator('span').nth(1)).toBeVisible();
    await expect(alphaBtn.locator('span').nth(2)).toBeVisible();
  });
});

// FE-252: Multi-Select Status Filter
test.describe('MapView — Multi-Select Status Filter (FE-252)', () => {

  test('Filter panel opens on Filters button click', async ({ page }) => {
    await waitForMap(page);
    await openFilterPanel(page);
  });

  test('Status filter shows All + 4 status chips', async ({ page }) => {
    await waitForMap(page);
    await openFilterPanel(page);
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button:has-text("discovered")')).toBeVisible();
    await expect(page.locator('button:has-text("shortlisted")')).toBeVisible();
    await expect(page.locator('button:has-text("vetted")')).toBeVisible();
    await expect(page.locator('button:has-text("archived")')).toBeVisible();
  });

  test('All chip is active by default (empty set = all)', async ({ page }) => {
    await waitForMap(page);
    await openFilterPanel(page);
    const allChip = page.getByRole('button', { name: 'All', exact: true });
    await expect(allChip).toHaveClass(/text-white/);
    await expect(allChip).toHaveClass(/border-blue-500/);
  });

  test('clicking a status chip toggles it (checkbox indicator appears)', async ({ page }) => {
    await waitForMap(page);
    await openFilterPanel(page);
    // discovered is the safest status chip — no conflicts
    const discoveredChip = page.getByRole('button', { name: 'discovered' });
    await discoveredChip.click({ timeout: 5000 });
    await expect(discoveredChip.locator('svg path')).toBeVisible();
    await discoveredChip.click({ timeout: 5000 });
    await expect(discoveredChip.locator('svg path')).not.toBeVisible();
  });

  test('multiple status chips can be active simultaneously', async ({ page }) => {
    await waitForMap(page);
    await openFilterPanel(page);
    const shortlistedChip = page.getByRole('button', { name: 'shortlisted' });
    const vettedChip = page.getByRole('button', { name: 'vetted' });
    await shortlistedChip.click({ timeout: 5000 });
    await vettedChip.click({ timeout: 5000 });
    await expect(shortlistedChip.locator('svg path')).toBeVisible();
    await expect(vettedChip.locator('svg path')).toBeVisible();
  });

  test('All chip clears all status selections', async ({ page }) => {
    await waitForMap(page);
    await openFilterPanel(page);
    const allChip = page.getByRole('button', { name: 'All', exact: true });
    const shortlistedChip = page.getByRole('button', { name: 'shortlisted' });
    const vettedChip = page.getByRole('button', { name: 'vetted' });
    await shortlistedChip.click({ timeout: 5000 });
    await vettedChip.click({ timeout: 5000 });
    await expect(shortlistedChip.locator('svg path')).toBeVisible();
    await expect(vettedChip.locator('svg path')).toBeVisible();
    await allChip.click({ timeout: 5000 });
    await expect(shortlistedChip.locator('svg path')).not.toBeVisible();
    await expect(vettedChip.locator('svg path')).not.toBeVisible();
  });

  test('Reset button clears status filter and resets to All', async ({ page }) => {
    await waitForMap(page);
    await openFilterPanel(page);
    const shortlistedChip = page.getByRole('button', { name: 'shortlisted' });
    await shortlistedChip.click({ timeout: 5000 });
    await expect(shortlistedChip.locator('svg path')).toBeVisible();
    await page.getByRole('button', { name: 'Reset' }).click({ timeout: 5000 });
    await expect(shortlistedChip.locator('svg path')).not.toBeVisible();
  });

  test('Filters button shows badge with active filter count', async ({ page }) => {
    await waitForMap(page);
    await openFilterPanel(page);
    const shortlistedChip = page.getByRole('button', { name: 'shortlisted' });
    await shortlistedChip.click({ timeout: 5000 });
    const filterBtn = page.locator('button:has-text("Filters")');
    const badge = filterBtn.locator('.rounded-full.bg-blue-500');
    await expect(badge).toBeVisible({ timeout: 2000 });
    await expect(badge).toHaveText('1');
  });

  test('Filters button badge increments with each active filter', async ({ page }) => {
    await waitForMap(page);
    await openFilterPanel(page);
    const discoveredChip = page.getByRole('button', { name: 'discovered' });
    await discoveredChip.click({ timeout: 5000 });
    await page.locator('input[type="range"]').fill('5');
    const filterBtn = page.locator('button:has-text("Filters")');
    const badge = filterBtn.locator('.rounded-full.bg-blue-500');
    await expect(badge).toBeVisible({ timeout: 2000 });
    await expect(badge).toHaveText('2');
  });
});

// FE-253: View Property Button
test.describe('MapView — View Property Button (FE-253)', () => {

  test('View Property button appears in detail panel after clicking a marker', async ({ page }) => {
    await waitForMap(page);
    await page.evaluate(() => {
      const marker = document.querySelector('.leaflet-marker-icon') as HTMLElement;
      marker?.click();
    });
    await page.waitForTimeout(500);
    const viewBtn = page.locator('button:has-text("View Property")');
    await expect(viewBtn).toBeVisible({ timeout: 5000 });
  });

  test('View Property button navigates to /property/:id', async ({ page }) => {
    await waitForMap(page);
    await page.evaluate(() => {
      const marker = document.querySelector('.leaflet-marker-icon') as HTMLElement;
      marker?.click();
    });
    await page.waitForTimeout(500);
    await page.locator('button:has-text("View Property")').click({ timeout: 5000 });
    await page.waitForTimeout(1000);
    await expect(page.url()).toMatch(/\/property\/.+/);
  });

  test('View Property button has arrow icon', async ({ page }) => {
    await waitForMap(page);
    await page.evaluate(() => {
      const marker = document.querySelector('.leaflet-marker-icon') as HTMLElement;
      marker?.click();
    });
    await page.waitForTimeout(500);
    const viewBtn = page.locator('button:has-text("View Property")');
    await expect(viewBtn).toBeVisible({ timeout: 5000 });
    await expect(viewBtn.locator('svg')).toBeVisible();
  });
});

test.describe('MapView — Smoke & Regression', () => {

  test('map page loads without crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('/map');
    await page.waitForTimeout(2000);
    const filtered = errors.filter(e => !e.includes('404') && !e.includes('Failed to load resource'));
    expect(filtered).toHaveLength(0);
  });

  test('property markers render on the map', async ({ page }) => {
    await waitForMap(page);
    const markers = page.locator('.leaflet-marker-icon');
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('opening filter panel then closing it works', async ({ page }) => {
    await waitForMap(page);
    await openFilterPanel(page);
    // Close via the X button in the filter panel header
    await page.locator('text=Map Filters').locator('..').locator('button').locator('svg').click({ timeout: 3000 });
    await expect(page.locator('text=Map Filters')).not.toBeVisible({ timeout: 3000 });
  });
});
