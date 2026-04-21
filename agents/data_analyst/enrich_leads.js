const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOX_DIR = path.join(__dirname, '../../data/inbox');

/**
 * DAT-216 FIX: Always ensure the submission URL is in links[].
 * Frontend submissions store the portal URL in the `url` field, not `links[]`.
 * If links[] is empty but `url` is present, populate links[] now.
 * The `links` field MUST be a plain string array — frontend SourceHub.tsx expects
 * `string[]` (URL strings only). Never store objects like `{url, source}` in DB.
 */
function ensureUrlInLinks(data) {
  const url = (data.url || '').trim();
  if (!url) return data;

  const existingUrls = Array.isArray(data.links)
    ? data.links.map(l => (typeof l === 'string' ? l : (l && l.url) || ''))
    : [];

  const urlAlreadyInLinks = existingUrls.some(u => u.toLowerCase() === url.toLowerCase());

  if (urlAlreadyInLinks) return data;

  data.links = [...(data.links || []), url];
  console.log(`[DAT-216] Injected submission URL into links[]: ${url}`);
  return data;
}

console.log('--- Starting Enrichment Pipeline ---');

if (!fs.existsSync(INBOX_DIR)) {
  console.log('No inbox directory found.');
  process.exit(0);
}

const files = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.json'));
console.log(`Found ${files.length} files in inbox.`);

for (const file of files) {
  const filePath = path.join(INBOX_DIR, file);
  console.log(`Processing ${file}...`);

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Guard: skip files with no links and no price — nothing to scrape or import
    const links = Array.isArray(data.links) ? data.links : (data.url ? [data.url] : []);
    const hasPrice = data.list_price && data.list_price > 0;
    if (links.length === 0 && !hasPrice) {
      console.log(`[GUARD] SKIPPED — no links/URL and no price for: ${file}`);
      continue;
    }
    if (links.length === 0) {
      console.log(`[GUARD] SKIPPED — no links/URL for: ${file} (has price £${data.list_price})`);
      continue;
    }

    // DAT-216 FIX: Ensure submission URL is in links[] before scraping or syncing
    // Capture state BEFORE injection so we can detect if links[] changed
    const linksCountBefore = (data.links || []).length;
    if (!data.links) data.links = [];
    data = ensureUrlInLinks(data);
    const linksUpdated = data.links.length > linksCountBefore;

    // Find a valid URL to scrape
    let targetUrl = null;
    if (data.links && data.links.length > 0) {
      // Prioritize Rightmove/Zoopla for visual extraction
      targetUrl = data.links.find(l => {
        const linkUrl = typeof l === 'string' ? l : (l && l.url);
        return linkUrl && (linkUrl.includes('rightmove.co.uk') || linkUrl.includes('zoopla.co.uk'));
      });
    }

    if (targetUrl) {
      console.log(`Scraping visuals from: ${targetUrl}`);
      try {
        // Call scrape_visuals.js
        const output = execSync(`node "${path.resolve(__dirname, '../../scripts/scrape_visuals.js')}" "${targetUrl}"`, { encoding: 'utf8' });
        
        // Parse the output to find the JSON result
        // The script prints logs, so we need to find the JSON part
        const lines = output.split('\n');
        let jsonStart = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim() === '--- Extraction Complete ---') {
            jsonStart = i + 1;
            break;
          }
        }
        
        if (jsonStart > -1) {
          const jsonStr = lines.slice(jsonStart).join('\n');
          const result = JSON.parse(jsonStr);
          
          // Merge results into data
          let updated = false;

          // DAT-216 FIX: Extract portal URL and source from scrape result
          // scrape_visuals.js already knows the URL it scraped — capture it as a plain string
          if (result.url && result.source && result.source !== 'Unknown') {
            const resultUrl = typeof result.url === 'string' ? result.url : result.url.url || result.url;
            if (resultUrl) {
              const existingUrls = Array.isArray(data.links)
                ? data.links.map(l => (typeof l === 'string' ? l : (l && l.url) || ''))
                : [];
              if (!existingUrls.some(u => u.toLowerCase() === resultUrl.toLowerCase())) {
                data.links = [...(data.links || []), resultUrl];
                updated = true;
                console.log(`[DAT-216] Captured portal URL from scrape result: ${resultUrl}`);
              }
            }
          }

          if (result.image_url && !data.image_url) {
            data.image_url = result.image_url;
            updated = true;
          }
          if (result.gallery && result.gallery.length > 0 && (!data.gallery || data.gallery.length === 0)) {
            data.gallery = result.gallery;
            updated = true;
          }
          if (result.floorplan_url && !data.floorplan_url) {
            data.floorplan_url = result.floorplan_url;
            updated = true;
          }
          if (result.floor_level && !data.floor_level) {
            data.floor_level = result.floor_level;
            updated = true;
          }
          if (result.streetview_url && !data.streetview_url) {
            data.streetview_url = result.streetview_url;
            updated = true;
          }
          
          if (updated) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Updated ${file} with visual data.`);
          } else {
            console.log(`No new visual data found for ${file}.`);
          }
        } else {
            console.log('Could not find JSON output from scraper.');
        }
      } catch (err) {
        console.error(`Failed to scrape ${targetUrl}: ${err.message}`);
      }
    }

    // DAT-216 FIX: If links[] was injected from the `url` field, save the inbox file
    // so sync_data.js picks up the URL when it next runs. This is the only chance to
    // get the URL into the SQLite links[] column — sync_data.js reads links[], not url.
    if (linksUpdated) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`[DAT-216] Saved ${file} with injected links[]. URL will be captured by sync_data.js.`);
    }
    
  } catch (e) {
    console.error(`Error processing ${file}: ${e.message}`);
  }
}

console.log('--- Enrichment Complete ---');
