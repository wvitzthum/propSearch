
const { chromium } = require('playwright');
const https = require('https');

const PROPS = [
  { uid: 'f6911aa8', addr: 'Belsize Avenue, London NW3', postcode: 'NW3', sqft: 938 },
  { uid: '91d727d9', addr: 'Coleridge Court, Dibden Street, London N1', postcode: 'N1', sqft: 780 },
  { uid: 'cbbddd70', addr: 'Hillmarton Road, London N7', postcode: 'N7', sqft: 864 },
  { uid: 'b2c3d4e5', addr: 'Blackthorn Avenue, London N1', postcode: 'N1', sqft: 948 },
  { uid: 'e5f6a7b8', addr: 'Weech Road, London NW6', postcode: 'NW6', sqft: 786 },
  { uid: 'c250e495', addr: 'Hatherley Grove, London W2', postcode: 'W2', sqft: 538 },
];

function fetchUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, body: '' }); });
    req.on('error', () => resolve({ status: 0, body: '' }));
  });
}

async function tryEPCRegister(prop) {
  // Try EPC Register UK: https://www.epcregister.com/epcsearch.html?searchType=address
  const searchUrl = 'https://www.epcregister.com/epcsearch.html?searchType=address&addressPostcode=' + encodeURIComponent(prop.postcode) + '&addressLine1=' + encodeURIComponent(prop.addr.split(',')[0]);
  const resp = await fetchUrl(searchUrl);
  if (resp.status === 200) {
    const m = resp.body.match(/(\d)\s*(?:bed|bedroom)/gi);
    if (m) return { bedrooms: parseInt(m[0]), source: 'EPC Register' };
    if (resp.body.includes('No EPC found') || resp.body.includes('no results')) {
      return { status: 'no_epc' };
    }
  }
  return null;
}

async function main() {
  const results = [];
  for (const prop of PROPS) {
    process.stdout.write('[EPC] ' + prop.addr.split(',')[0] + ' (' + prop.postcode + ')... ');
    const r = await tryEPCRegister(prop);
    if (r && r.bedrooms) {
      console.log(r.bedrooms + ' bed(s) (' + r.source + ')');
      results.push({ uid: prop.uid, addr: prop.addr, bedrooms: r.bedrooms, source: r.source });
    } else if (r && r.status === 'no_epc') {
      console.log('No EPC on register');
      results.push({ uid: prop.uid, addr: prop.addr, bedrooms: null, status: 'no_epc' });
    } else {
      console.log('FAILED');
      results.push({ uid: prop.uid, addr: prop.addr, bedrooms: null });
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  
  const fs = require('fs');
  fs.writeFileSync('/workspaces/propSearch/scripts/epc_bedroom_results.json', JSON.stringify(results, null, 2));
  console.log('\nDone.');
}
main().catch(console.error);
