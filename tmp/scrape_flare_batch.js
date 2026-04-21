
const http = require('http');

const FLARESOLVR_URL = 'http://nas.home:8191';
const SESSION = 'propSearch';
const TIMEOUT = 90; // seconds

function scrapeFlare(url) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: TIMEOUT * 1000, session: SESSION });
    const u = new URL(FLARESOLVR_URL);
    const req = http.request({
      hostname: u.hostname, port: u.port || 8191, path: '/v1', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.status !== 'ok') return reject(new Error('FlareSolverr: ' + (j.message || j.status)));
          resolve(j.solution.response);
        } catch (e) { reject(new Error('Parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function extractFromHtml(html, source) {
  const result = { url: '', source, address: null, list_price: null, bedrooms: null, bathrooms: null, sqft: null, tenure: null, epc: null, council_tax_band: null, floor_level: null, service_charge: null };
  
  // Price
  const priceMatch = html.match(/['"]price['"].*?(\d[\d,]+\.?\d*)/) || html.match(/£[\s]*([\d,]+(?:\.\d{2})?)/);
  if (priceMatch) result.list_price = parseInt(priceMatch[1].replace(/,/g, ''));
  
  // Address
  const addrMatch = html.match(/address['"]\s*:\s*['"]([^'"]+)['"]/) || html.match(/<h1[^>]*>([^<]+)<\/h1>/) || html.match(/['"]streetAddress['"]\s*:\s*['"]([^'"]+)['"]/);
  if (addrMatch) result.address = addrMatch[1].trim();
  
  // Bedrooms
  const bedMatch = html.match(/['"]numBedrooms['"]\s*:\s*(\d)/) || html.match(/(\d+)\s*bedroom/i) || html.match(/(\d+)\s*beds?/i);
  if (bedMatch) result.bedrooms = parseInt(bedMatch[1]);
  
  // Bathrooms
  const bathMatch = html.match(/['"]numBathroom[s]?['"]\s*:\s*(\d)/) || html.match(/(\d+)\s*bathroom/i) || html.match(/(\d+)\s*baths?/i);
  if (bathMatch) result.bathrooms = parseInt(bathMatch[1]);
  
  // Sqft
  const sqftMatch = html.match(/(\d[\d,]+)\s*sq[\.\s]?\s*(?:ft|feet)/i) || html.match(/floorArea['"]\s*:\s*['"]([^'"]+)['"]/);
  if (sqftMatch) result.sqft = parseInt(sqftMatch[1].replace(/,/g, ''));
  
  // Tenure
  const tenureMatch = html.match(/(?:tenure|hold)\s*[:\-]?\s*(?:share\s*of\s*freehold|freehold|leasehold)/i);
  if (tenureMatch) result.tenure = tenureMatch[0].trim();
  
  // EPC
  const epcMatch = html.match(/EPC\s*[:\s]+([A-G])/i) || html.match(/['"]EPCRating['"]\s*:\s*['"]([A-G])['"]/);
  if (epcMatch) result.epc = epcMatch[1].toUpperCase();
  
  // Council tax
  const ctMatch = html.match(/council\s*tax.*?([A-H])/i) || html.match(/Council\s*Tax\s*Band.*?([A-H])/i);
  if (ctMatch) result.council_tax_band = ctMatch[1].toUpperCase();
  
  return result;
}

async function main() {
  const urls = [
    'https://www.marshandparsons.co.uk/properties-for-sale/london/property/CSG211027/warwick-avenue/',
    'https://www.chestertons.co.uk/properties/20311641/sales/VEN250013',
    'https://www.winkworth.co.uk/properties/sales/goswell-road-london-ec1v/CLK260034',
    'https://landstones.co.uk/property/orsett-terrace-w2-rs0596ldabcfqa/?department=residential-sales',
    'https://www.zoopla.co.uk/for-sale/details/72678118/',
    'https://www.zoopla.co.uk/for-sale/details/59131907/',
    'https://www.zoopla.co.uk/for-sale/details/72832075/',
    'https://www.zoopla.co.uk/for-sale/details/66853917/',
    'https://www.zoopla.co.uk/for-sale/details/72722616/',
    'https://www.zoopla.co.uk/for-sale/details/70114990/',
    'https://www.zoopla.co.uk/for-sale/details/72824810/',
  ];
  
  const results = [];
  for (const url of urls) {
    console.error('SCRAPING: ' + url);
    try {
      const html = await scrapeFlare(url);
      console.error('  HTML length: ' + html.length);
      const r = extractFromHtml(html, url.includes('zoopla') ? 'Zoopla' : url.includes('winkworth') ? 'Winkworth' : url.includes('landstones') ? 'Landstones' : url.includes('mars') ? 'Mars & Parsons' : url.includes('chestertons') ? 'Chestertons' : 'Unknown');
      r.url = url;
      console.error('  Address: ' + r.address + ' | Price: ' + r.list_price + ' | Beds: ' + r.bedrooms + ' | Sqft: ' + r.sqft + ' | Tenure: ' + r.tenure + ' | EPC: ' + r.epc);
      results.push(r);
    } catch (e) {
      console.error('  FAILED: ' + e.message);
      results.push({ url, source: 'FAILED', address: null, list_price: null, bedrooms: null, bathrooms: null, sqft: null, tenure: null, epc: null, council_tax_band: null, floor_level: null, service_charge: null, error: e.message });
    }
  }
  
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => { console.error(e.message); process.exit(1); });
