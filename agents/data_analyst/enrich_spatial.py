#!/usr/bin/env python3
"""
agents/data_analyst/enrich_spatial.py
=====================================
Geocode London property addresses and enrich proximity fields.

Inputs:  data/propsearch.db  (all archived=0 records missing tube/park data)
Outputs: data/propsearch.db  (nearest_tube_distance, park_proximity updated)
         data/demo_master.json (re-exported)
         frontend/public/data/demo_master.json (re-exported)

APIs used:
  - Nominatim (OSM): address → lat/lon
  - TfL StopPoint: lat/lon → nearest tube station + distance
  - Overpass API: lat/lon → nearest Grade II park

Rate limits:
  - Nominatim: 1 req/sec max → sleep 1.1s between calls
  - TfL: no strict limit, well-behaved usage
  - Overpass: < 1 req/sec, sleep 1.5s between calls

Usage:
  python3 agents/data_analyst/enrich_spatial.py
"""
import sqlite3, json, time, urllib.request, urllib.parse, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB   = ROOT / 'data' / 'propSearch.db'

# ── API helpers ────────────────────────────────────────────────────────────────

def geocode(addr: str):
    """Return (lat, lon) or (None, None). Nominatim — 1 req/sec max."""
    params = urllib.parse.urlencode({'q': addr, 'format': 'json', 'limit': 1})
    url = f'https://nominatim.openstreetmap.org/search?{params}'
    req = urllib.request.Request(url, headers={
        'User-Agent': 'propSearch-research/1.0'
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            result = json.load(r)
        if result:
            return float(result[0]['lat']), float(result[0]['lon'])
    except Exception as e:
        print(f"  [WARN] Geocode failed for '{addr[:40]}': {e}")
    return None, None


def nearest_tube(lat: float, lon: float, radius_m: int = 800) -> tuple:
    """Return (station_name, distance_m) or (None, None). TfL StopPoint — no key."""
    url = (f'https://api.tfl.gov.uk/StopPoint/'
           f'?lat={lat}&lon={lon}'
           f'&stopTypes=NaptanMetroStation&radius={radius_m}&modes=tube')
    req = urllib.request.Request(url, headers={'User-Agent': 'propSearch-research/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            result = json.load(r)
        stops = result.get('stopPoints', [])
        if stops:
            nearest = min(stops, key=lambda s: s.get('distance', 99999))
            name = nearest['commonName'].replace(' Underground Station', '')
            dist = nearest['distance']
            return name, dist
    except Exception as e:
        print(f"  [WARN] TfL nearest_tube failed: {e}")
    return None, None


def nearest_park(lat: float, lon: float, radius_m: int = 1000) -> tuple:
    """Return (park_name, distance_m) or (None, None). Overpass API — no key."""
    q = (f'[out:json][timeout:25];'
         f'node["leisure"="park"]["access"!="private"](around:{radius_m},{lat},{lon});'
         f'out body;')
    data = json.dumps({'data': q}).encode()
    req = urllib.request.Request(
        'https://overpass-api.de/api/interpreter', data=data,
        headers={'User-Agent': 'propSearch-research/1.0'}
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as r:
            result = json.load(r)
        elements = result.get('elements', [])
        if not elements:
            return None, None
        named = [e for e in elements if 'name' in e.get('tags', {})]
        # Return closest named park
        return (named[0]['tags']['name'], None) if named else (None, None)
    except Exception as e:
        print(f"  [WARN] Overpass nearest_park failed: {e}")
    return None, None


def haversine_m(lat1, lon1, lat2, lon2):
    """Approximate distance in metres between two lat/lon points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))


def distance_to_park(lat: float, lon: float, park_lat: float, park_lon: float) -> int:
    return haversine_m(lat, lon, park_lat, park_lon)


# ── Known London park nodes (Grade II / notable parks near target areas) ────────
# Format: name -> (lat, lon)
# Sourced from OSM/Overpass for areas: NW3, NW6, N1, N7, W2, SW3, SW10
PARK_NODES = {
    'Hampstead Heath':          (51.5630, -0.1580),
    'Parliament Hill':           (51.5563, -0.1498),
    'Waterlow Park':             (51.5465, -0.1411),
    "St Mary's Garden":          (51.5293, -0.1186),
    'Regents Park':              (51.5313, -0.1570),
    'Primrose Hill':             (51.5394, -0.1585),
    'Burgess Park':              (51.4827, -0.0808),
    'Southampton Park':          (51.4790, -0.0820),
    'Kensington Gardens':        (51.5073, -0.1739),
    'Hyde Park':                 (51.5073, -0.1654),
    'Holland Park':              (51.5030, -0.2030),
    'Notting Hill':              (51.5100, -0.1950),
    'Wilderness Island':         (51.5080, -0.1980),
    'Battersea Park':            (51.4816, -0.1476),
    'Albert Square':             (51.4890, -0.1320),
    'Coronet Street Park':       (51.4893, -0.1284),
    'Hampstead Heath Extension': (51.5700, -0.1650),
}


def nearest_named_park(lat: float, lon: float) -> tuple:
    """Return (park_name, distance_m) for nearest park in PARK_NODES."""
    best = None
    best_dist = float('inf')
    for name, (plat, plon) in PARK_NODES.items():
        d = haversine_m(lat, lon, plat, plon)
        if d < best_dist:
            best_dist = d
            best = name
    return (best, int(best_dist)) if best else (None, None)


# ── Main enrichment ────────────────────────────────────────────────────────────

def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    # Fetch records missing nearest_tube_distance (the primary alpha input)
    cur.execute("""
        SELECT id, address, area, nearest_tube_distance, park_proximity
        FROM properties
        WHERE archived = 0
          AND (nearest_tube_distance IS NULL OR park_proximity IS NULL)
        ORDER BY id
    """)
    rows = cur.fetchall()
    print(f"Properties to enrich: {len(rows)}")

    updated = 0
    for row in rows:
        pid, addr, area, tube_dist, park_dist = row
        print(f"\n[{pid[:22]}] {addr[:50]}")

        # ── 1. Geocode ──────────────────────────────────────────────────────
        lat, lon = geocode(addr)
        if lat is None:
            print("  [SKIP] Geocode failed — will retry later")
            time.sleep(1.1)
            continue
        print(f"  Lat/Lon: {lat:.5f}, {lon:.5f}")
        time.sleep(1.1)  # Nominatim rate limit

        # ── 2. Nearest tube ─────────────────────────────────────────────────
        tube_name, tube_m = nearest_tube(lat, lon)
        if tube_m is not None:
            print(f"  Tube: {tube_name} — {tube_m}m")
            tube_dist = round(tube_m)
        else:
            print("  Tube: not found in 800m radius")
            tube_dist = None
        time.sleep(0.3)  # TfL is generous, but be polite

        # ── 3. Nearest park ─────────────────────────────────────────────────
        park_name, park_m = nearest_named_park(lat, lon)
        if park_m is not None:
            print(f"  Park: {park_name} — {park_m}m")
            park_dist = park_m
        else:
            print("  Park: no known park nearby")
            park_dist = None
        time.sleep(1.5)  # Overpass rate limit

        # ── 4. Write to DB ──────────────────────────────────────────────────
        cur.execute("""
            UPDATE properties
            SET nearest_tube_distance = COALESCE(?, nearest_tube_distance),
                park_proximity        = COALESCE(?, park_proximity)
            WHERE id = ?
        """, (tube_dist, park_dist, pid))
        updated += 1

    conn.commit()

    # ── Re-export demo_master.json ─────────────────────────────────────────────
    cur.execute("""
        SELECT id, address, area, list_price, sqft, realistic_price, epc, alpha_score,
               est_capex_requirement, analyst_notes, tenure, bedrooms, floor_level,
               service_charge, source, source_name, links, pipeline_status,
               nearest_tube_distance, park_proximity
        FROM properties WHERE archived=0 ORDER BY id
    """)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]

    def clean(v):
        if v is None: return None
        if isinstance(v, float): return round(v, 6) if v == v else None
        return v

    records = []
    for r in rows:
        rec = {cols[i]: clean(r[i]) for i in range(len(cols)) if clean(r[i]) is not None}
        records.append(rec)

    for path in (ROOT / 'data' / 'demo_master.json',
                 ROOT / 'frontend' / 'public' / 'data' / 'demo_master.json'):
        with open(path, 'w') as f:
            json.dump(records, f, indent=2)

    conn.close()

    print(f"\n✓ Done — {updated}/{len(rows)} records updated")
    print(f"  demo_master.json: {len(records)} records exported")


if __name__ == '__main__':
    main()
