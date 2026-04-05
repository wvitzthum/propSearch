# Spatial Enrichment Protocol
*Reference from: agents/data_analyst/README.md — section "Spatial Enrichment"*

Updated: 2026-04-04

## Why it matters
`nearest_tube_distance` and `park_proximity` are direct inputs to the Alpha Score spatial component (30% of total score). Currently 69% of records are missing these fields — every missing property is scored with the worst-case spatial assumption (1,000m).

## Field Definitions

| Field | Unit | Alpha Role | Data Source |
|-------|------|-----------|-------------|
| `nearest_tube_distance` | meters | Alpha input (+7/+5/+3) | TfL StopPoint API (lat/lon radius query, free, no key) |
| `park_proximity` | meters | Alpha input (+3/+1) | Overpass API (OSM Grade II parks, free, no key) |
| `commute_paternoster` | minutes | display only | Estimated: walk-to-tube + tube time to City |
| `commute_canada_square` | minutes | display only | Estimated: walk-to-tube + Jubilee line |
| `waitrose_distance` | meters | display only | Postcode-based lookup |
| `whole_foods_distance` | meters | display only | Postcode-based lookup |
| `wellness_hub_distance` | meters | display only | Overpass API (gyms/leisure centres) |

## Step 1 — Geocode address (Nominatim, ~1 req/sec rate limit)

```python
import urllib.request, urllib.parse, json, time

def geocode(addr):
    params = urllib.parse.urlencode({'q': addr, 'format': 'json', 'limit': 1})
    url = f'https://nominatim.openstreetmap.org/search?{params}'
    req = urllib.request.Request(url, headers={'User-Agent': 'propSearch-research/1.0'})
    with urllib.request.urlopen(req, timeout=15) as r:
        result = json.load(r)
    if result:
        return float(result[0]['lat']), float(result[0]['lon'])
    return None, None
```
⚠️ Nominatim: 1 request/second max. Always `time.sleep(1.1)` between calls.

## Step 2 — Nearest tube station (TfL StopPoint API, no key required)

```python
def nearest_tube(lat, lon, radius_m=800):
    url = (f'https://api.tfl.gov.uk/StopPoint/?lat={lat}&lon={lon}'
           f'&stopTypes=NaptanMetroStation&radius={radius_m}&modes=tube')
    req = urllib.request.Request(url, headers={'User-Agent': 'propSearch-research/1.0'})
    with urllib.request.urlopen(req, timeout=15) as r:
        result = json.load(r)
    stops = result.get('stopPoints', [])
    if stops:
        nearest = min(stops, key=lambda s: s.get('distance', 99999))
        return nearest['commonName'].replace(' Underground Station',''), nearest['distance']
    return None, None
```

## Step 3 — Nearest park (Overpass API, OSM Grade II parks)

```python
def nearest_park(lat, lon, radius_m=1000):
    q = (f'[out:json][timeout:25];'
         f'node["leisure"="park"]["access"!="private"](around:{radius_m},{lat},{lon});'
         f'out body;')
    data = json.dumps({'data': q}).encode()
    req = urllib.request.Request('https://overpass-api.de/api/interpreter', data=data)
    with urllib.request.urlopen(req, timeout=30) as r:
        result = json.load(r)
    elements = result.get('elements', [])
    if not elements:
        return None
    # Pick largest-named park as proxy for Grade II parks
    named = [e for e in elements if 'name' in e.get('tags', {})]
    return named[0]['tags']['name'] if named else None
```

## Run Spatial Enrichment

```bash
python3 agents/data_analyst/enrich_spatial.py   # geocode + nearest tube + nearest park
```
⚠️ Process all 29 properties in a single session. Nominatim rate limit = ~30 properties/minute. Total runtime: ~2 minutes for 29 properties.

After running, re-export to demo_master.json:
```bash
python3 - << 'EOF'
import sqlite3, json
def clean(v):
    if v is None: return None
    if isinstance(v, float): return round(v, 6) if v == v else None
    return v
conn = sqlite3.connect('data/propsearch.db')
cur = conn.cursor()
cur.execute("SELECT ... FROM properties WHERE archived=0")
rows = cur.fetchall()
cols = [d[0] for d in cur.description]
records = [{cols[i]: clean(v) for i, v in enumerate(r) if clean(v) is not None} for r in rows]
for path in ('data/demo_master.json', 'frontend/public/data/demo_master.json'):
    with open(path, 'w') as f: json.dump(records, f, indent=2)
print(f'Exported {len(records)} records')
EOF
```

## Commute Time Estimation (display only — low priority)

After getting nearest tube name, estimate tube journey time:
- Walk to tube: `nearest_tube_distance / 80` minutes (80m/min walking pace)
- Known tube times: Belsize Park → St Pauls ~12 min (Northern → Central), Belsize Park → Canary Wharf ~28 min (Northern → Jubilee at Baker Street)
- If unverifiable: leave as `null` — commute time is not used in alpha score
