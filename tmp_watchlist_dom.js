const { execSync } = require('child_process');
const FS = require('fs');
const FLARESOLVR = 'http://nas.home:8191';
const SESSION = 'ps_watch_dom';

function fsGet(url) {
  const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: 90000, session: SESSION });
  const tmp = '/tmp/fs_dom_' + Date.now() + '.json';
  FS.writeFileSync(tmp, body);
  try {
    const out = execSync(`curl -s -X POST ${FLARESOLVR}/v1 -H "Content-Type: application/json" -d @${tmp}`, { timeout: 100000, maxBuffer: 10 * 1024 * 1024 });
    FS.unlinkSync(tmp);
    const data = JSON.parse(out.toString());
    return data.solution && data.solution.response ? data.solution.response : null;
  } catch (e) { try { FS.unlinkSync(tmp); } catch (e2) {} return null; }
}

const zooplaIds = ['72349745', '72706165', '59131907', '72878094', '71918591', '72798843', '72936048'];

const results = [];
for (const id of zooplaIds) {
  const url = `https://www.zoopla.co.uk/for-sale/details/${id}/`;
  process.stdout.write(`zo-${id}: `);
  const html = fsGet(url);
  if (html) {
    // Get listing date from price history section
    // Look for first listing date
    const listingDate = html.match(/(?:Listed|listing)[^>]*>\s*(\d{1,2}\s+\w+\s+\d{4})/i) ||
                         html.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i);
    const dom = html.match(/"daysOnMarket"\s*:\s*(\d+)/)?.[1] ||
                 html.match(/(\d+)\s*days? on market/i)?.[1];
    
    // Get price history dates
    const priceDates = html.match(/\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/g) || [];
    
    // Get floorplan URL
    const floorplanMatch = html.match(/https:\/\/media\.zoopla\.co\.uk[^"']*floor[^"']*/i) ||
                          html.match(/floorplan[^"']*"[^"]*"(https:[^"]+)"/i);
    
    // Check for listing status
    const statusText = html.match(/market[^>]*status[^>]*>([^<]{3,30})/i) ||
                       html.match(/(sold|under.offer|active|withdrawn)[^<]{0,100}/i);
    
    console.log(`dom:${dom||'?'} | firstDate:${listingDate?.[1]||'?'} | status:${statusText?.[1]||'?'} | floorplan:${floorplanMatch?'YES':'no'} | priceDates:${priceDates.slice(0,3).join(',')||'none'}`);
    results.push({ id, dom, listingDate: listingDate?.[1], status: statusText?.[1], hasFloorplan: !!floorplanMatch });
  } else {
    console.log('FAILED');
    results.push({ id, failed: true });
  }
}

FS.writeFileSync('/tmp/watchlist_dom.json', JSON.stringify(results, null, 2));
console.log('\nSaved');
