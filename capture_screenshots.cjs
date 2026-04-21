const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function capture() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    colorScheme: 'dark'
  });
  const page = await context.newPage();

  const screenshotDir = path.join(__dirname, 'docs', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Property with local images: 6a028a03-021b-4895-8616-28cb84264c22 (Wyndham Street, Marylebone — 11 images)
  // Also capturing: 0f904501-3781-4ef7-af1b-2f2c83dbfafc (Goldhurst Terrace — 6 images)
  const routes = [
    { name: '01_LandingPage', url: 'http://localhost:5173/' },
    { name: '02_Dashboard', url: 'http://localhost:5173/dashboard' },
    { name: '02b_MapView', url: 'http://localhost:5173/dashboard', action: async (page) => {
      await page.click('a[href="/map"]');
      await page.waitForTimeout(4000);
    }},
    { name: '03_Comparison', url: 'http://localhost:5173/compare' },
    { name: '04_MortgageTracker', url: 'http://localhost:5173/mortgage' },
    { name: '05_Inbox', url: 'http://localhost:5173/inbox' },
    // Property with 11 local images — primary image gallery screenshot
    { name: '06_PropertyDetail_Gallery', url: 'http://localhost:5173/property/6a028a03-021b-4895-8616-28cb84264c22', action: async (page) => {
      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
      // Ensure gallery tab is active
      const galleryTab = page.locator('button:has-text("Gallery")').first();
      if (await galleryTab.isVisible().catch(() => false)) {
        await galleryTab.click();
        await page.waitForTimeout(1500);
      }
    }},
    // Same property — floorplan tab
    { name: '06b_PropertyDetail_Floorplan', url: 'http://localhost:5173/property/6a028a03-021b-4895-8616-28cb84264c22', action: async (page) => {
      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
      const floorplanTab = page.locator('button:has-text("Spatial Blueprint")').first();
      if (await floorplanTab.isVisible().catch(() => false)) {
        await floorplanTab.click();
        await page.waitForTimeout(1500);
      }
    }},
    // Same property — price evolution tab
    { name: '06c_PropertyDetail_PriceHistory', url: 'http://localhost:5173/property/6a028a03-021b-4895-8616-28cb84264c22', action: async (page) => {
      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
      const priceTab = page.locator('button:has-text("Price Evolution")').first();
      if (await priceTab.isVisible().catch(() => false)) {
        await priceTab.click();
        await page.waitForTimeout(1500);
      }
    }},
    // Goldhurst Terrace — 6 local images, used as fallback
    { name: '07_PropertyDetail_Goldhurst', url: 'http://localhost:5173/property/0f904501-3781-4ef7-af1b-2f2c83dbfafc', action: async (page) => {
      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }},
    // Properties table (main scanning surface)
    { name: '08_PropertiesPage', url: 'http://localhost:5173/properties' },
    // Rates page — London Prime Premium Chart focus
    { name: '09_RatesPage', url: 'http://localhost:5173/rates' },
    // Property edit form — market status slug fix verified (PED-002)
    { name: '10_PropertyEdit', url: 'http://localhost:5173/property/6a028a03-021b-4895-8616-28cb84264c22/edit', action: async (page) => {
      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
      // Expand Market Status section
      const marketBtn = page.locator('button').filter({ hasText: 'Market Status' }).first();
      if (await marketBtn.isVisible().catch(() => false)) {
        await marketBtn.click();
        await page.waitForTimeout(500);
      }
    }},
  ];

  for (const route of routes) {
    console.log(`Capturing ${route.name}...`);
    try {
      await page.goto(route.url, { waitUntil: 'networkidle' });
      if (route.action) {
        await route.action(page);
      }
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(screenshotDir, `${route.name}.png`), fullPage: false });
    } catch (err) {
      console.error(`Failed to capture ${route.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('Capture complete. Screenshots available in docs/screenshots/');
}

capture();

