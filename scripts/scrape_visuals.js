const { chromium } = require('playwright');

/**
 * Scraper for Rightmove and Zoopla high-res assets.
 * Usage: node scripts/scrape_visuals.js <url>
 */

async function scrapeVisuals(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });

  // Manual Stealth: Mask webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  const page = await context.newPage();

  console.log(`Navigating to: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('Goto timed out/failed, continuing...'));
    await page.waitForTimeout(2000); // Wait for potential late hydration

    // Accept Cookies if button exists
    try {
        const acceptButton = await page.getByRole('button', { name: 'Accept all', exact: true });
        if (await acceptButton.isVisible()) {
            console.log('Accepting cookies...');
            await acceptButton.click();
            await page.waitForTimeout(2000);
        }
    } catch (e) {
        // No accept button or different name
    }

    // Capture screenshot for debugging
    await page.screenshot({ path: 'debug_scrape.png' });
    console.log('Screenshot saved to debug_scrape.png');

    let result = {
      url: url,
      source: url.includes('rightmove.co.uk') ? 'Rightmove' : url.includes('zoopla.co.uk') ? 'Zoopla' : 'Unknown',
      image_url: null,
      floorplan_url: null,
      gallery: []
    };

    if (result.source === 'Rightmove') {
      const jsonModel = await page.evaluate(() => {
        return window.jsonModel || window.__PRELOADED_STATE__ || window.PAGE_MODEL;
      });
      
      if (jsonModel) {
        const pd = jsonModel.propertyData || jsonModel.property;
        if (pd) {
          console.log('Rightmove PropertyData keys:', Object.keys(pd));
          if (pd.images && pd.images.length > 0) {
            result.image_url = pd.images[0].url;
            result.gallery = pd.images.slice(0, 5).map(img => img.url);
          }
          if (pd.floorplans && pd.floorplans.length > 0) {
            result.floorplan_url = pd.floorplans[0].url;
          } else {
            console.log('No floorplans found in pd.floorplans. Keys:', Object.keys(pd));
          }
        } else {
            console.log('No PropertyData/Property found in jsonModel. Keys:', Object.keys(jsonModel));
        }
      } else {
          console.log('No window.jsonModel or window.__PRELOADED_STATE__ or window.PAGE_MODEL found');
      }
    } else if (result.source === 'Zoopla') {
      const pageTitle = await page.title();
      console.log('Zoopla Page Title:', pageTitle);

      // Wait for a core content element to ensure hydration/navigation
      try {
        await page.waitForSelector('h1, [data-testid="listing-title"]', { timeout: 10000 });
      } catch (e) {
        console.log('Main content selector not found, attempting extraction anyway');
      }

      const nextData = await page.evaluate(() => {
        const script = document.getElementById('__NEXT_DATA__');
        return script ? JSON.parse(script.textContent) : null;
      });

      if (nextData) {
        const listingDetails = nextData.props?.pageProps?.listingDetails;
        if (listingDetails) {
          console.log('Zoopla ListingDetails found in nextData');
          if (listingDetails.images?.length > 0) {
            result.image_url = listingDetails.images[0].src;
            result.gallery = listingDetails.images.slice(0, 5).map(img => img.src);
          }
          if (listingDetails.floorplans && listingDetails.floorplans.length > 0) {
            result.floorplan_url = listingDetails.floorplans[0].src;
          }
        }
      }

      // If still missing, try broad DOM search
      if (!result.image_url) {
          console.log('Falling back to broad DOM search for Zoopla');
          const domAssets = await page.evaluate(() => {
            // Find all images and filter by likely candidates
            const allImages = Array.from(document.querySelectorAll('img')).map(img => ({
              src: img.src,
              alt: img.alt,
              width: img.naturalWidth,
              height: img.naturalHeight
            }));
            
            // Heuristic for property images: high-res, specific alt text or data-testids
            const galleryImages = allImages.filter(img => 
                img.src.includes('images.zoopla.co.uk') || 
                img.alt.toLowerCase().includes('property') ||
                img.src.includes('property-photo')
            ).map(img => img.src);

            const floorplanImg = allImages.find(img => 
                img.src.toLowerCase().includes('floorplan') || 
                img.alt.toLowerCase().includes('floorplan')
            );

            return {
              images: [...new Set(galleryImages)],
              floorplan: floorplanImg ? floorplanImg.src : null
            };
          });

          if (domAssets.images.length > 0) {
            result.image_url = domAssets.images[0];
            result.gallery = domAssets.images.slice(0, 5);
          }
          result.floorplan_url = domAssets.floorplan;
      }
    }

    if (result.floorplan_url && !result.floorplan_url.startsWith('http')) {
        if (result.source === 'Zoopla') result.floorplan_url = `https://www.zoopla.co.uk${result.floorplan_url}`;
        if (result.source === 'Rightmove' && !result.floorplan_url.startsWith('//')) {
             result.floorplan_url = `https://www.rightmove.co.uk${result.floorplan_url}`;
        }
    }

    console.log('--- Extraction Complete ---');
    console.log(JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error(`Scraping failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

const targetUrl = process.argv[2];
if (!targetUrl) {
  console.error('Usage: node scripts/scrape_visuals.js <url>');
  process.exit(1);
}

scrapeVisuals(targetUrl);
