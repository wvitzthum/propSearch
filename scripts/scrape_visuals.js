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
      gallery: [],
      floor_level: null,
      streetview_url: null
    };

    if (result.source === 'Rightmove') {
      const jsonModel = await page.evaluate(() => {
        return window.jsonModel || window.__PRELOADED_STATE__ || window.PAGE_MODEL;
      });
      
      if (jsonModel) {
        const pd = jsonModel.propertyData || jsonModel.property;
        if (pd) {
          console.log('Rightmove PropertyData found');
          if (pd.images && pd.images.length > 0) {
            result.image_url = pd.images[0].url;
            result.gallery = pd.images.slice(0, 5).map(img => img.url);
          }
          if (pd.floorplans && pd.floorplans.length > 0) {
            result.floorplan_url = pd.floorplans[0].url;
          }
          if (pd.entranceFloor) {
            result.floor_level = pd.entranceFloor;
          }
          if (pd.location && pd.location.latitude && pd.location.longitude) {
            result.streetview_url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${pd.location.latitude},${pd.location.longitude}`;
          }
        }
      }
    } else if (result.source === 'Zoopla') {
      const nextData = await page.evaluate(() => {
        const script = document.getElementById('__NEXT_DATA__');
        if (script) return JSON.parse(script.textContent);
        if (window.__NEXT_DATA__) return window.__NEXT_DATA__;
        return null;
      });

      if (nextData) {
        const listingDetails = nextData.props?.pageProps?.listingDetails || nextData.props?.pageProps?.initialProps?.listingDetails;
        if (listingDetails) {
          console.log('Zoopla ListingDetails found');
          if (listingDetails.images?.length > 0) {
            result.image_url = listingDetails.images[0].src;
            result.gallery = listingDetails.images.slice(0, 5).map(img => img.src);
          }
          if (listingDetails.floorplans && listingDetails.floorplans.length > 0) {
            result.floorplan_url = listingDetails.floorplans[0].src || listingDetails.floorplans[0].url;
          }
          if (listingDetails.floorLevel) {
            result.floor_level = listingDetails.floorLevel;
          }
          if (listingDetails.location && listingDetails.location.coordinates) {
            const { lat, lon } = listingDetails.location.coordinates;
            result.streetview_url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
          }
        }
      }
    }

    // Fallback/Generic Heuristic for Unknown OR if portal extraction failed
    if (!result.image_url) {
      console.log(`Using Heuristic scraper fallback for: ${result.source}`);
      
      // Auto-scroll
      await page.evaluate(async () => {
        for (let i = 0; i < document.body.scrollHeight; i += 500) {
          window.scrollTo(0, i);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      });
      await page.waitForTimeout(1000);

      const heuristicAssets = await page.evaluate(() => {
        const getBestSrc = (img) => {
           if (img.parentElement && img.parentElement.tagName === 'PICTURE') {
               const sources = Array.from(img.parentElement.querySelectorAll('source'));
               const bestSource = sources.find(s => s.srcset.includes('1024') || s.srcset.includes('768')) || sources[sources.length - 1];
               if (bestSource && bestSource.srcset) {
                   return bestSource.srcset.split(',').map(s => s.trim().split(' ')[0]).pop();
               }
           }
           if (img.srcset) {
             return img.srcset.split(',').map(s => s.trim().split(' ')[0]).pop();
           }
           return img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src;
        };

        const allImages = Array.from(document.querySelectorAll('img')).map(img => ({
          src: getBestSrc(img),
          alt: img.alt || '',
          width: img.naturalWidth,
          height: img.naturalHeight,
          testid: img.getAttribute('data-testid') || ''
        }));

        const galleryImages = allImages.filter(img => {
          const src = img.src.toLowerCase();
          const alt = img.alt.toLowerCase();
          const isIcon = /logo|icon|avatar|user|star|social|button|arrow|chevron|loader/i.test(src + alt);
          const isSmall = (img.width > 0 && img.width < 200) || (img.height > 0 && img.height < 150);
          const isPortalSpecific = src.includes('images.zoopla.co.uk') || src.includes('media.rightmove.co.uk');
          return (!isIcon && !isSmall && src.startsWith('http')) || isPortalSpecific;
        }).map(img => img.src);

        let floorplanImg = allImages.find(img => 
            (img.src.toLowerCase().includes('floorplan') || 
             img.alt.toLowerCase().includes('floorplan') ||
             img.testid?.toLowerCase().includes('floorplan')) &&
            !img.src.includes('static')
        );

        // Text-based floorplan link detection
        let floorplanUrl = floorplanImg ? floorplanImg.src : null;
        if (!floorplanUrl) {
            const fpLink = Array.from(document.querySelectorAll('a, button')).find(el => 
                el.innerText.toLowerCase().includes('floor plan')
            );
            if (fpLink && fpLink.href) floorplanUrl = fpLink.href;
        }

        let floorLevel = null;
        const text = document.body.innerText;
        const floorMatch = text.match(/\b(ground|first|second|third|fourth|fifth|sixth|top|penthouse)\s+floor\b/i) ||
                           text.match(/\b(1st|2nd|3rd|4th|5th|6th)\s+floor\b/i);
        if (floorMatch) floorLevel = floorMatch[0];

        return {
          images: [...new Set(galleryImages)],
          floorplan: floorplanUrl,
          floorLevel: floorLevel
        };
      });

      if (heuristicAssets.images.length > 0) {
        result.image_url = result.image_url || heuristicAssets.images[0];
        if (result.gallery.length === 0) result.gallery = heuristicAssets.images.slice(0, 5);
      }
      result.floorplan_url = result.floorplan_url || heuristicAssets.floorplan;
      result.floor_level = result.floor_level || heuristicAssets.floorLevel;
    }

    // Suffix normalization
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
