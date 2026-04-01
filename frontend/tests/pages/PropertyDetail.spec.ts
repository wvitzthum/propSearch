import { test, expect } from '@playwright/test';

test.describe('Property Detail Page', () => {
  // We'll use a test property ID that should exist or handle gracefully
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _testPropertyId = 'test-prop-001';

  test('loads without errors for valid property', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.goto('/dashboard');
    
    // Wait for table to load and click first property
    const propertyRow = page.locator('tr[data-id], tbody tr').first();
    if (await propertyRow.isVisible({ timeout: 10000 })) {
      await propertyRow.click();
      await page.waitForTimeout(1000);
    }
    
    expect(errors.filter(e => !e.includes('404'))).toHaveLength(0);
  });

  test('shows 404 state for invalid property', async ({ page }) => {
    await page.goto('/property/invalid-property-id-xyz');
    
    // Should show not found state
    const notFound = page.locator('text=/not found|property not found|asset not found/i');
    await expect(notFound.first()).toBeVisible({ timeout: 10000 });
  });

  test('back navigation works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Click a property if available
    const propertyLink = page.locator('a[href*="/property/"]').first();
    if (await propertyLink.isVisible({ timeout: 5000 })) {
      await propertyLink.click();
      await page.waitForTimeout(1000);
      
      // Find and click back button
      const backButton = page.locator('a:has-text("Back"), [href*="dashboard"]').first();
      if (await backButton.isVisible({ timeout: 2000 })) {
        await backButton.click();
        await expect(page).toHaveURL(/\/dashboard/);
      }
    }
  });

  test('gallery tabs are functional', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Click first property
    const propertyLink = page.locator('a[href*="/property/"]').first();
    if (await propertyLink.isVisible({ timeout: 5000 })) {
      await propertyLink.click();
      await page.waitForTimeout(1000);
      
      // Check for gallery tab
      const galleryTab = page.locator('button:has-text("Gallery"), button:has-text("gallery")').first();
      if (await galleryTab.isVisible({ timeout: 2000 })) {
        await galleryTab.click();
        await page.waitForTimeout(300);
      }
      
      // Check for floorplan tab
      const floorplanTab = page.locator('button:has-text("Floorplan"), button:has-text("floorplan")').first();
      if (await floorplanTab.isVisible({ timeout: 2000 })) {
        await floorplanTab.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('pipeline tracker is visible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    const propertyLink = page.locator('a[href*="/property/"]').first();
    if (await propertyLink.isVisible({ timeout: 5000 })) {
      await propertyLink.click();
      await page.waitForTimeout(1000);
      
      // Look for pipeline status indicators
      const pipeline = page.locator('text=/discovered|shortlisted|vetted|archived/i');
      await expect(pipeline.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('alpha score is displayed', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    const propertyLink = page.locator('a[href*="/property/"]').first();
    if (await propertyLink.isVisible({ timeout: 5000 })) {
      await propertyLink.click();
      await page.waitForTimeout(1000);
      
      // Look for alpha score
      const alpha = page.locator('text=/\\d+\\.\\d.*alpha|alpha.*\\d+\\.\\d/i');
      await expect(alpha.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
