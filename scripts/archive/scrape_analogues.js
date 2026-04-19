const HTTP = require('http');
const FLARESOLVR_URL = 'http://nas.home:8191';
const SESSION = 'propSearch-analog-' + Date.now();

function fsGet(url, cb, attempt) {
  attempt = attempt || 1;
  var body = JSON.stringify({cmd:'request.get',url,maxTimeout:90000,session:SESSION+'-'+attempt});
  var u = new URL(FLARESOLVR_URL);
  var opts = {hostname:u.hostname,port:u.port||8191,path:'/v1',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}};
  var req = HTTP.request(opts, function(res) {
    var data = '';
    res.on('data', function(c) { data += c; });
    res.on('end', function() {
      try { cb(JSON.parse(data).solution.response, attempt); }
      catch(e) { cb(null, attempt); }
    });
  });
  req.on('error', function() { cb(null, attempt); });
  req.write(body); req.end();
}

function extractBrief(html, listingId) {
  var r = { id: listingId, url:'https://www.zoopla.co.uk/for-sale/details/'+listingId+'/' };
  var clean = html.replace(/\\\\\"/g, '\"');
  var metaMatch = clean.match(/metaTitle\":\"([^\"]+)/);
  if (metaMatch) r.title = metaMatch[1];
  var addrMatch = clean.match(/\"address\":\"([^\"]{10,100})/);
  if (addrMatch) r.address = addrMatch[1];
  var priceMatch = clean.match(/metaTitle\":\"[^\"]*£([\d,]+)/);
  if (priceMatch) r.price = parseInt(priceMatch[1].replace(/,/g,''));
  var bedsMatch = clean.match(/\"numBeds\":\s*(\d+)/);
  var bathsMatch = clean.match(/\"numBaths\":\s*(\d+)/);
  if (bedsMatch) r.beds = parseInt(bedsMatch[1]);
  if (bathsMatch) r.baths = parseInt(bathsMatch[1]);
  var sqftMatch = clean.match(/floorArea[\"\\s]*value[\"\\s:]*(\d{3,5})/) || clean.match(/\"sizeSqft\":\s*(\d+)/);
  if (sqftMatch) r.sqft = parseInt(sqftMatch[1]);
  var tenureMatch = clean.match(/\"tenure\":\"([^\"]+)\"/);
  if (tenureMatch) r.tenure = tenureMatch[1];
  var floorMatch = clean.match(/\"floorLevel\":\"([^\"]+)\"/) ||
                   clean.match(/(ground floor|lower ground|first floor|second floor|third floor|top floor|penthouse|upper floor)/i);
  if (floorMatch) r.floor = floorMatch[1];
  var latMatch = clean.match(/\"latitude\":\s*([-\d.]+)/);
  var lngMatch = clean.match(/\"longitude\":\s*([-\d.]+)/);
  if (latMatch) r.lat = parseFloat(latMatch[1]);
  if (lngMatch) r.lng = parseFloat(lngMatch[1]);
  if (r.lat && r.lng) r.streetview_url = 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + r.lat + ',' + r.lng;
  var domMatch = clean.match(/\"daysOnSite\":\s*(\d+)/) || clean.match(/\"daysOnMarket\":\s*(\d+)/);
  if (domMatch) r.dom = parseInt(domMatch[1]);
  var ingested = clean.match(/\"ingested\"[\s\S]{0,800}?[\}\]]/);
  if (ingested) {
    var scMatch = ingested[0].match(/\"serviceCharge\":\s*(\d+)/);
    if (scMatch) r.service_charge = parseInt(scMatch[1]);
    var grMatch = ingested[0].match(/\"groundRent\":\s*(\d+)/);
    if (grMatch) r.ground_rent = parseInt(grMatch[1]);
    var ctMatch = ingested[0].match(/\"councilTaxBand\":\s*\"([^\"]+)\"/);
    if (ctMatch) r.council_tax_band = ctMatch[1];
    var epcMatch = ingested[0].match(/\"eerCurrent\":\s*(\d+)/);
    if (epcMatch) r.epc_current = parseInt(epcMatch[1]);
  }
  var agentMatch = clean.match(/\"agentName\":\"([^\"]+)\"/);
  if (agentMatch) r.agent = agentMatch[1];
  return r;
}

// Phase 1: search all 3 areas, collect IDs
var searches = [
  { area: 'NW3', url: 'https://www.zoopla.co.uk/for-sale/property/belsize-park/?beds_min=2&beds_max=2&price_max=850000' },
  { area: 'Angel', url: 'https://www.zoopla.co.uk/for-sale/property/angel/?beds_min=2&beds_max=2&price_max=850000' },
  { area: 'Islington', url: 'https://www.zoopla.co.uk/for-sale/property/islington/?beds_min=2&beds_max=2&price_max=850000' },
];
var allIds = {};
var searchIdx = 0;

function nextSearch() {
  if (searchIdx >= searches.length) {
    for (var area in allIds) {
      console.log('\n[' + area + '] unique IDs (' + allIds[area].length + '): ' + allIds[area].join(', '));
    }
    // Proceed to scrape phase
    scrapePhase();
    return;
  }
  var s = searches[searchIdx++];
  process.stderr.write('Searching ' + s.area + '... ');
  fsGet(s.url, function(html) {
    if (!html) { process.stderr.write('FAIL\n'); nextSearch(); return; }
    var cleaned = html.replace(/\\\\\"/g, '\"');
    var ids = cleaned.match(/\"listingId\":\"(\d+)\"/g) || [];
    var uniq = [...new Set(ids.map(function(x){ return x.match(/\"listingId\":\"(\d+)\"/)[1]; }))];
    allIds[s.area] = uniq;
    process.stderr.write(uniq.length + ' listings\n');
    setTimeout(nextSearch, 1000);
  });
}

// Phase 2: scrape all IDs in parallel batches
var results = {};
var pending = [];

function scrapePhase() {
  var areaOrder = ['NW3', 'Angel', 'Islington'];
  areaOrder.forEach(function(area) {
    if (!allIds[area]) return;
    // Take first 15 IDs per area
    allIds[area].slice(0, 15).forEach(function(id) {
      pending.push({area: area, id: id});
    });
  });
  console.log('\nTotal to scrape: ' + pending.length);
  scrapeNext(0);
}

function scrapeNext(idx) {
  if (idx >= pending.length) {
    printResults();
    return;
  }
  var item = pending[idx];
  process.stderr.write(item.area + ' ' + item.id + '... ');
  fsGet('https://www.zoopla.co.uk/for-sale/details/' + item.id + '/', function(html) {
    if (!html) { process.stderr.write('FAIL\n'); scrapeNext(idx+1); return; }
    var r = extractBrief(html, item.id);
    r.area_label = item.area;
    results[item.area + '-' + item.id] = r;
    var ppsf = r.price && r.sqft ? Math.round(r.price / r.sqft) : null;
    process.stderr.write((r.price ? '£'+r.price.toLocaleString() : '?') + ' | ' + (r.address||'?').substring(0,40) + ' | ' + (r.sqft||'?') + 'sqft | ' + (r.tenure||'?') + '\n');
    setTimeout(function() { scrapeNext(idx+1); }, 800);
  });
}

function distM(lat1, lng1, lat2, lng2) {
  var R = 6371000;
  var dLat = (lat2-lat1)*Math.PI/180;
  var dLng = (lng2-lng1)*Math.PI/180;
  var a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function printResults() {
  console.log('\n\n=== RESULTS BY AREA ===');
  var TUBE_STATIONS = {
    'NW3': [
      {name:'Belsize Park', line:'Northern', lat:51.5440, lng:-0.1537},
      {name:'Hampstead', line:'Northern', lat:51.5577, lng:-0.1785},
      {name:'Swiss Cottage', line:'Jubilee', lat:51.5432, lng:-0.1760},
      {name:'Finchley Road', line:'Metropolitan/Jubilee', lat:51.5470, lng:-0.1800},
    ],
    'Angel': [
      {name:'Angel', line:'Northern', lat:51.5326, lng:-0.1058},
      {name:'King\'s Cross St. Pancras', line:'Northern/Piccadilly/H&CR/Circle', lat:51.5308, lng:-0.1238},
      {name:'Old Street', line:'Northern', lat:51.5293, lng:-0.0869},
      {name:'Essex Road', line:'Great Northern', lat:51.5384, lng:-0.0957},
    ],
    'Islington': [
      {name:'Angel', line:'Northern', lat:51.5326, lng:-0.1058},
      {name:'Highbury & Islington', line:'Victoria/Northern', lat:51.5295, lng:-0.1057},
      {name:'Canonbury', line:'London Overground', lat:51.5473, lng:-0.0871},
      {name:'Dalston Junction', line:'London Overground', lat:51.5483, lng:-0.0758},
    ]
  };
  var HYDE_PARK = {lat:51.5073, lng:-0.1657};
  var VICTORIA_PARK = {lat:51.5266, lng:-0.0393};

  ['NW3', 'Angel', 'Islington'].forEach(function(area) {
    var areaResults = [];
    for (var k in results) {
      if (k.startsWith(area + '-')) areaResults.push(results[k]);
    }
    // Sort by price
    areaResults.sort(function(a,b){ return (a.price||9999999) - (b.price||9999999); });
    
    console.log('\n--- ' + area + ' (' + areaResults.length + ' listings) ---');
    areaResults.forEach(function(r) {
      var ppsf = r.price && r.sqft ? Math.round(r.price / r.sqft) : null;
      var tube = null, tubeDist = Infinity;
      if (r.lat && TUBE_STATIONS[area]) {
        TUBE_STATIONS[area].forEach(function(s) {
          var d = distM(r.lat, r.lng, s.lat, s.lng);
          if (d < tubeDist) { tubeDist = d; tube = s; }
        });
      }
      var parkDist = r.lat ? distM(r.lat, r.lng, HYDE_PARK.lat, HYDE_PARK.lng) : null;
      var isGood = (r.price && r.price <= 850000 && r.sqft && r.sqft >= 600 && (r.tenure === 'share_of_freehold' || r.tenure === 'leasehold'));
      console.log(
        (isGood ? '[*] ' : '    ') +
        (r.price ? '£'+r.price.toLocaleString().padStart(7) : '    ?   ') + ' | ' +
        (r.address||'?').substring(0,45).padEnd(46) + ' | ' +
        (r.beds||'?')+'bd/'+(r.baths||'?')+'ba | ' +
        (r.sqft||'?')+'sqft | ' +
        (ppsf ? '£'+ppsf+'/ft2' : '?/ft2') + ' | ' +
        (r.tenure||'?') + ' | ' +
        (r.floor||'?') + ' | ' +
        (tube ? tube.name+' '+tubeDist+'m' : '?') + ' | ' +
        (parkDist ? 'HydePark '+parkDist+'m' : '') + ' | zoopla/' + r.id
      );
    });
  });
}

nextSearch();
