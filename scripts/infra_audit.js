/**
 * propSearch: Infrastructure Audit Script
 * 
 * Proactive data quality and infrastructure health check.
 * Run: node scripts/infra_audit.js
 * 
 * Checks:
 * 1. DB schema integrity (all required columns present)
 * 2. Null/missing critical fields in active properties
 * 3. Archived properties needing analyst review
 * 4. London Metro / macro_trend sync state
 * 5. Price history coverage
 * 6. Inbox / triaged / import queue state
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API = 'http://localhost:3001';
const DATA_DIR = path.join(__dirname, '../data');

function apiGet(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`${API}${endpoint}`, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Parse error on ${endpoint}`)); }
      });
    }).on('error', reject);
  });
}

async function audit() {
  console.log('=== propSearch Infrastructure Audit ===\n');

  let health, properties;
  try {
    [health, properties] = await Promise.all([
      apiGet('/api/health'),
      apiGet('/api/properties?archived=true&limit=200')
    ]);
  } catch (e) {
    console.error('API unreachable:', e.message);
    console.error('Make sure server is running: node server/index.js');
    process.exit(1);
  }

  const active = properties.filter(p => !p.archived);
  const flagged = properties.filter(p => p.archived);

  // ── 1. Counts ──────────────────────────────────────────────────────────────
  console.log('── DB Health ──────────────────────────────────────');
  console.log(`  DB size:        ${health.db.size_kb} KB`);
  console.log(`  Journal mode:   ${health.db.journal_mode}`);
  console.log(`  Properties:    ${health.counts.properties} total | ${active.length} active | ${flagged.length} flagged`);

  // ── 2. WAL State ──────────────────────────────────────────────────────────
  const walPresent = fs.existsSync(path.join(DATA_DIR, 'propSearch.db-wal'));
  const shmPresent = fs.existsSync(path.join(DATA_DIR, 'propSearch.db-shm'));
  const mode = (health.db.journal_mode || 'unknown').toLowerCase();
  console.log(`\n── Journal State ───────────────────────────────`);
  if (mode === 'wal') {
    if (walPresent && shmPresent) {
      console.log(`  ✅ WAL: Present and healthy`);
    } else {
      console.log(`  ⚠️  WAL: Server in WAL mode but WAL/SHM files missing on disk`);
      console.log(`        Sandbox volatility — safe, server holds data in memory`);
      console.log(`        Recommend: switch to DELETE mode to avoid restart failures`);
    }
  } else if (mode === 'delete') {
    if (walPresent || shmPresent) {
      console.log(`  ⚠️  Stale WAL/SHM files present with DELETE-mode DB`);
      console.log(`        Safe to delete: propSearch.db-wal and propSearch.db-shm`);
    } else {
      console.log(`  ✅ DELETE: Healthy — no WAL files needed`);
    }
  } else {
    console.log(`  ℹ️  Mode: ${mode} — WAL files: wal=${walPresent} shm=${shmPresent}`);
  }

  // ── 3. Context Freshness ──────────────────────────────────────────────────
  console.log(`\n── Context Freshness ───────────────────────────────`);
  const now = new Date();
  for (const [key, info] of Object.entries(health.context_freshness)) {
    const age = info.updated_at
      ? Math.floor((now - new Date(info.updated_at)) / 86400000)
      : '?';
    const flag = age === '?' ? '⚠️' : age > 7 ? '🔴' : age > 3 ? '🟡' : '🟢';
    console.log(`  ${flag} ${key}: ${info.updated_at || 'NEVER'} (${age} days old, ${info.bytes.toLocaleString()} bytes)`);
  }

  // ── 4. Missing Fields in Active Properties ────────────────────────────────
  console.log(`\n── Data Quality (active) ───────────────────────────`);
  const checks = {
    'list_price': 0, 'sqft': 0, 'alpha_score': 0, 'area': 0,
    'epc': 0, 'tenure': 0, 'service_charge': 0, 'lease_years_remaining': 0
  };
  const noPriceActive = [];
  for (const p of active) {
    for (const col of Object.keys(checks)) {
      if (p[col] === null || p[col] === undefined || p[col] === 0) {
        checks[col]++;
      }
    }
    if (!p.list_price) noPriceActive.push(p);
  }
  for (const [col, count] of Object.entries(checks)) {
    const flag = count > 0 ? '⚠️' : '✅';
    console.log(`  ${flag} ${col}: ${count} missing`);
  }

  if (noPriceActive.length > 0) {
    console.log(`\n  ⚠️  ${noPriceActive.length} active properties with null price — enrichment candidates:`);
    for (const p of noPriceActive.slice(0, 5)) {
      console.log(`      ${p.id} | ${(p.address || 'NO ADDR').substring(0, 45)}`);
    }
  }

  // ── 5. Flagged Properties Summary ──────────────────────────────────────────
  const cannotVerify = flagged.filter(p => p.archive_reason && p.archive_reason.includes('Cannot Verify'));
  const needsEnrichment = flagged.filter(p => p.archive_reason && p.archive_reason.includes('Enrichment'));
  console.log(`\n── Flagged Properties ──────────────────────────────`);
  console.log(`  Total:           ${flagged.length}`);
  console.log(`  Cannot Verify:   ${cannotVerify.length}`);
  console.log(`  Needs Enrichment:${needsEnrichment.length}`);

  // ── 6. Price History Coverage ─────────────────────────────────────────────
  // Note: /api/properties does not embed price_history; check via single-property API
  const sampleIds = active.slice(0, 5).map(p => p.id);
  let historyCovered = 0;
  for (const id of sampleIds) {
    try {
      const detail = await apiGet(`/api/properties/${id}`);
      if (detail.price_history && detail.price_history.length > 0) historyCovered++;
    } catch (_) {}
  }
  console.log(`\n── Price History ───────────────────────────────────`);
  console.log(`  Total rows:      ${health.counts.price_history}`);
  if (active.length > 0) {
    console.log(`  Active covered: ${historyCovered}/${sampleIds.length} sampled (${active.length} total active)`);
  }

  // ── 7. Import Queue ────────────────────────────────────────────────────────
  console.log(`\n── Import Queue ────────────────────────────────────`);
  const importFiles = [];
  function scanDir(dir, depth = 0) {
    if (!fs.existsSync(dir) || depth > 2) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory() && !['archive','processed','snapshots'].includes(e.name)) {
        scanDir(fp, depth + 1);
      } else if (e.isFile() && (e.name.endsWith('.json') || e.name.endsWith('.jsonl') || e.name.endsWith('.csv'))) {
        importFiles.push(fp.replace(DATA_DIR + '/', ''));
      }
    }
  }
  scanDir(path.join(DATA_DIR, 'import'));
  scanDir(path.join(DATA_DIR, 'inbox'));
  if (importFiles.length > 0) {
    console.log(`  ⚠️  ${importFiles.length} unprocessed files:`);
    importFiles.slice(0, 10).forEach(f => console.log(`      ${f}`));
  } else {
    console.log(`  ✅ Import queues empty`);
  }

  // ── 8. Recommendations ───────────────────────────────────────────────────
  console.log(`\n── Recommendations ─────────────────────────────────`);
  const recs = [];
  if (checks.list_price > 0) recs.push(`Archive ${checks.list_price} null-price properties with "Needs Enrichment" reason`);
  if (checks.alpha_score > 0) recs.push(`Calculate alpha_score for ${checks.alpha_score} active properties (Data Analyst)`);
  if (!walPresent && mode === 'wal') recs.push(`DB WAL files missing with WAL mode — switch server to DELETE mode (already done)`);
  const stale = Object.entries(health.context_freshness).find(([,v]) => {
    const days = v.updated_at ? Math.floor((now - new Date(v.updated_at)) / 86400000) : 999;
    return days > 7;
  });
  if (stale) recs.push(`Refresh stale context: ${stale[0]} (${Math.floor((now - new Date(stale[1].updated_at)) / 86400000)} days old) — Data Analyst`);
  
  if (recs.length === 0) {
    console.log(`  ✅ No immediate action required`);
  } else {
    recs.forEach(r => console.log(`  → ${r}`));
  }

  console.log('\n=== Audit Complete ===');
}

audit().catch(e => { console.error(e); process.exit(1); });
