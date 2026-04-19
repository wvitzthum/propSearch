
const { chromium } = require('playwright');
const https = require('https');

const MISSING_LEASES = [
  { addr: 'Lofting Road, Islington N1', price: 650000 },
  { addr: 'Pentonville Road, Angel N1', price: 775000 },
  { addr: 'Hoxton Square, London N1', price: 599950 },
  { addr: 'Wellesley Terrace, Angel N1', price: 525000 },
  { addr: 'Queens Court, Queensway W2', price: 700000 },
  { addr: 'Kendal Steps, Marble Arch W2', price: 750000 },
  { addr: 'Leinster Gardens, London W2', price: 640000 },
];

// Try Zoopla via https module for direct content
function fetchWithHttps(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xhtml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, body: '' }); });
    req.on('error', () => resolve({ status: 0, body: '' }));
  });
}

async function tryZooplaPage(zooplaUrl) {
  const resp = await fetchWithHttps(zooplaUrl);
  if (!resp.body) return null;
  
  // Look for lease data in raw HTML
  const patterns = [
    /(\d{3})\s*(?:years?|yrs?)\s*(?:remaining|left|to run|to go|on lease)/i,
    /lease[^<]{0,100}?(\d{3})\s*(?:years?|yrs?)/i,
    /(?:remaining|left)[^<]{0,100}?(\d{3})\s*(?:years?|yrs?)/i,
    /"lease(?:_years?)?_?(?:remaining|term)"[^{]*?(\d{2,3})/i,
  ];
  for (const p of patterns) {
    const m = resp.body.match(p);
    if (m) return parseInt(m[1]);
  }
  
  // Check if page says listing unavailable
  if (resp.body.includes('no longer available') || resp.body.includes('listing has been removed') || resp.body.includes('this property has been withdrawn')) {
    return 'WITHDRAWN';
  }
  return null;
}

async function main() {
  const results = [];
  for (const item of MISSING_LEASES) {
    const zooplaUrl = `https://www.zoopla.co.uk/for-sale/details/${item.addr.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
    process.stdout.write('[HTTPS] ' + item.addr + '... ');
    
    // Try specific Zoopla URLs based on the original
    // We don't have the listing IDs, so try search
    // Instead let's try the actual URLs from the inbox file
    const resp = await fetchWithHttps(item.url || '');
    if (resp.status === 200) {
      const body = resp.body;
      const patterns = [
        /(\d{3})\s*(?:years?|yrs?)\s*(?:remaining|left|to run|to go|on lease)/i,
        /lease[^<]{0,100}?(\d{3})\s*(?:years?|yrs?)/i,
      ];
      let found = null;
      for (const p of patterns) {
        const m = body.match(p);
        if (m) { found = parseInt(m[1]); break; }
      }
      if (found) {
        console.log(found + ' yrs');
      } else if (body.includes('no longer') || body.includes('been removed') || body.includes('withdrawn')) {
        console.log('WITHDRAWN');
      } else {
        console.log('NOT FOUND in HTML (JS-rendered?)');
      }
    } else {
      console.log('HTTP ' + resp.status);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}
main().catch(console.error);
