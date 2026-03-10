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

  const routes = [
    { name: '01_LandingPage', url: 'http://localhost:5173/' },
    { name: '02_Dashboard', url: 'http://localhost:5173/dashboard' },
    { name: '02b_MapView', url: 'http://localhost:5173/dashboard', action: async (page) => {
      await page.click('button:has-text("Map")');
      await page.waitForTimeout(4000); // Wait for map tiles and markers
    }},
    { name: '03_Comparison', url: 'http://localhost:5173/compare' },
    { name: '04_MortgageTracker', url: 'http://localhost:5173/mortgage' },
    { name: '05_Inbox', url: 'http://localhost:5173/inbox' },
    { name: '06_PropertyDetail', url: 'http://localhost:5173/property/f5g6h7i8-j9k0-l1m2-n3o4-p5q6r7s8t9u0', action: async (page) => {
       // Wait for data to load if any
       await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    }},
  ];

  for (const route of routes) {
    console.log(`Capturing ${route.name}...`);
    try {
      await page.goto(route.url, { waitUntil: 'networkidle' });
      if (route.action) {
        await route.action(page);
      }
      // Wait a bit more for map/charts to render
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
