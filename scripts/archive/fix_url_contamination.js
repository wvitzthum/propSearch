#!/usr/bin/env node
/**
 * DAT-216: Remediate URL cross-contaminations
 * Removes incorrectly assigned portal listing URLs from wrong properties.
 * Run: node scripts/fix_url_contamination.js
 */
const Database = require('better-sqlite3');
const db = new Database('./data/propSearch.db');
const today = new Date().toISOString().split('T')[0];

function updateNotes(id, note) {
  db.prepare('UPDATE properties SET analyst_notes = analyst_notes || ? WHERE id = ?')
    .run('\n\n' + note, id);
}

function setLinks(id, links) {
  const url = JSON.stringify(Array.isArray(links) ? links : []);
  db.prepare('UPDATE properties SET links = ? WHERE id = ?').run(url, id);
}

// FIX 1: ch-7fbc76d0f3e9 duplicate of ch-8bfd4893b147
// Both Chelsea Manor Gardens SW3 — same property, different address strings.
// 166642760 belongs to ch-8bfd4893b147 (6th floor flat). Remove from ch-7fbc76d0f3e9.
{
  const note = '[DAT-216 2026-04-16] CROSS-CONTAMINATION FIX: Removed Rightmove 166642760 -- this URL belongs to ch-8bfd4893b147 (Chelsea Manor Gardens, 6th floor flat, same address, £750k). ch-7fbc76d0f3e9 and ch-8bfd4893b147 are the same property with different address strings. ch-8bfd4893b147 is authoritative. ch-7fbc76d0f3e9 is the duplicate.';
  setLinks('ch-7fbc76d0f3e9', [{url:'https://www.rightmove.co.uk/properties/171798107', source:'Rightmove'}]);
  updateNotes('ch-7fbc76d0f3e9', note);
  console.log('FIX 1: ch-7fbc76d0f3e9 -- removed contaminated 166642760');
}

// FIX 2: Kings Road SW3 -- ch-01de8a9e250d incorrectly claims 173712758
// ch-01de8a9e250d (2bed/1bath) -- Rightmove 173712758 = ch-dd3825162b20 (2bed/2bath/12th floor)
{
  const note = '[DAT-216 2026-04-16] CROSS-CONTAMINATION FIX: Removed Rightmove 173712758 -- this URL belongs to ch-dd3825162b20 (2bed/2bath 12th floor Kings Road SW3 £740k). ch-01de8a9e250d (2bed/1bath) is a different unit in same building. Retained unique link 168656408. Shared URL now correctly assigned to listing-holder only.';
  setLinks('ch-01de8a9e250d', [{url:'https://www.rightmove.co.uk/properties/168656408', source:'Rightmove'}]);
  updateNotes('ch-01de8a9e250d', note);
  console.log('FIX 2: ch-01de8a9e250d -- removed contaminated 173712758');
}

// FIX 3: Dovehouse Street SW3 -- both records claim 173683697
// Same address, cannot determine definitive listing holder. Flagged for manual review.
{
  const note = '[DAT-216 2026-04-16] CROSS-CONTAMINATION REVIEW: Rightmove 173683697 in both ch-fdec77f8c1a3 and ch-2a62d96db016 (Dovehouse Street SW3, 1-bed £750k). Cannot determine definitive listing holder. URL retained in both -- manual review required to assign correctly.';
  updateNotes('ch-fdec77f8c1a3', note);
  updateNotes('ch-2a62d96db016', note);
  console.log('FIX 3: Dovehouse Street SW3 -- flagged both for manual review');
}

// FIX 4: Warwick Avenue W9 -- 613c1c53 contaminated with Chestertons VEN250013
// 613c1c53: no data. ce1b5f55: 1bed GF SoFH £700k -- correct holder.
{
  const note = '[DAT-216 2026-04-16] CROSS-CONTAMINATION FIX: Removed Chestertons VEN250013 URL from 613c1c53 -- belongs to ce1b5f55 (1bed GF SoFH £700k Warwick Ave W9). 613c1c53 has null price/beds/sqft -- no property data. Flagged -- verify merge into ce1b5f55 or archive.';
  setLinks('613c1c53-9e6d-4d90-9b52-c25dfa49c304', []);
  updateNotes('613c1c53-9e6d-4d90-9b52-c25dfa49c304', note);
  console.log('FIX 4: 613c1c53 -- removed contaminated Chestertons URL');
}

// FIX 5: Warwick Avenue W9 -- 78ba7b2a duplicate of a5f38348
// Both Mars & Parsons. 78ba7b2a has no data; a5f38348 has partial data.
{
  const note = '[DAT-216 2026-04-16] DUPLICATE FIX: 78ba7b2a is duplicate of a5f38348 (Warwick Ave W9 same Mars & Parsons URL). a5f38348 more enriched (FlareSolverr partial access images captured). 78ba7b2a has no property data. URL removed. Verify merge into a5f38348 or archive.';
  setLinks('78ba7b2a-ee07-4796-9866-1f403412414a', []);
  updateNotes('78ba7b2a-ee07-4796-9866-1f403412414a', note);
  console.log('FIX 5: 78ba7b2a -- duplicate of a5f38348 URL removed');
}

// FIX 6: Fellows Road Belsize Park NW3 -- inbox_zoopla_71332606 duplicate of ps-5baf932b
{
  const note = '[DAT-216 2026-04-16] ADDRESS DUPLICATE: inbox_zoopla_71332606 is duplicate of ps-5baf932b (Fellows Road Belsize Park NW3 3JH same Zoopla URL 71332606). ps-5baf932b authoritative (lease=80yr confirmed). inbox record has null lease. URL removed from duplicate -- ps-5baf932b retains correct link. Review and archive inbox_zoopla_71332606.';
  setLinks('inbox_zoopla_71332606', []);
  updateNotes('inbox_zoopla_71332606', note);
  console.log('FIX 6: inbox_zoopla_71332606 -- duplicate of ps-5baf932b URL removed');
}

// FIX 7: Savernake Road Hampstead NW3 -- inbox_zoopla_72683642 duplicate of ps-506623be
{
  const note = '[DAT-216 2026-04-16] ADDRESS DUPLICATE: inbox_zoopla_72683642 is duplicate of ps-506623be (Savernake Road Hampstead NW3 2JR same Zoopla URL 72683642). ps-506623be is vetted (pipeline=vetted alpha=7.8) -- authoritative. inbox version less enriched. URL removed from duplicate. Review and archive inbox_zoopla_72683642.';
  setLinks('inbox_zoopla_72683642', []);
  updateNotes('inbox_zoopla_72683642', note);
  console.log('FIX 7: inbox_zoopla_72683642 -- duplicate of ps-506623be URL removed');
}

db.close();
console.log('\nAll contamination fixes applied.');
