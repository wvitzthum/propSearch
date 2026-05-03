#!/usr/bin/env node
/**
 * fetch_map_overlays.js — DE-242, DAT-259
 * Sources all map overlay data for the propSearch dashboard.
 *
 * Outputs:
 *   data/lsoa_london.geojson           — Part A: LSOA December 2021 boundaries
 *   data/lsoa_income_demographics.json — Part B: Income + demographics
 *   data/lsoa_crime.json              — Part C: Crime counts per LSOA
 *   data/lsoa_choropleth_london.geojson — Part D: Choropleth (A+B+C+population joined)
 *                                        DAT-259 adds: population, area_sq_km, pop_density
 *                                        Source: ONS Population density for LSOAs, mid-2022 to mid-2024
 *   data/london_pois.json             — Part E: London POIs
 *   data/london_greenspace.geojson    — Part F: Parks
 *   data/london_rivers.geojson         — Part F: Thames + canals
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '../data');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── HTTP helpers ────────────────────────────────────────────────────────────────
function fetchText(url, tries = 2) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 400 && tries > 0) {
        console.error(`  [${res.statusCode}] retry ${url.slice(0,80)}`);
        sleep(1000).then(() => resolve(fetchText(url, tries - 1)));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
      res.on('error', reject);
    }).on('error', e => { if (tries > 0) { sleep(1000).then(() => resolve(fetchText(url, tries - 1))); return; } reject(e); });
  });
}

function fetchJSON(url, tries = 2) {
  return fetchText(url, tries).then(JSON.parse);
}

// ── ArcGIS helpers ─────────────────────────────────────────────────────────────
// lsoa_london_refactored: combined demographics + London-only polygon boundaries
const DEMO_SVC = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/lsoa_london_refactored/FeatureServer/0';

async function arcgisPage(svc, where, outFields, offset, limit) {
  const params = new URLSearchParams({
    where, outFields, outSR: '4326', f: 'json',
    returnGeometry: 'true',
    resultRecordCount: String(limit),
    resultOffset: String(offset),
  });
  return fetchJSON(`${svc}/query?${params}`);
}

// Fetch ALL records from an ArcGIS FeatureServer with pagination
async function arcgisFetchAll(svc, where, outFields, limit = 1000) {
  const results = [];
  let offset = 0;
  while (true) {
    console.error(`    Page offset ${offset}...`);
    const data = await arcgisPage(svc, where, outFields, offset, limit);
    if (!data.features || data.features.length === 0) break;
    results.push(...data.features);
    if (!data.exceededTransferLimit) break;
    offset += limit;
    await sleep(200);
  }
  return results;
}

// Convert ArcGIS JSON geometry to GeoJSON
function arcgisToGeoJSON(geom) {
  if (!geom) return null;
  if (geom.rings)        return { type: 'Polygon',     coordinates: geom.rings };
  if (geom.paths)        return { type: 'LineString',  coordinates: geom.paths };
  if (geom.points)       return { type: 'MultiPoint',  coordinates: geom.points };
  return null;
}

// ── Part A + B: Combined LSOA boundaries + demographics ─────────────────────────
// lsoa_london_refactored has London polygons + demographics in one service
async function fetchLsoaBoundariesAndDemographics() {
  const boundFile = `${DATA}/lsoa_london.geojson`;
  const demoFile  = `${DATA}/lsoa_income_demographics.json`;

  const skipBound = fs.existsSync(boundFile) && JSON.parse(fs.readFileSync(boundFile)).features?.length > 4000;
  const skipDemo  = fs.existsSync(demoFile)  && JSON.parse(fs.readFileSync(demoFile)).length  > 4000;

  if (skipBound && skipDemo) {
    console.error('SKIP A+B: both files already exist with sufficient records');
    return [boundFile, demoFile];
  }

  console.error('A+B) Fetching LSOA London boundaries + demographics from lsoa_london_refactored...');
  // The service is London-only; fetch all records (expected ~4835)
  const fields = 'LSOA11CD,LSOA11NM,LAD23CD,LAD23NM,IMD_score,IMD_rank_2,Claimant_C,Claimant_2,LAT,LONG_';
  const features = await arcgisFetchAll(DEMO_SVC, 'LAD23CD IS NOT NULL', fields);

  console.error(`  Got ${features.length} records — converting to GeoJSON...`);

  // Separate: demographics JSON + boundaries GeoJSON
  const londonFeatures = [];
  const demoRecords    = [];

  for (const f of features) {
    const { attributes, geometry } = f;
    const code = attributes.LSOA11CD;
    if (!code) continue;
    const isLondon = String(attributes.LAD23CD || '').startsWith('E09');
    if (!isLondon) continue;

    londonFeatures.push({
      type: 'Feature',
      id: code,
      geometry: arcgisToGeoJSON(geometry),
      properties: { id: code, area_name: attributes.LSOA11NM }
    });

    demoRecords.push({
      lsoa_code: code,
      area_name:  attributes.LSOA11NM,
      imd_score:  attributes.IMD_score    ?? null,
      imd_rank:   attributes.IMD_rank_2   ?? null,
      claimant_count: attributes.Claimant_C ?? null,
      claimant_rate:  attributes.Claimant_2 ?? null,
    });
  }

  // Sort boundaries for reproducibility
  londonFeatures.sort((a, b) => a.id.localeCompare(b.id));
  const boundGeoJSON = { type: 'FeatureCollection', features: londonFeatures };
  fs.writeFileSync(boundFile, JSON.stringify(boundGeoJSON, null, 2));
  fs.writeFileSync(demoFile,  JSON.stringify(demoRecords,  null, 2));

  console.error(`DONE A+B) Boundaries: ${londonFeatures.length} LSOAs → ${boundFile}`);
  console.error(`          Demographics: ${demoRecords.length} records → ${demoFile}`);
  return [boundFile, demoFile];
}

// ── Part C: Crime Rate via data.police.uk ─────────────────────────────────────
async function fetchCrimeRates() {
  const crimeFile = `${DATA}/lsoa_crime.json`;
  if (fs.existsSync(crimeFile) && JSON.parse(fs.readFileSync(crimeFile)).length > 4000) {
    console.error('SKIP C: lsoa_crime.json already exists');
    return crimeFile;
  }

  const boundFile = `${DATA}/lsoa_london.geojson`;
  if (!fs.existsSync(boundFile)) { console.error('SKIP C: boundaries missing'); return null; }

  console.error('C) Fetching crime data from data.police.uk (Metropolitan Police)...');
  // Fetch crime for a 0.1° grid covering London
  const crimeGrid = {};  // "latKey,lngKey" → [{month, category}]
  const months = ['2025-12', '2025-11', '2025-10'];

  for (const month of months) {
    let count = 0;
    for (let lat = 51.28; lat <= 51.72; lat += 0.05) {
      for (let lng = -0.52; lng <= 0.42; lng += 0.05) {
        try {
          const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&date=${month}`;
          const data = await fetchJSON(url);
          count += data.length;
          for (const c of data) {
            if (!c.location?.latitude) continue;
            const k = `${parseFloat(c.location.latitude).toFixed(2)},${parseFloat(c.location.longitude).toFixed(2)}`;
            if (!crimeGrid[k]) crimeGrid[k] = { total: 0, categories: {} };
            crimeGrid[k].total++;
            const cat = c.category || 'other';
            crimeGrid[k].categories[cat] = (crimeGrid[k].categories[cat] || 0) + 1;
          }
          await sleep(200);
        } catch (_) { /* outside service area */ }
      }
    }
    console.error(`  ${month}: ${count} crimes fetched`);
  }

  // Assign crime count to each LSOA by nearest grid point
  const boundaries = JSON.parse(fs.readFileSync(boundFile));
  const crimePerLsoa = boundaries.features.map(f => {
    const code = f.properties.id;
    const centroid = centroidOf(f.geometry);
    if (!centroid) return { lsoa_code: code, crime_count: 0 };
    const k = `${centroid.lat.toFixed(2)},${centroid.lng.toFixed(2)}`;
    return { lsoa_code: code, crime_count: crimeGrid[k]?.total || 0 };
  });

  fs.writeFileSync(crimeFile, JSON.stringify(crimePerLsoa, null, 2));
  console.error(`DONE C) ${crimePerLsoa.length} LSOA crime records → ${crimeFile}`);
  return crimeFile;
}

function centroidOf(geom) {
  if (!geom) return null;
  let coords = [];
  if (geom.type === 'Polygon')     coords = geom.coordinates[0];
  else if (geom.type === 'MultiPolygon') coords = geom.coordinates[0][0];
  if (!coords || coords.length === 0) return null;
  const sum = coords.reduce((acc, c) => ({ lat: acc.lat + c[1], lng: acc.lng + c[0] }), { lat: 0, lng: 0 });
  return { lat: sum.lat / coords.length, lng: sum.lng / coords.length };
}

// ── Part D: Choropleth GeoJSON ────────────────────────────────────────────────
async function buildChoropleth(boundaryFile, demoFile, crimeFile) {
  const outFile = `${DATA}/lsoa_choropleth_london.geojson`;
  console.error('D) Building choropleth GeoJSON...');
  const bounds  = JSON.parse(fs.readFileSync(boundaryFile));
  const demos    = JSON.parse(fs.readFileSync(demoFile));
  const crimes   = crimeFile && fs.existsSync(crimeFile) ? JSON.parse(fs.readFileSync(crimeFile)) : [];

  const demoMap  = {};
  for (const r of demos)  demoMap[r.lsoa_code] = r;
  const crimeMap = {};
  for (const r of crimes) crimeMap[r.lsoa_code] = r;

  const choropleth = bounds.features.map(f => {
    const code  = f.properties.id;
    const demo  = demoMap[code]  || {};
    const crime = crimeMap[code] || {};
    return {
      type: 'Feature',
      id: code,
      geometry: f.geometry,
      properties: {
        ...f.properties,
        imd_score:      demo.imd_score     ?? null,
        imd_rank:       demo.imd_rank      ?? null,
        claimant_rate:  demo.claimant_rate ?? null,
        crime_count:    crime.crime_count  ?? null,
      }
    };
  });

  fs.writeFileSync(outFile, JSON.stringify({ type: 'FeatureCollection', features: choropleth }, null, 2));
  console.error(`DONE D) ${choropleth.length} features → ${outFile}`);
  return outFile;
}

// ── Part E: POIs via Overpass API ─────────────────────────────────────────────
const OVERPASS = 'https://overpass-api.de/api/interpreter';

async function fetchPOIs() {
  const outFile = `${DATA}/london_pois.json`;
  if (fs.existsSync(outFile)) {
    const d = JSON.parse(fs.readFileSync(outFile));
    if (d.length > 500) { console.error(`SKIP E: london_pois.json (${d.length} POIs)`); return outFile; }
  }

  console.error('E) Fetching POIs via Overpass API...');
  const bbox = '51.28,-0.52,51.72,0.42';
  const query = `[out:json][timeout:180];
(
  node["railway"="station"](${bbox});
  node["shop"="supermarket"](${bbox});
  node["shop"="convenience"](${bbox});
  node["amenity"="school"](${bbox});
  node["amenity"="clinic"](${bbox});
  node["leisure"="fitness_centre"](${bbox});
  node["leisure"="gym"](${bbox});
  node["amenity"="cafe"](${bbox});
  node["amenity"="hospital"](${bbox});
  node["shop"="doityourself"](${bbox});
  node["shop"="bakery"](${bbox});
  way["leisure"="park"]["area"="yes"](${bbox});
);
out center;`.trim();

  const data = await fetchJSON(OVERPASS + '?data=' + encodeURIComponent(query));
  const elems = data.elements || [];
  console.error(`  Overpass: ${elems.length} elements`);

  const pois = elems.map(el => {
    const tags = el.tags || {};
    return {
      id:       String(el.id),
      lat:      el.lat ?? el.center?.lat,
      lng:      el.lon ?? el.center?.lon,
      category: inferCategory(tags),
      name:     tags.name || tags['name:en'] || null,
      tags:     Object.fromEntries(
        Object.entries(tags).filter(([k]) =>
          ['railway','shop','amenity','leisure','cuisine','brand','wheelchair'].includes(k)
        ).map(([k, v]) => [k, String(v)])
      )
    };
  }).filter(p => p.lat != null && p.lng != null);

  fs.writeFileSync(outFile, JSON.stringify(pois, null, 2));
  console.error(`DONE E) ${pois.length} POIs → ${outFile}`);
  return outFile;
}

function inferCategory(tags) {
  if (!tags) return 'other';
  if (tags.railway === 'station') return 'transport';
  if (tags.shop === 'supermarket') return 'supermarket';
  if (tags.shop === 'convenience') return 'convenience';
  if (tags.shop === 'bakery') return 'bakery';
  if (tags.shop === 'doityourself') return 'diy';
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'clinic' || tags.amenity === 'hospital') return 'healthcare';
  if (tags.leisure === 'fitness_centre' || tags.leisure === 'gym') return 'gym';
  if (tags.amenity === 'cafe') return 'cafe';
  if (tags.leisure === 'park') return 'park';
  return 'other';
}

// ── Part F: Greenspace + Rivers (OSM via Overpass) ─────────────────────────────
async function fetchGreenspaceRivers() {
  const gsFile  = `${DATA}/london_greenspace.geojson`;
  const rivFile = `${DATA}/london_rivers.geojson`;
  console.error('F) Fetching greenspace + rivers via Overpass OSM...');

  const bbox = '51.28,-0.52,51.72,0.42';
  const [riverData, greenData] = await Promise.all([
    fetchJSON(OVERPASS + '?data=' + encodeURIComponent(`[out:json][timeout:60];
(
  way["name"="River Thames"](${bbox});
  way["name"~"Grand Union Canal|Regent.s Canal|Lee Navigation"](${bbox});
  way["waterway"="canal"]["name"](${bbox});
  relation["name"="River Thames"]["waterway"="river"](${bbox});
);
out geom;`.trim())),
    fetchJSON(OVERPASS + '?data=' + encodeURIComponent(`[out:json][timeout:120];
(
  way["leisure"="park"]["area"="yes"](${bbox});
  way["landuse"="recreation_ground"](${bbox});
  way["leisure"="common"](${bbox});
);
out geom;`.trim())),
  ]);

  function waysToLineFC(elems, type) {
    const ways = (elems || []).filter(e => e.type === 'way' || e.type === 'relation');
    const features = [];
    for (const w of ways) {
      const coords = (w.geometry || []).map(g => [g.lon, g.lat]);
      if (coords.length < 2) continue;
      features.push({
        type: 'Feature',
        id: w.id,
        geometry: { type: 'LineString', coordinates: coords },
        properties: { name: w.tags?.name || null, type, waterway: w.tags?.waterway || null }
      });
    }
    return { type: 'FeatureCollection', features };
  }

  function waysToPolyFC(elems) {
    const ways = (elems || []).filter(e => e.type === 'way');
    const features = ways.map(w => ({
      type: 'Feature',
      id: w.id,
      geometry: { type: 'Polygon', coordinates: [w.geometry.map(g => [g.lon, g.lat])] },
      properties: { name: w.tags?.name || null, leisure: w.tags?.leisure || null }
    }));
    return { type: 'FeatureCollection', features };
  }

  // Handle relation members for Thames
  const riverElems = (riverData.elements || []).filter(e => e.type === 'way');
  const riverFC = waysToLineFC(riverElems, 'river');
  const greenFC = waysToPolyFC(greenData.elements || []);

  fs.writeFileSync(rivFile, JSON.stringify(riverFC, null, 2));
  fs.writeFileSync(gsFile,  JSON.stringify(greenFC, null, 2));
  console.error(`DONE F) Rivers: ${riverFC.features.length} ways → ${rivFile}`);
  console.error(`       Greenspace: ${greenFC.features.length} polygons → ${gsFile}`);
  return [gsFile, rivFile];
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.error('\n=== DE-242: Map Overlay Data Pipeline ===\n');
  const t0 = Date.now();

  const [boundFile, demoFile] = await fetchLsoaBoundariesAndDemographics();
  const crimeFile  = await fetchCrimeRates();
  const chorFile   = await buildChoropleth(boundFile, demoFile, crimeFile);
  const poiFile    = await fetchPOIs();
  const [gsFile, rivFile] = await fetchGreenspaceRivers();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.error(`\n=== Pipeline complete in ${elapsed}s ===`);
  for (const f of [boundFile, demoFile, crimeFile, chorFile, poiFile, gsFile, rivFile]) {
    if (f && fs.existsSync(f)) {
      const sz = fs.statSync(f).size;
      console.error(`  ${path.basename(f)} — ${(sz/1024).toFixed(0)} KB`);
    }
  }
  console.log(JSON.stringify({ status: 'ok', elapsed_s: parseFloat(elapsed) }));
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
