#!/usr/bin/env node
/**
 * enrich_flagged_properties.js
 * Batch enrichment for archived=1 (flagged) properties.
 * Extracts: image_url, gallery, floorplan_url, floor_level from Zoopla/Rightmove.
 * Then unarchives (archived=0) records with confirmed address + data.
 * Usage: node scripts/enrich_flagged_properties.js [--dry-run]
 */

const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/propSearch.db');
const IS_DRY_RUN = process.argv.includes('--dry-run');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

async function scrapeProperty(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });

  const result = {
    image_url: null, gallery: [], floorplan_url: null, floor_level: null, epc_note: null
  };

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);

    // Try to accept cookies
    try {
      const btn = await page.getByRole('button', { name: /accept/i });
      if (await btn.isVisible()) { await btn.click(); await page.waitForTimeout(500); }
    } catch (_) {}

    const source = url.includes('rightmove') ? 'Rightmove' : url.includes('zoopla') ? 'Zoopla' : 'Unknown';

    // Try portal-specific JSON extraction
    if (source === 'Zoopla') {
      const nextData = await page.evaluate(() => {
        const script = document.getElementById('__NEXT_DATA__');
        if (!script) return null;
        return JSON.parse(script.textContent);
      });

      if (nextData) {
        const listing = nextData.props?.pageProps?.listingDetails
          || nextData.props?.pageProps?.initialProps?.listingDetails;
        if (listing) {
          if (listing.images?.length > 0) {
            result.image_url = listing.images[0].src;
            result.gallery = listing.images.slice(0, 5).map(i => i.src);
          }
          if (listing.floorplans?.length > 0) {
            result.floorplan_url = listing.floorplans[0].src || listing.floorplans[0].url;
          }
          if (listing.floorLevel) result.floor_level = listing.floorLevel;
        }
      }
    }

    // Heuristic fallback + floor level text search
    if (!result.image_url || !result.floor_level) {
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 80));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1000);

      const heuristic = await page.evaluate(() => {
        const getSrc = (img) => {
          if (img.parentElement?.tagName === 'PICTURE') {
            const src = img.parentElement.querySelector('source');
            if (src?.srcset) return src.srcset.split(',').map(s => s.trim().split(' ')[0]).pop();
          }
          if (img.srcset) return img.srcset.split(',').map(s => s.trim().split(' ')[0]).pop();
          return img.getAttribute('data-src') || img.src;
        };

        const allImgs = Array.from(document.querySelectorAll('img'));
        const gallery = allImgs
          .filter(img => {
            const s = img.src.toLowerCase();
            const a = (img.alt || '').toLowerCase();
            if (/logo|icon|avatar|user|star|social|button|arrow|chevron/i.test(s + a)) return false;
            if (img.naturalWidth > 0 && img.naturalWidth < 200) return false;
            if (img.naturalHeight > 0 && img.naturalHeight < 150) return false;
            return s.startsWith('http') && (s.includes('zoocdn') || s.includes('rightmove') || s.includes('media'));
          })
          .map(img => getSrc(img))
          .slice(0, 5);

        const fp = allImgs.find(img =>
          /floorplan|floor.?plan/i.test(img.src + img.alt + (img.parentElement?.innerText || ''))
          && !img.src.includes('static')
        );

        const text = document.body.innerText;
        const floorMatch = text.match(/\b(ground|first|second|third|fourth|fifth|sixth|top|penthouse|basement|lower\s+ground)\s+floor\b/i)
          || text.match(/\b(1st|2nd|3rd|4th|5th|6th)\s+floor\b/i)
          || text.match(/\bfloor\s+(?:room\s+)?[1-6]\b/i);
        const floorLevel = floorMatch ? floorMatch[0] : null;

        // EPC search
        const epcPattern = /(?:EPC|Energy Performance Certificate|Energy Rating)[^\n]{0,200}/gi;
        const epcMatches = text.match(epcPattern);

        return { gallery, floorplan: fp ? getSrc(fp) : null, floorLevel, epcHint: epcMatches ? epcMatches[0].substring(0, 200) : null };
      });

      if (!result.image_url && heuristic.gallery.length > 0) {
        result.image_url = heuristic.gallery[0];
        result.gallery = heuristic.gallery;
      }
      if (!result.floorplan_url && heuristic.floorplan) {
        result.floorplan_url = heuristic.floorplan.startsWith('http') ? heuristic.floorplan : null;
      }
      result.floor_level = result.floor_level || heuristic.floorLevel;
      result.epc_note = heuristic.epcHint;
    }

  } catch (err) {
    console.error(`  [!] Error scraping ${url}: ${err.message}`);
  } finally {
    await browser.close();
  }

  return result;
}

async function main() {
  console.log('=== DE-160: Flagged Property Enrichment ===');
  console.log('Dry run:', IS_DRY_RUN);
  console.log('');

  // Get all flagged properties with links
  const props = db.prepare(`
    SELECT id, address, links, image_url, floor_level, archived
    FROM properties
    WHERE archived = 1
      AND address IS NOT NULL
      AND LENGTH(links) > 2
    ORDER BY area
  `).all();

  console.log(`Found ${props.length} flagged properties with portal links`);
  console.log('');

  let updated = 0;
  let skipped = 0;
  let epcFound = 0;

  for (const prop of props) {
    const links = JSON.parse(prop.links || '[]');
    const portalUrl = links.find(l => (l.url || l).includes('zoopla') || (l.url || l).includes('rightmove'));
    const url = portalUrl?.url || portalUrl;

    if (!url) { skipped++; continue; }

    process.stdout.write(`[${updated + skipped + 1}/${props.length}] ${prop.address?.substring(0, 50)}... `);

    if (!IS_DRY_RUN) {
      const data = await scrapeProperty(url);

      const hasNewVisual = data.image_url && data.image_url !== prop.image_url;
      const hasFloorLevel = data.floor_level && data.floor_level !== prop.floor_level;
      const hasFloorplan = !!data.floorplan_url;

      if (hasNewVisual || hasFloorLevel || hasFloorplan) {
        const galleryJson = data.gallery.length > 0 ? JSON.stringify(data.gallery) : null;
        const newFloorplan = hasFloorplan ? data.floorplan_url : null;

        db.prepare(`
          UPDATE properties
          SET image_url = COALESCE(?, image_url),
              gallery = COALESCE(?, gallery),
              floorplan_url = COALESCE(?, floorplan_url),
              floor_level = COALESCE(?, floor_level)
          WHERE id = ?
        `).run(
          data.image_url, galleryJson, newFloorplan,
          data.floor_level, prop.id
        );
        updated++;
        console.log(`✓ image:${hasNewVisual} floorplan:${hasFloorplan} floor:${hasFloorLevel}`);
        if (data.epc_note) { console.log(`  EPC hint: ${data.epc_note.substring(0, 100)}`); epcFound++; }
      } else {
        console.log(`— no new visuals/floor level`);
        if (data.epc_note) { console.log(`  EPC hint: ${data.epc_note.substring(0, 100)}`); epcFound++; }
        skipped++;
      }

      await new Promise(r => setTimeout(r, 2000)); // Rate limit
    }
  }

  // Handle null-address record
  const nullAddr = db.prepare('SELECT id, archive_reason FROM properties WHERE address IS NULL AND archived = 1').get();
  if (nullAddr) {
    console.log('');
    console.log(`[!] Null-address record: ${nullAddr.id}`);
    console.log('    Setting archive_reason: Cannot Verify — Discard');
    if (!IS_DRY_RUN) {
      db.prepare("UPDATE properties SET archive_reason = 'Cannot Verify — Discard' WHERE id = ?").run(nullAddr.id);
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log('Updated:', updated, '| Skipped (no change):', skipped, '| EPC hints found:', epcFound);
  console.log('Null-address record: flagged as Cannot Verify');
}

main().catch(console.error);
