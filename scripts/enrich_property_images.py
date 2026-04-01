#!/usr/bin/env python3
"""
Enrich properties with missing/placeholder images
Scrapes Rightmove/Zoopla for high-res images
"""

import sqlite3
import json
import re
import subprocess
import sys
import time
from urllib.parse import urlparse

DB_PATH = 'data/propSearch.db'

def find_portal_url(links_json):
    """Extract Rightmove/Zoopla URL from links array"""
    try:
        links = json.loads(links_json) if links_json else []
        for link in links:
            if 'rightmove.co.uk' in link or 'zoopla.co.uk' in link:
                return link
    except:
        pass
    return None

def scrape_visuals(url):
    """Call Node.js scraper for a single URL"""
    try:
        result = subprocess.run(
            ['node', 'scripts/scrape_visuals.js', url],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        output = result.stdout + result.stderr
        
        # Find JSON in output after "--- Extraction Complete ---"
        if '--- Extraction Complete ---' in output:
            json_start = output.find('--- Extraction Complete ---') + len('--- Extraction Complete ---')
            json_str = output[json_start:].strip()
            
            # Find start of JSON (may have leading whitespace/newlines)
            for i, c in enumerate(json_str):
                if c == '{':
                    json_str = json_str[i:]
                    break
            
            data = json.loads(json_str)
            return {
                'image_url': data.get('image_url'),
                'gallery': data.get('gallery', []),
                'floorplan_url': data.get('floorplan_url')
            }
    except subprocess.TimeoutExpired:
        print(f"  Timeout scraping {url}")
    except json.JSONDecodeError as e:
        print(f"  JSON parse error: {e}")
    except Exception as e:
        print(f"  Error: {e}")
    
    return {'image_url': None, 'gallery': [], 'floorplan_url': None}

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    db = conn.cursor()
    
    # Find properties that need image enrichment
    query = """
        SELECT id, address, image_url, gallery, links 
        FROM properties 
        WHERE image_url IS NULL 
           OR image_url = '' 
           OR image_url LIKE '%kfh.co.uk%' 
           OR image_url LIKE '%primelocation%'
           OR image_url LIKE '%unsplash%'
           OR image_url LIKE '%test%'
    """
    
    db.execute(query)
    properties = db.fetchall()
    
    print(f"\nFound {len(properties)} properties needing image enrichment\n")
    
    updated = 0
    
    for prop in properties:
        prop_id = prop['id']
        address = prop['address']
        current_url = prop['image_url']
        
        print(f"Processing: {address}")
        
        # Find portal URL
        portal_url = find_portal_url(prop['links'])
        
        if portal_url:
            print(f"  Found portal: {portal_url}")
            result = scrape_visuals(portal_url)
            
            if result['image_url']:
                gallery_json = json.dumps(result['gallery'])
                floorplan = result['floorplan_url']
                
                db.execute(
                    "UPDATE properties SET image_url = ?, gallery = ?, floorplan_url = COALESCE(?, floorplan_url) WHERE id = ?",
                    (result['image_url'], gallery_json, floorplan, prop_id)
                )
                conn.commit()
                print(f"  ✓ Updated: {result['image_url'][:60]}...")
                updated += 1
            else:
                print(f"  ✗ No image found")
        else:
            print(f"  No portal URL found in links")
        
        # Rate limit
        time.sleep(2)
    
    print(f"\n✓ Enrichment complete. Updated {updated} properties.")
    conn.close()

if __name__ == '__main__':
    main()
