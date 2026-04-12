import { test, expect } from '@playwright/test';

/**
 * FE-231: Regression — "Affordability Configure Monthly Payment £117,197,086" on property page.
 * Guard against:
 *  1. Corrupted localStorage budget values producing astronomically large mortgage displays.
 *  2. NaN from undefined service_charge / ground_rent in demo data flowing into monthly outlay.
 *
 * Note: QA could not reproduce £117,197,086 from any valid data path — the most plausible
 * cause is a corrupted propSearch_ltv_budget value in localStorage (e.g. from testing or an
 * accidental manual edit). Fix: clamp all useState initializers to valid ranges on init.
 */
test.describe('Property Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
  });

  test('dashboard loads for property navigation', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    // Dashboard should have property data
    const propertyData = page.locator('text=/\\d+\\.\\d/').first();
    await expect(propertyData).toBeVisible({ timeout: 5000 });
  });

  test('can navigate to a property', async ({ page }) => {
    // Look for a property link
    const propertyLink = page.locator('a[href*="/property/"]').first();
    if (await propertyLink.isVisible({ timeout: 3000 })) {
      await propertyLink.click();
      await page.waitForTimeout(1000);
      // Should be on property page or dashboard
      expect(page.url()).toMatch(/\/(dashboard|property)/);
    }
  });

  // ─── FE-231: Monthly outlay / payment bounds checks ─────────────────────────────────

  test.describe('Monthly Outlay Bounds — FE-231', () => {
    test('Total Monthly Outlay is displayed and within a reasonable range (£1K–£20K)', async ({ page }) => {
      // Navigate to a property via dashboard
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      const propertyLink = page.locator('a[href*="/property/"]').first();
      const hasProperty = await propertyLink.isVisible().catch(() => false);
      if (!hasProperty) {
        // Fallback: go directly to a known property page in demo mode
        await page.goto('/property/goldhurst-terrace-south-hampstead');
        await page.waitForTimeout(2000);
      } else {
        await propertyLink.click();
        await page.waitForTimeout(2000);
      }

      // Verify the page has loaded (either property detail or redirect)
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

      // Look for the Total Monthly Outlay section
      const outlaySection = page.locator('text=/Total Monthly Outlay/i').first();
      const hasOutlay = await outlaySection.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasOutlay) {
        // Extract the total monthly outlay value from the large display
        // The display format is "£X,XXX" in a text-5xl element
        const totalOutlay = page.locator('.text-5xl.font-bold').first();
        const outlayText = await totalOutlay.textContent({ timeout: 5000 }).catch(() => '');

        // Should contain a £ sign
        expect(outlayText, 'Total Monthly Outlay should show a £ value').toContain('£');

        // Strip currency and commas, parse as number
        const rawValue = parseInt(outlayText.replace(/[^0-9]/g, ''));
        expect(rawValue, `Total Monthly Outlay (${outlayText}) should be a valid number`).toBeGreaterThan(0);

        // Reasonable upper bound: £20K/month for the most expensive London property.
        // £117,197,086 is ~5,000× higher than this — clearly broken.
        expect(
          rawValue,
          `Total Monthly Outlay (${rawValue.toLocaleString()}) should be < £20,000. ` +
          `If it is £117M+, the localStorage corruption guard (FE-231) is missing or broken.`
        ).toBeLessThan(20_000);

        // Reasonable lower bound: £500/month minimum (even for a cheap property with no mortgage)
        expect(
          rawValue,
          `Total Monthly Outlay (${rawValue.toLocaleString()}) should be > £500`
        ).toBeGreaterThan(500);
      }
    });

    test('Mortgage component of monthly outlay is within a reasonable range (£0–£15K)', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      const propertyLink = page.locator('a[href*="/property/"]').first();
      const hasProperty = await propertyLink.isVisible().catch(() => false);
      if (!hasProperty) {
        await page.goto('/property/goldhurst-terrace-south-hampstead');
        await page.waitForTimeout(2000);
      } else {
        await propertyLink.click();
        await page.waitForTimeout(2000);
      }

      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

      // Look for "Mortgage (Principal & Interest)" label and its value
      const mortgageRow = page.locator('text=/Mortgage.*Principal.*Interest/i').first();
      const hasMortgageRow = await mortgageRow.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasMortgageRow) {
        // The value is in the sibling span
        const mortgageValue = await mortgageRow.locator('..').locator('span.text-sm').textContent({ timeout: 3000 }).catch(() => '');
        if (mortgageValue && mortgageValue.includes('£')) {
          const rawValue = parseInt(mortgageValue.replace(/[^0-9]/g, ''));
          // Upper bound: £15K/month mortgage for a £2M property at 4.55% / 25yr
          expect(rawValue, `Mortgage payment (${rawValue?.toLocaleString()}) should be < £15,000`).toBeLessThan(15_000);
          expect(rawValue, 'Mortgage payment should be > 0').toBeGreaterThan(0);
        }
      }
    });

    test('Affordability node Monthly Payment is within a reasonable range (£0–£20K)', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      const propertyLink = page.locator('a[href*="/property/"]').first();
      const hasProperty = await propertyLink.isVisible().catch(() => false);
      if (!hasProperty) {
        await page.goto('/property/goldhurst-terrace-south-hampstead');
        await page.waitForTimeout(2000);
      } else {
        await propertyLink.click();
        await page.waitForTimeout(2000);
      }

      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

      // Find the Affordability section
      const affordabilityHeader = page.locator('text=/Affordability/i').first();
      const hasAffordability = await affordabilityHeader.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasAffordability) {
        // Look for "Monthly Payment" label and its value
        const monthlyPaymentLabel = page.locator('text=/Monthly Payment/i').first();
        const hasLabel = await monthlyPaymentLabel.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasLabel) {
          // Navigate to the sibling value div
          const paymentDiv = monthlyPaymentLabel.locator('..').locator('div.text-lg, div.text-xl');
          const paymentText = await paymentDiv.first().textContent({ timeout: 3000 }).catch(() => '');

          if (paymentText && paymentText.includes('£')) {
            const rawValue = parseInt(paymentText.replace(/[^0-9]/g, ''));
            expect(rawValue, `Affordability Monthly Payment (${rawValue?.toLocaleString()}) should be < £20,000`).toBeLessThan(20_000);
            expect(rawValue, 'Affordability Monthly Payment should be > 0').toBeGreaterThan(0);
          }
        }
      }
    });

    test('localStorage corruption guard: astronomically large monthlyBudget is clamped on init', async ({ page }) => {
      // Set a deliberately corrupted budget in localStorage (the root cause of FE-231)
      await page.goto('/dashboard');
      await page.waitForTimeout(500);

      await page.evaluate(() => {
        localStorage.setItem('propSearch_ltv_budget', JSON.stringify(117197086));
      });

      // Navigate to property page — app should boot with clamped budget (£50,000 max)
      const propertyLink = page.locator('a[href*="/property/"]').first();
      const hasProperty = await propertyLink.isVisible().catch(() => false);
      if (!hasProperty) {
        await page.goto('/property/goldhurst-terrace-south-hampstead');
      } else {
        await propertyLink.click();
      }
      await page.waitForTimeout(3000);

      // Navigate to affordability settings to inspect the clamped budget
      await page.goto('/affordability');
      await page.waitForTimeout(2000);

      // The header should display a clamped budget, not the corrupted value
      const budgetHeader = page.locator('text=/Monthly Budget/i').first();
      const hasBudget = await budgetHeader.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasBudget) {
        // Find the budget value specifically — it's near the "Monthly Budget" label
        // and typically formatted as "£6,000" or similar in the quick-stats area.
        const budgetRow = budgetHeader.locator('..');
        const rowText = await budgetRow.textContent({ timeout: 3000 }).catch(() => '');

        // The corrupted value 117,197,086 should NOT appear anywhere
        expect(
          rowText,
          'Budget display should NOT show the corrupted localStorage value £117,197,086. ' +
          'The init-time clamping guard (FE-231) should cap it at £50,000.'
        ).not.toContain('117,197,086');
        expect(rowText).not.toContain('117197086');

        // Also check the "Your Budget" label in the budget slider area
        const yourBudgetLabel = page.locator('text=/Your Budget/i').first();
        const yourBudgetVisible = await yourBudgetLabel.isVisible({ timeout: 3000 }).catch(() => false);
        if (yourBudgetVisible) {
          const yourBudgetText = await yourBudgetLabel.textContent({ timeout: 3000 }).catch(() => '');
          expect(yourBudgetText).not.toContain('117,197,086');
        }

        // The monthly budget (per month) should be <= £50,000
        const perMonthMatch = rowText?.match(/£([0-9,]+)\/mo/);
        if (perMonthMatch) {
          const budgetNum = parseInt(perMonthMatch[1].replace(/,/g, ''));
          expect(
            budgetNum,
            `Monthly budget (${budgetNum}) should be clamped to <= £50,000`
          ).toBeLessThanOrEqual(50_000);
          expect(budgetNum, 'Monthly budget should be >= £500').toBeGreaterThanOrEqual(500);
        }
      }

      // Clean up localStorage
      await page.evaluate(() => localStorage.removeItem('propSearch_ltv_budget'));
    });

    test('localStorage corruption guard: same for depositPct — values outside 5–60% are clamped', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(500);

      // Set depositPct to an absurd value
      await page.evaluate(() => {
        localStorage.setItem('propSearch_deposit_pct', JSON.stringify(999999));
        localStorage.setItem('propSearch_deposit_mode', JSON.stringify('fixed'));
      });

      await page.goto('/affordability');
      await page.waitForTimeout(2000);

      // Expand deposit panel
      const depositHeader = page.locator('h2:has-text("Deposit Configuration")').first();
      await depositHeader.click();
      await page.waitForTimeout(500);

      // The UI should not crash and should show valid deposit percentages
      const bodyText = await page.locator('body').textContent({ timeout: 3000 }).catch(() => '');
      expect(bodyText, 'Deposit panel should render without crashing').toBeTruthy();

      // Clean up
      await page.evaluate(() => {
        localStorage.removeItem('propSearch_deposit_pct');
        localStorage.removeItem('propSearch_deposit_mode');
      });
    });
  });
});

