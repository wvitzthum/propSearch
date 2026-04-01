const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOX_DIR = path.join(__dirname, '../../data/inbox');

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
    
    // Find a valid URL to scrape
    let targetUrl = null;
    if (data.links && data.links.length > 0) {
      // Prioritize Rightmove/Zoopla for visual extraction
      targetUrl = data.links.find(l => l.includes('rightmove.co.uk') || l.includes('zoopla.co.uk'));
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
    } else {
      console.log('No suitable portal URL found in links.');
    }
    
  } catch (e) {
    console.error(`Error processing ${file}: ${e.message}`);
  }
}

console.log('--- Enrichment Complete ---');
