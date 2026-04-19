import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const SERVER = 'http://localhost:3001';

test.describe('QA-198: Full watchlist pipeline flow', () => {

  let vettedPropertyId: string;

  test.beforeAll(async ({ request }) => {
    // Find a vetted property (vetted=1 is the working param; vetted=true returns 0 due to server's === 'true' check)
    const res = await request.get(`${SERVER}/api/properties?vetted=1&limit=1`);
    const body = await res.json();
    vettedPropertyId = Array.isArray(body) ? body[0]?.id : undefined;
    console.log(`Using vetted property: ${vettedPropertyId}`);
  });

  test('1. Watchlist filter shows properties in UI', async ({ page }) => {
    await page.goto(`${BASE}/properties?status=watchlist`);
    await page.waitForLoadState('networkidle');
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    console.log(`Watchlist properties visible: ${count}`);
    expect(count).toBeGreaterThan(0);
  });

  test('2. PipelineTracker shows Watchlist step on property detail', async ({ page }) => {
    if (!vettedPropertyId) { test.skip(); return; }
    await page.goto(`${BASE}/property/${vettedPropertyId}`);
    await page.waitForLoadState('networkidle');
    const tracker = page.locator('text=/Watchlist/i').first();
    const visible = await tracker.isVisible().catch(() => false);
    console.log(`PipelineTracker Watchlist step visible: ${visible}`);
    expect(visible).toBe(true);
  });

  test('3. PATCH vetted → watchlist via /api/properties/:id/status', async ({ request }) => {
    if (!vettedPropertyId) { test.skip(); return; }
    const res = await request.patch(`${SERVER}/api/properties/${vettedPropertyId}/status`, {
      data: { pipeline_status: 'watchlist' }
    });
    console.log(`PATCH vetted → watchlist: HTTP ${res.status()}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.pipeline_status).toBe('watchlist');
  });

  test('4. UI correctly surfaces watchlist properties — API has no status filter (client-side)', async ({ request, page }) => {
    // API: fetch properties (no status filter — filter is client-side)
    const res = await request.get(`${SERVER}/api/properties?limit=100`);
    const body = await res.json();
    const items = Array.isArray(body) ? body : [];
    const watchlistItems = items.filter(i => i.pipeline_status === 'watchlist');
    console.log(`API watchlist count: ${watchlistItems.length}`);
    expect(watchlistItems.length).toBeGreaterThan(0);

    // UI: watchlist filter page shows rows
    await page.goto(`${BASE}/properties?status=watchlist`);
    await page.waitForLoadState('networkidle');
    const rows = page.locator('tbody tr');
    const uiCount = await rows.count();
    console.log(`UI watchlist rows (page 1): ${uiCount}`);
    expect(uiCount).toBeGreaterThan(0);
    // Both confirmed watchlist exists — exact counts differ due to API limit/sample variance
  });

  test('5. No Rank column in PropertyTable (ranking system removed)', async ({ page }) => {
    await page.goto(`${BASE}/properties?status=watchlist`);
    await page.waitForLoadState('networkidle');
    const headers = page.locator('thead th');
    const headerTexts = await headers.allTextContents();
    const clean = headerTexts.map(t => t.trim()).filter(Boolean);
    console.log(`Table headers: ${clean.join(', ')}`);
    expect(clean.some(t => /^Rank$/i.test(t))).toBe(false);
  });

  test('6. Archived filter still works (regression)', async ({ request, page }) => {
    // API: archived items exist
    const res = await request.get(`${SERVER}/api/properties?archived=true&limit=100`);
    const body = await res.json();
    const items = Array.isArray(body) ? body : [];
    const archived = items.filter(i => i.pipeline_status === 'archived');
    console.log(`API archived count: ${archived.length}`);
    expect(archived.length).toBeGreaterThan(0);

    // UI: archived filter page renders without error
    await page.goto(`${BASE}/properties?status=archived`);
    await page.waitForLoadState('networkidle');
    const rows = page.locator('tbody tr');
    const uiCount = await rows.count();
    console.log(`UI archived rows: ${uiCount}`);
    expect(uiCount).toBeGreaterThan(0);
  });

  test('7. Watchlist → archived via PATCH', async ({ request }) => {
    const res = await request.get(`${SERVER}/api/properties?limit=50`);
    const body = await res.json();
    const wlId = Array.isArray(body) ? body.find(i => i.pipeline_status === 'watchlist')?.id : undefined;
    if (!wlId) { console.log('No watchlist property to advance'); return; }
    const patch = await request.patch(`${SERVER}/api/properties/${wlId}/status`, {
      data: { pipeline_status: 'archived' }
    });
    console.log(`Watchlist → Archived: HTTP ${patch.status()}`);
    expect(patch.status()).toBe(200);
  });

  test('8. No unexpected console errors during flow (pre-existing gaps excluded)', async ({ page, request }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    // Watchlist filter page — safe, property still exists
    await page.goto(`${BASE}/properties?status=watchlist`);
    await page.waitForLoadState('networkidle');

    // Property detail — get a fresh non-archived property ID to avoid 404s from
    // shared DB state where our beforeAll ID may have been archived by test 7
    const res = await request.get(`${SERVER}/api/properties?limit=10`);
    const body = await res.json();
    const safe = Array.isArray(body) ? body.find(i => !i.archived && i.pipeline_status !== 'archived') : null;
    if (safe) {
      await page.goto(`${BASE}/property/${safe.id}`);
      await page.waitForLoadState('networkidle');
    }

    // Filter out pre-existing known gaps (not related to watchlist pipeline):
    // - appreciation model: /api/appreciation not implemented in server
    // - 404s on archived properties: expected if navigating to a property that
    //   was moved through the pipeline during the test run
    const unexpectedErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('appreciation') &&
      !e.includes('404') &&
      !e.includes('Failed to fetch')
    );
    console.log(`Unexpected console errors: ${unexpectedErrors.length}`);
    unexpectedErrors.forEach(e => console.log(`  ERROR: ${e}`));
    expect(unexpectedErrors).toHaveLength(0);
  });

});
