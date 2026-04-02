const { chromium } = require('playwright');
const http = require('http');

// Load from .env.local (gitignored) — set FLARESOLVR_URL, FLARESOLVR_SESSION, FLARESOLVR_TIMEOUT
const FLARESOLVR_URL = process.env.FLARESOLVR_URL || 'http://localhost:8191';
const FLARESOLVR_SESSION = process.env.FLARESOLVR_SESSION || 'propSearch';
const FLARESOLVR_TIMEOUT = parseInt(process.env.FLARESOLVR_TIMEOUT || '90');

/**
 * FlareSolverr proxy — bypasses Cloudflare challenges by running a real browser.
 * Returns full SSR HTML with listing data (including floorArea, sqft, bedrooms, EPC).
 */
function scrapeWithFlaresolverr(url) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      cmd: 'request.get',
      url,
      maxTimeout: FLARESOLVR_TIMEOUT * 1000,
      session: FLARESOLVR_SESSION
    });
    const fsUrl = new URL(FLARESOLVR_URL);
    const opts = {
      hostname: fsUrl.hostname,
      port: fsUrl.port || 8191,
      path: '/v1',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.status !== 'ok') return reject(new Error(j.message || 'FlareSolverr failed: ' + j.status));
          resolve(j.solution.response);
        } catch (e) {
          reject(new Error('FlareSolverr parse error: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Extract full property data from FlareSolverr HTML response.
 * Works for Zoopla detail pages.
 */
async function extractFlaresolverrData(html, source) {
  const result = { url: '', source, image_url: null, floorplan_url: null, gallery: [], floor_level: null, streetview_url: null };

  if (source === 'Zoopla') {
    // Extract from Zoopla's embedded listing data (Next.js serialized format)
    // Find the listingData section with counts, floorArea, tenure etc.
    // Zoopla HTML from FlareSolverr contains escaped quotes (\") in JSON string
    // Unescape all \" → " before pattern matching
    const idx = html.indexOf('floorArea');
    if (idx >= 0) {
      // Unescape: replace all \" with " in a copy, then search
      const unescHtml = html.split('\\\"').join('"');
      const unescIdx = unescHtml.indexOf('"floorArea"');
      const ctx = unescHtml.substring(Math.max(0, unescIdx - 300), unescIdx + 2000);
      const unesc = ctx; // already unescaped
      // floorArea: Zoopla uses object form {"floorArea":{"value":730,"label":"730 sq. ft"}} or plain 730
      const floorArea = ctx.match(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*(\d+)/) || ctx.match(/"floorArea"\s*:\s*(\d+)/);
      const sizeSqft = ctx.match(/"sizeSqft"\s*:\s*"?(\d[\d,]*)"?/);
      const numBedrooms = ctx.match(/"numBedrooms"\s*:\s*(\d)/);
      const numBathrooms = ctx.match(/"numBathrooms"\s*:\s*(\d)/);
      const floorLevel = ctx.match(/"floorLevel"\s*:\s*"([^"]+)"/);
      const tenureType = ctx.match(/"tenureType"\s*:\s*"([^"]+)"/) || ctx.match(/"tenure"\s*:\s*"([^"]+)"/);
      const epc = ctx.match(/"efficiencyRating"\s*:\s*"([^"]+)"/);
      const price = ctx.match(/"originalPrice"\s*:\s*"?(\d+)"?/) || ctx.match(/"internalValue"\s*:\s*"?(\d+)"?/) || ctx.match(/"listingPrice"\s*:\s*"?(\d+)"?/);
      const lat = ctx.match(/"latitude"\s*:\s*([-\d.]+)/);
      const lon = ctx.match(/"longitude"\s*:\s*([-\d.]+)/);
      const postcode = ctx.match(/"postalCode"\s*:\s*"([^"]+)"/) || ctx.match(/"outcode"\s*:\s*"([^"]+)"/);
      const address = ctx.match(/"displayAddress"\s*:\s*"([^"]+)"/);

      Object.assign(result, {
        sqft: floorArea ? parseInt(floorArea[1]) : (sizeSqft ? parseInt(sizeSqft[1].replace(/,/g, '')) : null),
        numBedrooms: numBedrooms ? parseInt(numBedrooms[1]) : null,
        numBathrooms: numBathrooms ? parseInt(numBathrooms[1]) : null,
        floor_level: floorLevel ? floorLevel[1] : null,
        tenure: tenureType ? tenureType[1] : null,
        epc: epc ? epc[1] : null,
        list_price: price ? parseInt(price[1]) : null,
        latitude: lat ? parseFloat(lat[1]) : null,
        longitude: lon ? parseFloat(lon[1]) : null,
        postcode: postcode ? postcode[1] : null,
        address: address ? address[1] : null
      });
    }

    // Extract images from the Next.js data
    const imgMatches = [...html.matchAll(/"(https:\/\/lid\.zoocdn\.com[^"]+)"/g)];
    const seen = new Set();
    imgMatches.forEach(m => {
      const src = m[1].replace(/\\/, '');
      if (!seen.has(src) && !src.includes('sprite') && !src.includes('icon') && !src.includes('logo')) {
        seen.add(src);
        result.gallery.push(src);
      }
    });
    if (result.gallery.length > 0) result.image_url = result.gallery[0];

    // Floorplan detection
    const fpMatch = html.match(/"(https:\/\/lid\.zoocdn\.com[^"]*floorplan[^"]+)"/i);
    if (fpMatch) result.floorplan_url = fpMatch[1];

    // Streetview URL from coordinates
    if (result.latitude && result.longitude) {
      result.streetview_url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${result.latitude},${result.longitude}`;
    }

    // Extract from description text for floor level if not found
    if (!result.floor_level) {
      const descMatch = html.match(/"description"\s*:\s*"([^"]{20,500})"/);
      if (descMatch) {
        const desc = descMatch[1].replace(/\\n/g, ' ');
        const flMatch = desc.match(/\b(ground|first|second|third|fourth|fifth|sixth|seventh|top|penthouse|lower\s+ground|garden\s+level)\s+floor\b/i) ||
                       desc.match(/\b(1st|2nd|3rd|4th|5th|6th|7th)\s+floor\b/i);
        if (flMatch) result.floor_level = flMatch[0].toLowerCase();
      }
    }
  }

  return result;
}


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
      // Primary: FlareSolverr — bypasses Cloudflare for full SSR HTML with sqft, bedrooms, EPC, tenure
      try {
        console.log('[Zoopla] Using FlareSolverr for full SSR extraction...');
        const flaresolverrHtml = await scrapeWithFlaresolverr(url);
        const fsData = await extractFlaresolverrData(flaresolverrHtml, 'Zoopla');
        // Merge FlareSolverr data into result (don't overwrite image_url if already set by Rightmove above)
        result = {
          ...result,
          sqft: fsData.sqft ?? result.sqft,
          numBedrooms: fsData.numBedrooms ?? result.numBedrooms,
          numBathrooms: fsData.numBathrooms ?? result.numBathrooms,
          floor_level: fsData.floor_level ?? result.floor_level,
          tenure: fsData.tenure ?? result.tenure,
          epc: fsData.epc ?? result.epc,
          list_price: fsData.list_price ?? result.list_price,
          latitude: fsData.latitude ?? result.latitude,
          longitude: fsData.longitude ?? result.longitude,
          postcode: fsData.postcode ?? result.postcode,
          gallery: fsData.gallery.length > 0 ? fsData.gallery : result.gallery,
          image_url: result.image_url || fsData.image_url,
          floorplan_url: result.floorplan_url || fsData.floorplan_url,
          streetview_url: result.streetview_url || fsData.streetview_url
        };
        console.log('[Zoopla] FlareSolverr extraction complete:', {
          sqft: result.sqft,
          bedrooms: result.numBedrooms,
          tenure: result.tenure,
          epc: result.epc,
          postcode: result.postcode
        });
      } catch (fsErr) {
        console.log('[Zoopla] FlareSolverr failed, falling back to Playwright:', fsErr.message);
        // Fallback: Playwright __NEXT_DATA__ extraction (may be Cloudflare-blocked)
        const nextData = await page.evaluate(() => {
          const script = document.getElementById('__NEXT_DATA__');
          if (script) return JSON.parse(script.textContent);
          if (window.__NEXT_DATA__) return window.__NEXT_DATA__;
          return null;
        });

        if (nextData) {
          const listingDetails = nextData.props?.pageProps?.listingDetails || nextData.props?.pageProps?.initialProps?.listingDetails;
          if (listingDetails) {
            console.log('Zoopla ListingDetails found (Playwright fallback)');
            if (listingDetails.images?.length > 0) {
              result.image_url = result.image_url || listingDetails.images[0].src;
              if (result.gallery.length === 0) result.gallery = listingDetails.images.slice(0, 5).map(img => img.src);
            }
            if (listingDetails.floorplans && listingDetails.floorplans.length > 0) {
              result.floorplan_url = result.floorplan_url || listingDetails.floorplans[0].src || listingDetails.floorplans[0].url;
            }
            if (listingDetails.floorLevel) {
              result.floor_level = result.floor_level || listingDetails.floorLevel;
            }
            if (listingDetails.location && listingDetails.location.coordinates) {
              const { lat, lon } = listingDetails.location.coordinates;
              result.streetview_url = result.streetview_url || `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
            }
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
