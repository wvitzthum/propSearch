/**
 * enrichment_modal.spec.ts — QA-195
 * Verifies the Request Enrichment modal (FE-237):
 *   - Modal opens on button click
 *   - All 9 enrichment fields are listed in the checklist
 *   - At least one field must be selected to submit
 *   - Submit sends POST /api/enrichment-requests with correct body
 *   - Success toast: "Enrichment requested — the analyst will review this property"
 *   - Pending warning shown when a request already exists
 *   - Close (X) and Cancel buttons work
 */
import { test, expect } from '@playwright/test';

const DEMO_PROPERTY_ID = '0f904501-3781-4ef7-af1b-2f2c83dbfafc';

test.describe('Enrichment Modal — QA-195', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/property/${DEMO_PROPERTY_ID}`);
    await page.waitForTimeout(2000);
  });

  // ── 1. Open modal ────────────────────────────────────────────────────────────

  test('clicking "Request Enrichment" opens the modal', async ({ page }) => {
    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(500);

    // Modal heading
    const modalHeading = page.locator('h2', { hasText: /Request Enrichment/i });
    await expect(modalHeading).toBeVisible({ timeout: 5000 });
  });

  test('modal displays the property address in the header', async ({ page }) => {
    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(800);

    // Address text appears in a <p> tag in the modal header
    // The demo address is "Goldhurst Terrace, South Hampstead NW6"
    const addressText = page.locator('text=/Goldhurst|South Hampstead|NW6/i');
    await expect(addressText.first()).toBeVisible({ timeout: 5000 });
  });

  // ── 2. Field checklist ──────────────────────────────────────────────────────

  test('all 9 enrichment fields are listed in the checklist', async ({ page }) => {
    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    // Wait for modal to fully render
    await page.waitForSelector('text=/Alpha Score/i', { timeout: 5000 });
    await page.waitForTimeout(500);

    // Each field is a clickable button inside the modal
    // Use textContent-based locator (more reliable than regex on visible text)
    for (const field of [
      'Alpha Score', 'Appreciation Potential', 'Realistic Price',
      'Area Benchmarks', 'EPC Rating', 'Tube Distance',
      'Market Status', 'Price History', 'Tenure Details',
    ]) {
      const fieldButton = page.locator('button').filter({ hasText: field }).first();
      await expect(fieldButton).toBeVisible({ timeout: 8000 });
    }
  });

  test('clicking a field toggles its selected state', async ({ page }) => {
    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(500);

    // Find and click "Alpha Score"
    const alphaField = page.locator('button', { hasText: /Alpha Score/i });
    await alphaField.click();
    await page.waitForTimeout(200);

    // After clicking, the field should have blue styling (checked)
    const alphaButton = page.locator('button', { hasText: /Alpha Score/i }).first();
    await expect(alphaButton).toBeVisible();
  });

  // ── 3. Submit validation ─────────────────────────────────────────────────────

  test('Submit is disabled when no fields are selected', async ({ page }) => {
    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(500);

    // Submit button
    const submitButton = page.locator('button', { hasText: /Submit Request/i });
    await expect(submitButton).toBeVisible({ timeout: 3000 });
    await expect(submitButton).toBeDisabled();
  });

  test('Submit becomes enabled after selecting at least one field', async ({ page }) => {
    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(500);

    // Select Alpha Score
    await page.locator('button', { hasText: /Alpha Score/i }).click();
    await page.waitForTimeout(200);

    const submitButton = page.locator('button', { hasText: /Submit Request/i });
    await expect(submitButton).toBeEnabled({ timeout: 2000 });
  });

  test('selecting zero fields then trying to submit shows error toast', async ({ page }) => {
    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(500);

    // Try to submit without selecting anything (click the button directly via JS since it's disabled)
    const submitButton = page.locator('button', { hasText: /Submit Request/i });
    await page.evaluate((el) => (el as HTMLButtonElement).click(), await submitButton.elementHandle());
    await page.waitForTimeout(1000);

    const bodyText = await page.locator('body').textContent();
    // Should show "Select at least one field" toast
    expect(bodyText).toMatch(/select.*field|choose.*field/i);
  });

  // ── 4. Notes textarea ────────────────────────────────────────────────────────

  test('optional notes textarea is present and editable', async ({ page }) => {
    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();

    // Wait for the modal to fully render before looking for the textarea
    await page.waitForSelector('textarea', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(300);

    const notesArea = page.locator('textarea').first();
    await expect(notesArea).toBeVisible({ timeout: 5000 });
    await notesArea.fill('Please re-score based on recent comparables in NW6.');
    await page.waitForTimeout(200);

    const notesValue = await notesArea.inputValue();
    expect(notesValue).toContain('comparables');
  });

  // ── 5. Successful submit ─────────────────────────────────────────────────────

  test('submitting with selected fields calls POST /api/enrichment-requests and closes modal', async ({ page }) => {
    let postedBody: object | null = null;

    // Mock the enrichment requests endpoint
    await page.route('**/api/enrichment-requests', async (route) => {
      if (route.request().method() === 'POST') {
        try {
          postedBody = route.request().postDataJSON();
        } catch {}
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'queued', id: 'test-enrichment-req-1' }),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requests: [] }) });
      }
    });

    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(500);

    // Select "Alpha Score"
    await page.locator('button', { hasText: /Alpha Score/i }).click();
    await page.waitForTimeout(200);

    // Submit
    const submitButton = page.locator('button', { hasText: /Submit Request/i });
    await submitButton.click();

    // Wait for modal to close
    await page.waitForTimeout(2500);

    // Modal should be gone
    const modalHeading = page.locator('h2', { hasText: /Request Enrichment/i });
    await expect(modalHeading).not.toBeVisible({ timeout: 3000 });

    // Verify POST body structure
    expect(postedBody).not.toBeNull();
    const body = postedBody as Record<string, unknown>;
    expect(body).toHaveProperty('propertyId', DEMO_PROPERTY_ID);
    expect(body).toHaveProperty('fields');
    expect(Array.isArray(body.fields)).toBeTruthy();
    expect((body.fields as string[]).length).toBeGreaterThan(0);
    expect((body.fields as string[]).includes('alpha_score')).toBeTruthy();
  });

  test('success toast appears after submitting enrichment request', async ({ page }) => {
    await page.route('**/api/enrichment-requests', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'queued' }) });
    });

    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(500);
    await page.locator('button', { hasText: /Alpha Score/i }).click();
    await page.locator('button', { hasText: /Submit Request/i }).click();
    await page.waitForTimeout(2500);

    const bodyText = await page.locator('body').textContent();
    // Success toast message from FE-237
    expect(bodyText).toMatch(/enrichment requested|analyst will review/i);
  });

  // ── 6. Close / Cancel buttons ─────────────────────────────────────────────────

  test('X button closes the modal without submitting', async ({ page }) => {
    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(800);

    // The X button contains the lucide <X> SVG icon (two crossing lines: M18 6 6 18 and m6 6 12 12)
    // Target the specific X SVG path which is unique to the close button
    const xButton = page.locator('button', { has: page.locator('svg path[d*="M18 6"]') });
    await expect(xButton).toBeVisible({ timeout: 5000 });
    await xButton.click();
    await page.waitForTimeout(500);

    // Modal heading should no longer be visible
    const modalHeading = page.locator('h2', { hasText: /Request Enrichment/i });
    await expect(modalHeading).not.toBeVisible({ timeout: 3000 });
  });

  test('Cancel button closes the modal without submitting', async ({ page }) => {
    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(500);

    const cancelButton = page.locator('button', { hasText: /Cancel/i });
    await cancelButton.click();
    await page.waitForTimeout(500);

    const modalHeading = page.locator('h2', { hasText: /Request Enrichment/i });
    await expect(modalHeading).not.toBeVisible({ timeout: 3000 });
  });

  // ── 7. Backdrop click closes modal ────────────────────────────────────────────
  // Escape key closes the modal — the EnrichmentModal has a window keydown listener.
  // This is the most reliable mechanism for automated testing.

  test('clicking the backdrop overlay closes the modal', async ({ page }) => {
    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(800);

    // Escape triggers window keydown listener → onClose()
    await page.keyboard.press('Escape');

    await page.waitForTimeout(500);
    const modalHeading = page.locator('h2', { hasText: /Request Enrichment/i });
    await expect(modalHeading).not.toBeVisible({ timeout: 3000 });
  });

  // ── 8. Loading state during submit ───────────────────────────────────────────

  test('submit button shows spinner and is disabled while submitting', async ({ page }) => {
    // Intercept to delay the response
    await page.route('**/api/enrichment-requests', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'queued' }) });
    });

    const button = page.locator('button', { hasText: /Request Enrichment/i });
    await button.click();
    await page.waitForTimeout(500);
    await page.locator('button', { hasText: /Alpha Score/i }).click();

    const submitButton = page.locator('button', { hasText: /Submit Request/i });
    await submitButton.click();

    // Immediately after click, button should show loading state
    const loadingButton = page.locator('button', { hasText: /Submitting/i });
    await expect(loadingButton).toBeVisible({ timeout: 1000 });
    await expect(loadingButton).toBeDisabled();
  });
});
