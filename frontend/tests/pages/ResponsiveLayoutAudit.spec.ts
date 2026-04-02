/**
 * Responsive Layout Audit — QA-187
 * 
 * Documents the current layout behavior at mobile/tablet/desktop viewports.
 * Tests are designed to FAIL at current state and PASS after FE implements fixes.
 * 
 * Key findings (2026-04-02 audit run):
 *   Mobile (375px):  sidebar=256px (68% of viewport), content horizontal overflow=997px
 *   Tablet (768px):  sidebar=256px (33% of viewport), content horizontal overflow=604px
 *   Wide (1440px):   sidebar=256px (18% of viewport), content horizontal overflow=0px
 *   Desktop (1920px): sidebar=256px (13% of viewport), content horizontal overflow=0px
 * 
 * Layout structure (from Layout.tsx):
 *   - Sidebar: w-64 (256px), fixed position, always visible
 *   - Main: pl-64 (padding-left 256px), full viewport width
 *   - Issue: sidebar pushes content off-screen on narrow viewports
 * 
 * MarketConditionsBar overflow (QA-186 correlation):
 *   Mobile: 997px overflow — SEVERE (entire bar unreadable)
 *   Tablet: 604px overflow — BAD
 *   Laptop: 92px overflow — MARGINAL
 */

import { test, expect } from '@playwright/test';

const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'Mobile' },
  tablet: { width: 768, height: 1024, name: 'Tablet' },
  wide: { width: 1440, height: 900, name: 'Wide (1440px)' },
  desktop: { width: 1920, height: 1080, name: 'Desktop' },
};

test.describe('Responsive Layout Audit — QA-187', () => {

  // --- Sidebar visibility and width ---
  for (const [key, { width, height, name }] of Object.entries(VIEWPORTS)) {
    test(`${name} (${width}x${height}) — sidebar geometry`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      const sidebarBox = await page.locator('aside').boundingBox();

      console.log(`[${name}] Sidebar: w=${sidebarBox?.width?.toFixed(0)}px, h=${sidebarBox?.height?.toFixed(0)}px`);

      // Sidebar should always be 256px (w-64)
      expect(sidebarBox?.width).toBeGreaterThanOrEqual(250);
      expect(sidebarBox?.width).toBeLessThanOrEqual(270);
      expect(sidebarBox?.height).toBeGreaterThanOrEqual(height - 1);
    });
  }

  // --- Mobile: sidebar should be hidden or replaced with hamburger drawer ---
  test('Mobile (375px): sidebar should be hidden after FE fix', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Current state: sidebar is visible (FAILING this test documents the bug)
    const sidebarVisible = await page.locator('aside').isVisible();
    console.log(`Mobile sidebar visible: ${sidebarVisible} — expected after fix: false`);
    
    // After FE fix: sidebar should be hidden
    // (currently failing because sidebar IS visible — this is the bug)
    expect(sidebarVisible).toBe(false); // Will fail until FE implements mobile nav

    // After fix, a hamburger button should appear at top-left
    // const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="nav" i], .hamburger');
    // await expect(hamburger).toBeVisible();
  });

  // --- Tablet: sidebar should collapse to icon-only (64px) ---
  test('Tablet (768px): sidebar should collapse to icon-only after FE fix', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    const sidebarBox = await page.locator('aside').boundingBox();
    console.log(`Tablet sidebar width: ${sidebarBox?.width?.toFixed(0)}px — expected after fix: 64px (icon-only)`);

    // After FE fix: sidebar should be 64px (icon-only) or hidden
    // Currently: 256px — failing this documents the bug
    expect(sidebarBox?.width).toBeLessThanOrEqual(80); // Will fail until FE implements collapse
  });

  // --- Main content horizontal overflow at each viewport ---
  for (const [key, { width, height, name }] of Object.entries(VIEWPORTS)) {
    test(`${name}: main content horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      const bodyOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - document.documentElement.clientWidth;
      });

      console.log(`[${name}] Horizontal overflow: ${bodyOverflow}px`);

      // After FE fix: no horizontal overflow
      expect(bodyOverflow).toBeLessThanOrEqual(0); // Will fail until FE implements fixes
    });
  }

  // --- Nav route completeness: UX-011, UX-012, UX-013 ---
  test('Sidebar nav: /rates and /market links missing (UX-011/UX-012/UX-013)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    const navLabels = await page.locator('aside nav a').allTextContents();
    const pageLabels = navLabels.filter(l => l.trim().length > 0); // filter empty (icons-only)
    
    console.log('Current nav page links:', pageLabels);

    // After UX-011/UX-012/UX-013: should have 'Rates' and 'Market' under 'Market Intelligence'
    const hasRates = pageLabels.some(l => l.toLowerCase().includes('rate'));
    const hasMarket = pageLabels.some(l => l.toLowerCase().includes('market'));

    console.log(`Has /rates link: ${hasRates} — expected after UX-011/UX-013: true`);
    console.log(`Has /market link: ${hasMarket} — expected after UX-012/UX-013: true`);

    expect(hasRates).toBe(true); // Will fail until UX-011/UX-013
    expect(hasMarket).toBe(true); // Will fail until UX-012/UX-013
  });

  // --- MarketConditionsBar horizontal overflow (QA-186 correlation) ---
  test('MarketConditionsBar: overflow at narrow viewports', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 800, name: 'tablet' },
      { width: 1280, height: 800, name: 'laptop' },
    ];

    for (const { width, height, name } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      // Find MarketConditionsBar by its class pattern
      const mcBar = page.locator('[class*="rounded-xl"][class*="px-4"][class*="border"]').first();
      if (await mcBar.isVisible()) {
        const barBox = await mcBar.boundingBox();
        const overflow = (barBox?.x ?? 0) + (barBox?.width ?? 0) - width;
        console.log(`[${name}] MarketConditionsBar overflow: ${overflow.toFixed(0)}px (width=${barBox?.width?.toFixed(0)}px, viewport=${width}px)`);
      }
    }
    // This test documents findings — no assertion that would cause CI failure
  });

  // --- Desktop/Wide: layout should be clean with no overflow ---
  test('Desktop (1920px): clean layout — no overflow, sidebar visible', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    const sidebarBox = await page.locator('aside').boundingBox();
    const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    console.log(`Desktop: sidebar=${sidebarBox?.width?.toFixed(0)}px, overflow=${bodyOverflow}px`);

    expect(sidebarBox?.width).toBeGreaterThanOrEqual(250);
    expect(bodyOverflow).toBeLessThanOrEqual(0); // Should pass — desktop is fine
  });

});
