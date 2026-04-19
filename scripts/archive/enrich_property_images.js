/**
 * Enrich properties with missing/placeholder images
 * Scrapes Rightmove/Zoopla for high-res images
 */

const { chromium } = require('playwright');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../data/propSearch.db');

async function scrapePropertyImages(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  const page = await context.newPage();

  console.log(`  Scraping: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('  Goto timed out'));
    await page.waitForTimeout(2000);

    let result = {
      image_url: null,
      gallery: [],
      floorplan_url: null
    };

    if (url.includes('rightmove.co.uk')) {
      const jsonModel = await page.evaluate(() => {
        return window.jsonModel || window.__PRELOADED_STATE__ || window.PAGE_MODEL;
      });
      
      if (jsonModel) {
        const pd = jsonModel.propertyData || jsonModel.property;
        if (pd && pd.images && pd.images.length > 0) {
          result.image_url = pd.images[0].url;
          result.gallery = pd.images.slice(0, 5).map(img => img.url);
        }
        if (pd && pd.floorplans && pd.floorplans.length > 0) {
          result.floorplan_url = pd.floorplans[0].url;
        }
      }
    } else if (url.includes('zoopla.co.uk')) {
      const nextData = await page.evaluate(() => {
        const script = document.getElementById('__NEXT_DATA__');
        if (script) return JSON.parse(script.textContent);
        if (window.__NEXT_DATA__) return window.__NEXT_DATA__;
        return null;
      });

      if (nextData) {
        const listingDetails = nextData.props?.pageProps?.listingDetails;
        if (listingDetails && listingDetails.images?.length > 0) {
          result.image_url = listingDetails.images[0].src;
          result.gallery = listingDetails.images.slice(0, 5).map(img => img.src);
        }
        if (listingDetails && listingDetails.floorplans?.length > 0) {
          result.floorplan_url = listingDetails.floorplans[0].src || listingDetails.floorplans[0].url;
        }
      }
    }

    // Fallback to heuristic if portal extraction failed
    if (!result.image_url) {
      const heuristicAssets = await page.evaluate(() => {
        const allImages = Array.from(document.querySelectorAll('img')).map(img => {
          const srcset = img.srcset || img.parentElement?.querySelector('source')?.srcset;
          return {
            src: srcset ? srcset.split(',').map(s => s.trim().split(' ')[0]).pop() : img.src,
            width: img.naturalWidth
          };
        }).filter(img => {
          const src = img.src.toLowerCase();
          return !/logo|icon|avatar|social|button|arrow|loader/i.test(src) && 
                 img.width > 200 &&
                 (src.startsWith('http') || src.includes('.zoocdn.') || src.includes('.rightmove.'));
        });
        return allImages.map(img => img.src);
      });
      
      if (heuristicAssets.length > 0) {
        result.image_url = result.image_url || heuristicAssets[0];
        if (result.gallery.length === 0) result.gallery = heuristicAssets.slice(0, 5);
      }
    }

    console.log(`  Found image: ${result.image_url ? 'Yes' : 'No'}`);
    return result;

  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return { image_url: null, gallery: [], floorplan_url: null };
  } finally {
    await browser.close();
  }
}

async function main() {
  const db = new sqlite3.Database(DB_PATH);
  
  // Find properties that need image enrichment
  // Criteria: image_url is NULL, empty, or contains agent URLs
  const query = `
    SELECT id, address, image_url, gallery, links 
    FROM properties 
    WHERE image_url IS NULL 
       OR image_url = '' 
       OR image_url LIKE '%kfh.co.uk%' 
       OR image_url LIKE '%primelocation%'
       OR image_url LIKE '%test%'
       OR image_url LIKE '%unsplash%'
  `;
  
  db.all(query, async (err, properties) => {
    if (err) {
      console.error('Database error:', err);
      db.close();
      return;
    }

    console.log(`\nFound ${properties.length} properties needing image enrichment\n`);
    
    let updated = 0;
    
    for (const prop of properties) {
      console.log(`Processing: ${prop.address}`);
      
      // Parse links array
      let links = [];
      try {
        links = JSON.parse(prop.links || '[]');
      } catch (e) {
        links = [];
      }
      
      // Find a portal URL to scrape
      let portalUrl = links.find(l => l.includes('rightmove.co.uk') || l.includes('zoopla.co.uk'));
      
      if (portalUrl) {
        const result = await scrapePropertyImages(portalUrl);
        
        if (result.image_url) {
          // Update database
          const galleryJson = JSON.stringify(result.gallery);
          db.run(
            `UPDATE properties SET image_url = ?, gallery = ?, floorplan_url = COALESCE(?, floorplan_url) WHERE id = ?`,
            [result.image_url, galleryJson, result.floorplan_url, prop.id],
            (err) => {
              if (err) {
                console.error(`  Update error: ${err.message}`);
              } else {
                console.log(`  ✓ Updated`);
                updated++;
              }
            }
          );
        }
      } else {
        console.log(`  No portal URL found`);
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 1000));
    }
    
    setTimeout(() => {
      console.log(`\n✓ Enrichment complete. Updated ${updated} properties.`);
      db.close();
    }, 1000);
  });
}

main();
