
const { chromium } = require('playwright');
const https = require('https');

const PROPS = [
  { uid: 'f6911aa8', addr: 'Belsize Avenue London NW3 flat', sqft: 938 },
  { uid: '91d727d9', addr: 'Coleridge Court Dibden Street Islington N1 flat', sqft: 780 },
  { uid: 'cbbddd70', addr: 'Hillmarton Road London N7 flat sale', sqft: 864 },
  { uid: 'b2c3d4e5', addr: 'Blackthorn Avenue Arundel Square Islington N1 flat', sqft: 948 },
  { uid: 'e5f6a7b8', addr: 'Weech Road West Hampstead London NW6 flat', sqft: 786 },
  { uid: 'c250e495', addr: 'Hatherley Grove Bayswater London W2 flat', sqft: 538 },
];

function fetchGoogleSearch(query) {
  return new Promise((resolve) => {
    const url = 'https://www.google.com/search?q=' + encodeURIComponent(query + ' bedrooms site:rightmove.co.uk OR site:zoopla.co.uk');
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', 'Accept-Language': 'en-GB,en;q=0.9' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, body: '' }); });
    req.on('error', () => resolve({ status: 0, body: '' }));
  });
}

async function main() {
  const fs = require('fs');
  const results = [];
  
  for (const prop of PROPS) {
    process.stdout.write('[GG] ' + prop.addr.split(' London')[0] + '... ');
    
    const resp = await fetchGoogleSearch(prop.addr);
    if (resp.status === 200 && resp.body) {
      const body = resp.body;
      // Look for listing URLs or bedroom mentions
      const listingUrls = body.match(/https:\/\/(?:www\.)?(?:rightmove|zoopla)\.co\.uk[^\s"']+/g) || [];
      const bedroomPattern = /(\d)\s*(?:bed|bedroom)/gi;
      const bedrooms = body.match(bedroomPattern);
      
      if (bedrooms && bedrooms.length > 0) {
        const bedroomNum = parseInt(bedrooms[0]);
        console.log(bedroomNum + ' bed(s) found');
        results.push({ uid: prop.uid, addr: prop.addr, bedrooms: bedroomNum, source: 'google_snippet' });
      } else if (listingUrls.length > 0) {
        console.log('Listings found: ' + listingUrls.length + ' (need to visit)');
        results.push({ uid: prop.uid, addr: prop.addr, bedrooms: null, source: 'listing_found', urls: listingUrls.slice(0, 2) });
      } else {
        console.log('NOT FOUND');
        results.push({ uid: prop.uid, addr: prop.addr, bedrooms: null });
      }
    } else {
      console.log('SEARCH FAILED (HTTP ' + resp.status + ')');
      results.push({ uid: prop.uid, addr: prop.addr, bedrooms: null });
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  
  fs.writeFileSync('/workspaces/propSearch/scripts/google_bedroom_results.json', JSON.stringify(results, null, 2));
  console.log('\nDone.');
}
main().catch(console.error);
