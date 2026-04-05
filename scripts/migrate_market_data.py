#!/usr/bin/env python3
"""
DE-214: Migrate market data JSON files → SQLite
Consolidates: macro_trend.json, appreciation_model.json, financial_context.json, DAT-xxx research files
After migration: JSON files are archived (not deleted), served from SQLite via /api/market-data
Run: python3 scripts/migrate_market_data.py [--dry-run] [--rollback]
"""
import json, sqlite3, os, sys, shutil, tarfile, re
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), '../data')
DB_PATH = os.path.join(DATA_DIR, 'propSearch.db')
ARCHIVE_DIR = os.path.join(DATA_DIR, 'archive/migration_de214')

DRY_RUN = '--dry-run' in sys.argv
ROLLBACK = '--rollback' in sys.argv

def log(msg):
    print(f"[DE-214] {msg}")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute('PRAGMA busy_timeout = 30000')
    conn.row_factory = sqlite3.Row
    return conn

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1: Create new SQLite tables
# ─────────────────────────────────────────────────────────────────────────────
def create_tables(conn):
    log("Creating market data tables...")
    c = conn.cursor()

    # market_indicators: key-value time-series for macro metrics
    c.execute('''
        CREATE TABLE IF NOT EXISTS market_indicators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            indicator_key TEXT NOT NULL,
            sub_key TEXT,
            date TEXT,
            value REAL,
            label TEXT,
            source TEXT,
            source_url TEXT,
            methodology TEXT,
            raw_json TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(indicator_key, sub_key, date)
        )
    ''')
    c.execute('CREATE INDEX IF NOT EXISTS idx_market_indicators_key ON market_indicators(indicator_key)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_market_indicators_date ON market_indicators(date)')

    # appreciation_model: area-level appreciation scenarios
    c.execute('''
        CREATE TABLE IF NOT EXISTS appreciation_model (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            area TEXT,
            metric_key TEXT NOT NULL,
            value REAL,
            label TEXT,
            scenario TEXT,
            probability REAL,
            trigger_condition TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(area, metric_key, scenario)
        )
    ''')
    c.execute('CREATE INDEX IF NOT EXISTS idx_appreciation_model_area ON appreciation_model(area)')

    # financial_context: user financial parameters and benchmarks
    c.execute('''
        CREATE TABLE IF NOT EXISTS financial_context (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_key TEXT NOT NULL UNIQUE,
            value REAL,
            json_value TEXT,
            label TEXT,
            area TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # research_archives: DAT-xxx research output files
    c.execute('''
        CREATE TABLE IF NOT EXISTS research_archives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id TEXT NOT NULL UNIQUE,
            data_json TEXT NOT NULL,
            status TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # market_meta: provenance and metadata for market data
    c.execute('''
        CREATE TABLE IF NOT EXISTS market_meta (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    log("Tables created.")

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2: Migrate macro_trend.json → market_indicators
# ─────────────────────────────────────────────────────────────────────────────
def migrate_macro_trend(conn):
    log("Migrating macro_trend.json...")
    path = os.path.join(DATA_DIR, 'macro_trend.json')
    if not os.path.exists(path):
        log("  SKIP: macro_trend.json not found"); return

    with open(path) as f:
        d = json.load(f)

    c = conn.cursor()

    # Store top-level meta keys
    meta_fields = {
        '_last_full_refresh': d.get('_last_full_refresh'),
        '_provenance_schema_version': d.get('_provenance_schema_version'),
        '_refresh_schedule': json.dumps(d.get('_refresh_schedule')),
        '_meta': json.dumps(d.get('_meta')),
        '_source_citations': json.dumps(d.get('_source_citations')),
        '_tasks_completed': json.dumps(d.get('_tasks_completed', [])),
    }
    for key, val in meta_fields.items():
        if val:
            c.execute('INSERT OR REPLACE INTO market_meta (key, value) VALUES (?, ?)', (key, str(val)))

    # Process each top-level section
    def upsert_indicator(key, sub_key, date, value, label=None, source=None, source_url=None, methodology=None, raw_json=None):
        if date is None and isinstance(value, dict):
            # Store entire dict as raw_json
            raw_json = json.dumps(value)
            value = None
        try:
            c.execute('''
                INSERT OR REPLACE INTO market_indicators
                (indicator_key, sub_key, date, value, label, source, source_url, methodology, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (key, sub_key, date, value, label, source, source_url, methodology, raw_json))
        except Exception as e:
            log(f"  Warning: failed to upsert {key}/{sub_key}/{date}: {e}")

    # --- Simple scalar indicators ---
    scalar_fields = [
        'boe_base_rate', 'boe_rate_consensus', 'ltv_match_score',
        'market_pulse_summary', 'gbp_usd_effective_discount', 'epc_deadline_risk',
    ]
    for key in scalar_fields:
        if key in d:
            v = d[key]
            source = v.get('source') if isinstance(v, dict) else None
            source_url = v.get('source_url') if isinstance(v, dict) else None
            methodology = v.get('methodology') if isinstance(v, dict) else None
            value = v.get('value') if isinstance(v, dict) else v
            label = v.get('label') if isinstance(v, dict) else None
            date = v.get('last_refreshed') if isinstance(v, dict) else None
            raw = json.dumps(v) if isinstance(v, dict) else None
            upsert_indicator(key, None, date, value, label, source, source_url, methodology, raw)

    # --- Time-series data (london_hpi, mortgage_history, area_trends, etc.) ---
    series_keys = [
        'london_hpi', 'boe_base_rate', 'hpi_forecasts', 'mortgage_history',
        'mortgage_rates', 'economic_indicators', 'area_trends', 'area_trends_provenance',
        'hpi_history', 'rental_yields', 'london_premium_index', 'area_prices',
        'transaction_volumes', 'property_type_composition', 'cash_vs_mortgage',
        'epc_distribution', 'international_capital_flows', 'inventory_velocity',
        'timing_signals', 'negotiation_delta', 'purchase_cost_benchmarks',
        'sdlt_countdown', 'sdlt_tiers', 'mpc_next_meeting', 'swap_rates',
        'market_business'
    ]

    for key in series_keys:
        if key not in d: continue
        v = d[key]
        if not isinstance(v, dict): continue

        source = v.get('source') or d.get('_source_citations', {}).get(key)
        source_url = v.get('source_url')
        methodology = v.get('methodology')

        # Handle data array format: { ..., data: [{date, value}, ...] }
        if 'data' in v and isinstance(v['data'], list):
            for entry in v['data']:
                if isinstance(entry, dict):
                    date = entry.get('date') or entry.get('month') or entry.get('quarter')
                    value = entry.get('value') or entry.get('index') or entry.get('hpi')
                    sub_key = entry.get('area') or entry.get('region') or entry.get('postcode')
                    upsert_indicator(key, sub_key, date, value, None, source, source_url, methodology, None)
                else:
                    upsert_indicator(key, None, None, entry, None, source, source_url, methodology, None)

        # Handle simple {date: value} format (skip meta fields)
        elif all(isinstance(vv, (int, float)) for kk, vv in v.items() if kk not in ('source','methodology','source_url','label')):
            for date, val in v.items():
                if date not in ('source','methodology','source_url','label'):
                    upsert_indicator(key, None, date, val, v.get('label'), source, source_url, methodology, None)

        # Handle boe_rate_consensus fan chart: scenarios array
        elif 'scenarios' in v and isinstance(v['scenarios'], list):
            for scenario_entry in v['scenarios']:
                if isinstance(scenario_entry, dict):
                    date = scenario_entry.get('q') or scenario_entry.get('date')
                    for scen_key in ('bear','base','bull'):
                        if scen_key in scenario_entry:
                            upsert_indicator(key, scen_key, date, scenario_entry[scen_key], None, source, source_url, methodology, None)

    conn.commit()
    count = c.execute('SELECT COUNT(*) FROM market_indicators').fetchone()[0]
    log(f"  macro_trend.json migrated: {count} indicator rows")

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3: Migrate appreciation_model.json
# ─────────────────────────────────────────────────────────────────────────────
def migrate_appreciation_model(conn):
    log("Migrating appreciation_model.json...")
    path = os.path.join(DATA_DIR, 'appreciation_model.json')
    if not os.path.exists(path): log("  SKIP: not found"); return

    with open(path) as f:
        d = json.load(f)

    c = conn.cursor()

    # Scenario definitions
    for scenario, data in d.get('scenario_definitions', {}).items():
        if isinstance(data, dict):
            for k, v in data.items():
                c.execute('''
                    INSERT OR REPLACE INTO appreciation_model
                    (area, metric_key, value, label, scenario, probability, trigger_condition)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (None, f'scenario_{k}', v, None, scenario,
                      data.get('probability') if k == 'probability' else None,
                      data.get('trigger') if k == 'trigger' else None))

    # Property adjustments
    for adj_type, data in d.get('property_adjustments', {}).items():
        if isinstance(data, dict) and 'description' not in data:
            for k, v in data.items():
                c.execute('''
                    INSERT OR REPLACE INTO appreciation_model
                    (area, metric_key, value, label, scenario)
                    VALUES (?, ?, ?, ?, ?)
                ''', (None, f'adjustment_{adj_type}_{k}', v, adj_type, None))

    # Postcode volatility
    for area, data in d.get('postcode_volatility', {}).items():
        if isinstance(data, dict):
            for k, v in data.items():
                c.execute('''
                    INSERT OR REPLACE INTO appreciation_model
                    (area, metric_key, value, label)
                    VALUES (?, ?, ?, ?)
                ''', (area, f'volatility_{k}', v, 'postcode_volatility'))

    # Rental yield estimates
    for area, data in d.get('rental_yield_estimates', {}).items():
        if isinstance(data, dict) and '_description' not in data:
            for k, v in data.items():
                c.execute('''
                    INSERT OR REPLACE INTO appreciation_model
                    (area, metric_key, value, label)
                    VALUES (?, ?, ?, ?)
                ''', (area, f'rental_yield_{k}', v, 'rental_yield_estimate'))

    # BOE rate path fan
    for entry in d.get('boe_rate_path_fan', {}).get('scenarios', []):
        if isinstance(entry, dict):
            q = entry.get('q')
            for scen in ('bear','base','bull'):
                if scen in entry:
                    c.execute('''
                        INSERT OR REPLACE INTO appreciation_model
                        (area, metric_key, value, scenario)
                        VALUES (?, ?, ?, ?)
                    ''', (q, f'boe_rate_path_{scen}', entry[scen], scen))

    # Appreciation calculation examples
    for k, v in d.get('appreciation_calculation', {}).items():
        if k == '_description' or k == '_provenance': continue
        c.execute('''
            INSERT OR REPLACE INTO appreciation_model
            (area, metric_key, value, label)
            VALUES (?, ?, ?, ?)
        ''', (None, f'appreciation_{k}', json.dumps(v) if isinstance(v, (dict, list)) else v, 'appreciation_calculation'))

    conn.commit()
    count = c.execute('SELECT COUNT(*) FROM appreciation_model').fetchone()[0]
    log(f"  appreciation_model.json migrated: {count} rows")

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 4: Migrate financial_context.json
# ─────────────────────────────────────────────────────────────────────────────
def migrate_financial_context(conn):
    log("Migrating financial_context.json...")
    path = os.path.join(DATA_DIR, 'financial_context.json')
    if not os.path.exists(path): log("  SKIP: not found"); return

    with open(path) as f:
        d = json.load(f)

    c = conn.cursor()

    if 'monthly_budget' in d:
        c.execute('INSERT OR REPLACE INTO financial_context (metric_key, value) VALUES (?, ?)',
                  ('monthly_budget', d['monthly_budget']))

    if 'council_tax' in d:
        c.execute('INSERT OR REPLACE INTO financial_context (metric_key, json_value, label) VALUES (?, ?, ?)',
                  ('council_tax', json.dumps(d['council_tax']), 'Council Tax bands by area'))

    if 'stamp_duty_thresholds' in d:
        c.execute('INSERT OR REPLACE INTO financial_context (metric_key, json_value, label) VALUES (?, ?, ?)',
                  ('stamp_duty_thresholds', json.dumps(d['stamp_duty_thresholds']), 'SDLT tiers'))

    if 'additional_property_surcharge' in d:
        c.execute('INSERT OR REPLACE INTO financial_context (metric_key, value) VALUES (?, ?)',
                  ('additional_property_surcharge', d['additional_property_surcharge']))

    if 'mortgage_term' in d:
        c.execute('INSERT OR REPLACE INTO financial_context (metric_key, value) VALUES (?, ?)',
                  ('mortgage_term', d['mortgage_term']))

    conn.commit()
    count = c.execute('SELECT COUNT(*) FROM financial_context').fetchone()[0]
    log(f"  financial_context.json migrated: {count} rows")

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 5: Migrate DAT-xxx research files → research_archives
# ─────────────────────────────────────────────────────────────────────────────
def migrate_dat_files(conn):
    log("Migrating DAT-xxx research files...")
    c = conn.cursor()
    dat_files = [f for f in os.listdir(DATA_DIR) if re.match(r'^DAT-\d+_.*\.json$', f)]
    migrated = 0

    for fname in sorted(dat_files):
        task_id = re.match(r'^(DAT-\d+)', fname).group(1)
        path = os.path.join(DATA_DIR, fname)
        try:
            with open(path) as f:
                data = json.load(f)
            c.execute('INSERT OR REPLACE INTO research_archives (task_id, data_json, status) VALUES (?, ?, ?)',
                      (task_id, json.dumps(data), data.get('status', 'unknown')))
            migrated += 1
        except Exception as e:
            log(f"  WARNING: failed to migrate {fname}: {e}")

    conn.commit()
    count = c.execute('SELECT COUNT(*) FROM research_archives').fetchone()[0]
    log(f"  {migrated} DAT files migrated: {count} total rows")

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 6: Migrate enrichment_required + off_market_research_required
# ─────────────────────────────────────────────────────────────────────────────
def migrate_status_files(conn):
    log("Migrating enrichment_required.json and off_market_research_required.json...")
    c = conn.cursor()

    for fname in ('enrichment_required.json', 'off_market_research_required.json'):
        path = os.path.join(DATA_DIR, fname)
        if not os.path.exists(path): continue
        with open(path) as f:
            data = json.load(f)

        task_id = fname.replace('.json', '').upper()
        c.execute('INSERT OR REPLACE INTO research_archives (task_id, data_json, status) VALUES (?, ?, ?)',
                  (task_id, json.dumps(data), data.get('status', 'unknown')))

    conn.commit()
    log("  status files migrated.")

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 7: Archive JSON files (not delete)
# ─────────────────────────────────────────────────────────────────────────────
def archive_json_files():
    log("Archiving JSON source files (not deleting — per user directive)...")
    os.makedirs(ARCHIVE_DIR, exist_ok=True)

    files_to_archive = [
        'macro_trend.json',
        'appreciation_model.json',
        'financial_context.json',
        'off_market_research_required.json',
        'enrichment_required.json',
    ] + [f for f in os.listdir(DATA_DIR) if re.match(r'^DAT-\d+_.*\.json$', f)]

    archived = []
    for fname in files_to_archive:
        src = os.path.join(DATA_DIR, fname)
        if os.path.exists(src):
            dst = os.path.join(ARCHIVE_DIR, fname)
            shutil.move(src, dst)
            archived.append(fname)

    # Create a tarball for completeness
    tarball = os.path.join(ARCHIVE_DIR, f'de214_archive_{datetime.now().strftime("%Y%m%d_%H%M%S")}.tar.gz')
    with tarfile.open(tarball, 'w:gz') as tf:
        for fname in archived:
            fpath = os.path.join(ARCHIVE_DIR, fname)
            tf.add(fpath, arcname=fname)

    log(f"  Archived {len(archived)} files to {ARCHIVE_DIR}/")
    log(f"  Tarball: {tarball}")
    return archived

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
def main():
    conn = get_db()

    if ROLLBACK:
        log("ROLLBACK mode: restoring JSON files from archive...")
        for fname in os.listdir(ARCHIVE_DIR):
            if fname.endswith('.json'):
                src = os.path.join(ARCHIVE_DIR, fname)
                dst = os.path.join(DATA_DIR, fname)
                shutil.move(src, dst)
                log(f"  Restored: {fname}")
        log("Rollback complete.")
        return

    if DRY_RUN:
        log("DRY RUN: showing what would be done without writing to DB...")
        files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and (
            f in ('macro_trend.json','appreciation_model.json','financial_context.json',
                  'off_market_research_required.json','enrichment_required.json')
            or re.match(r'^DAT-\d+_.*\.json$', f)
        )]
        for f in files:
            size = os.path.getsize(os.path.join(DATA_DIR, f))
            print(f"  Would migrate: {f} ({size/1024:.1f} KB)")
        return

    log("=== DE-214: Market Data Migration ===")
    create_tables(conn)
    migrate_macro_trend(conn)
    migrate_appreciation_model(conn)
    migrate_financial_context(conn)
    migrate_dat_files(conn)
    migrate_status_files(conn)
    archived = archive_json_files()
    conn.close()

    log("\n=== Migration Summary ===")
    conn2 = get_db()
    for table in ('market_indicators','appreciation_model','financial_context','research_archives','market_meta'):
        n = conn2.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
        log(f"  {table}: {n} rows")
    conn2.close()

    log(f"\nDone. {len(archived)} JSON files archived to {ARCHIVE_DIR}/")
    log("Next: Restart server (if running) to pick up new endpoint.")

if __name__ == '__main__':
    main()
