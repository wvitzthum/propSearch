#!/usr/bin/env node
/**
 * enrich_council_tax.js
 * Enriches properties with council_tax_band from Rightmove PAGE_MODEL.
 * Properties where band cannot be determined are set to 'TBC'.
 * 
 * Usage: node scripts/enrich_council_tax.js [--dry-run] [--batch N]
 */

const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/propSearch.db');
const IS_DRY_RUN = process.argv.includes('--dry-run');
const BATCH_IDX = process.argv.indexOf('--batch');
const TARGET_BATCH = BATCH_IDX >= 0 ? parseInt(process.argv[BATCH_IDX + 1]) : 15;

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function extractPostcode(address) {
  if (!address) return null;
  const m = address.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i);
  return m ? m[0].toUpperCase().replace(/\s+/g, ' ').trim() : null;
}

async function scrapeRightmoveCouncilTax(rightmoveUrl, propId) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });

  let band = null;
  try {
    await page.goto(rightmoveUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);

    try {
      const btn = await page.getByRole('button', { name: /accept/i });
      if (await btn.isVisible()) { await btn.click(); await page.waitForTimeout(400); }
    } catch (_) {}

    band = await page.evaluate(() => {
      try {
        const lc = window.PAGE_MODEL?.propertyData?.livingCosts;
        // Direct path — handles both a value and null (unscraped)
        const rawBand = lc?.councilTaxBand;
        if (rawBand && String(rawBand).trim() !== 'TBC') {
          return String(rawBand).trim();
        }
        // Regex fallback — also catches null (unquoted) where RM hasn't assigned a band yet
        const raw = JSON.stringify(window.PAGE_MODEL);
        const m = raw.match(/"councilTaxBand"\s*:\s*"([A-G]{1})"/i);
        if (m) return m[1];
        // If raw value is null or TBC explicitly, return 'TBC' so caller knows we tried
        if (rawBand === null || String(rawBand) === 'TBC') return 'TBC';
        return null;
      } catch (_) { return null; }
    });
  } catch (err) {
    // page failed to load — band stays null
  } finally {
    await browser.close();
  }
  return band;
}

async function main() {
  const props = db.prepare(`
    SELECT id, address, council_tax_band, links
    FROM properties WHERE archived = 0 AND council_tax_band IS NULL
    LIMIT ?
  `).all(TARGET_BATCH);

  console.log(`Processing ${props.length} properties for council tax band...\n`);

  let updated = 0, tbc = 0, skipped = 0;

  for (const prop of props) {
    let band = null;
    let source = null;
    const shortId = prop.id.slice(0, 12);

    // 1. Rightmove via PAGE_MODEL
    try {
      const rawLinks = prop.links || '[]';
      let links;
      try {
        links = JSON.parse(rawLinks);
      } catch (_) {
        // links might be a bare string URL
        links = [rawLinks];
      }
      if (!Array.isArray(links)) links = [links];
      const rmUrlCandidate = links.find(l => {
        const url = typeof l === 'string' ? l : (l && l.url);
        return url && url.includes('rightmove.co.uk');
      });
      const rmUrl = typeof rmUrlCandidate === 'string' ? rmUrlCandidate : (rmUrlCandidate && rmUrlCandidate.url);
      if (rmUrl) {
        process.stdout.write(`[${shortId}] Rightmove: ${rmUrl.slice(0,60)} ... `);
        band = await scrapeRightmoveCouncilTax(rmUrl, prop.id);
        if (band) {
          source = 'rightmove';
          console.log(`✓ Band ${band}`);
        } else {
          console.log('✗ not found');
        }
      }
    } catch (e) {
      console.log(`[${shortId}] parse/link error: ${e.message}`);
    }

    // 1b. Zoopla via __NEXT_DATA__ (alternative source)
    if (!band) {
      try {
        const rawLinks = prop.links || '[]';
        let links;
        try { links = JSON.parse(rawLinks); } catch (_) { links = [rawLinks]; }
        if (!Array.isArray(links)) links = [links];
        const zpUrlCandidate = links.find(l => {
          const url = typeof l === 'string' ? l : (l && l.url);
          return url && url.includes('zoopla.co.uk');
        });
        const zpUrl = typeof zpUrlCandidate === 'string' ? zpUrlCandidate : (zpUrlCandidate && zpUrlCandidate.url);
        if (zpUrl) {
          // Zoopla band extraction — skip for now, Rightmove has better coverage
          // (Zoopla's __NEXT_DATA__ structure is less reliable for livingCosts)
        }
      } catch (_) {}
    }

    // 2. Record result even if TBC/null — better than nothing
    // Only mark TBC if we have a postcode to allow manual lookup later
    if (!band) {
      const postcode = extractPostcode(prop.address);
      if (postcode) {
        band = 'TBC'; // explicit TBC for properties where RM hasn't set a band yet
        source = 'postcode_extracted';
        console.log(`[${shortId}] Band TBC on Rightmove — postcode ${postcode} → TBC`);
      } else {
        console.log(`[${shortId}] No postcode extractable — leaving blank`);
        skipped++;
        continue;
      }
    }

    if (!IS_DRY_RUN) {
      db.prepare(`UPDATE properties SET council_tax_band = ? WHERE id = ?`).run(band, prop.id);
    } else {
      console.log(`[${shortId}] DRY RUN — would set ${band}`);
    }
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, TBC: ${tbc}, Skipped: ${skipped}`);
  if (IS_DRY_RUN) console.log('(DRY RUN — no DB changes)');
}

main().catch(console.error);
