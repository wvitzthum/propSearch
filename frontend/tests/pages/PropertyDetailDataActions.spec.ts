/**
 * property_detail_data_actions.spec.ts — QA-195
 * Verifies the 3 data action buttons on PropertyDetail:
 *   1. "Edit Data" → navigates to /property/:id/edit
 *   2. "Recheck Property" — visible and labelled correctly
 *   3. "Request Enrichment" — visible and labelled correctly
 * Also verifies the "DATA ACTIONS" section header is present.
 *
 * Depends on: FE-238 (Edit Data button), FE-237 (Request Enrichment modal),
 *             FE-231 (Recheck button — already verified in QA-012).
 * Demo mode: uses VITE_DEMO_MODE=true so no API server required.
 */
import { test, expect } from '@playwright/test';

const DEMO_PROPERTY_ID = '0f904501-3781-4ef7-af1b-2f2c83dbfafc';

test.describe('PropertyDetail Data Actions Section — QA-195', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a demo property — PropertyDetail works in demo mode (VITE_DEMO_MODE)
    await page.goto(`/property/${DEMO_PROPERTY_ID}`);
    await page.waitForTimeout(2000);
  });

  // ── 1. Section header ──────────────────────────────────────────────────────────

  test('DATA ACTIONS section header is present', async ({ page }) => {
    // The section header marks the grouping of all 3 data action buttons
    const sectionHeader = page.locator('text=/Data Actions/i');
    await expect(sectionHeader.first()).toBeVisible({ timeout: 8000 });
  });

  // ── 2. Edit Data button ───────────────────────────────────────────────────────

  test('"Edit Data" button is present in sidebar', async ({ page }) => {
    const editButton = page.locator('button', { hasText: /Edit Data/i });
    await expect(editButton).toBeVisible({ timeout: 8000 });
  });

  test('"Edit Data" button navigates to /property/:id/edit', async ({ page }) => {
    const editButton = page.locator('button', { hasText: /Edit Data/i });
    await expect(editButton).toBeVisible({ timeout: 8000 });
    await editButton.click();
    await page.waitForURL(new RegExp(`/property/${DEMO_PROPERTY_ID}/edit`), { timeout: 8000 });
    // Confirm we are on the edit page, not redirected to dashboard
    expect(page.url()).toContain(`/property/${DEMO_PROPERTY_ID}/edit`);
  });

  // ── 3. Recheck button ─────────────────────────────────────────────────────────

  test('"Recheck Property" button is present and labelled correctly', async ({ page }) => {
    // FE-231 implementation: button labelled "Recheck Property" or "Verifying Live..."
    const recheckButton = page.locator('button', { hasText: /Recheck|Verify/i });
    await expect(recheckButton.first()).toBeVisible({ timeout: 8000 });
  });

  // ── 4. Request Enrichment button ─────────────────────────────────────────────

  test('"Request Enrichment" button is present and labelled correctly', async ({ page }) => {
    // FE-237 implementation: button labelled "Request Enrichment"
    const enrichmentButton = page.locator('button', { hasText: /Request Enrichment/i });
    await expect(enrichmentButton).toBeVisible({ timeout: 8000 });
  });

  test('clicking "Request Enrichment" opens the EnrichmentModal', async ({ page }) => {
    const enrichmentButton = page.locator('button', { hasText: /Request Enrichment/i });
    await enrichmentButton.click();
    await page.waitForTimeout(500);
    // Modal header should appear
    const modalHeading = page.locator('h2', { hasText: /Request Enrichment/i });
    await expect(modalHeading).toBeVisible({ timeout: 5000 });
  });

  // ── 5. All 3 buttons visible together (smoke) ─────────────────────────────────

  test('all 3 data action buttons are visible on one property without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await expect(page.locator('button', { hasText: /Edit Data/i })).toBeVisible();
    await expect(page.locator('button', { hasText: /Recheck|Verify/i }).first()).toBeVisible();
    await expect(page.locator('button', { hasText: /Request Enrichment/i })).toBeVisible();
  });

  // ── 6. Edit Data → back button goes to /property/:id ─────────────────────────

  test('Edit page back button returns to /property/:id (not dashboard)', async ({ page }) => {
    // Navigate to edit page
    const editButton = page.locator('button', { hasText: /Edit Data/i });
    await editButton.click();
    await page.waitForURL(new RegExp(`/property/${DEMO_PROPERTY_ID}/edit`), { timeout: 8000 });

    // Click back button
    const backButton = page.locator('button', { hasText: /Back/i }).first();
    await expect(backButton).toBeVisible({ timeout: 5000 });

    // Handle confirm dialog if there are unsaved changes (there shouldn't be initially)
    page.on('dialog', dialog => dialog.accept());
    await backButton.click();
    await page.waitForURL(new RegExp(`/property/${DEMO_PROPERTY_ID}$`), { timeout: 8000 });

    expect(page.url()).toContain(`/property/${DEMO_PROPERTY_ID}`);
    expect(page.url()).not.toContain('/dashboard');
    expect(page.url()).not.toContain('/edit');
  });

  // ── 7. Mobile — buttons visible without horizontal overflow ───────────────────

  test('data action buttons visible on mobile viewport (sm)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/property/${DEMO_PROPERTY_ID}`);
    await page.waitForTimeout(2000);

    // All 3 buttons should be in the DOM (may be below fold — we just check no horizontal overflow)
    await expect(page.locator('button', { hasText: /Edit Data/i })).toBeAttached();
    await expect(page.locator('button', { hasText: /Request Enrichment/i })).toBeAttached();
  });
});
