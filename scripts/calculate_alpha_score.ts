/**
 * Alpha Score Audit Script
 * Uses scripts/alphaScore.ts as the single source of truth for the formula.
 * Run: tsx scripts/calculate_alpha_score.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateAlphaScore } from './alphaScore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/propSearch.db');
const db = new Database(DB_PATH);

try {
    const properties = db.prepare('SELECT * FROM properties').all();
    console.log(`Auditing Alpha Scores for ${properties.length} properties...`);

    const updateStmt = db.prepare('UPDATE properties SET alpha_score = ? WHERE id = ?');
    let updated = 0;

    for (const p of properties) {
        const newScore = calculateAlphaScore(p);
        if (newScore !== p.alpha_score) {
            console.log(`Updating ID ${p.id}: ${p.alpha_score} → ${newScore}`);
            updateStmt.run(newScore, p.id);
            updated++;
        }
    }

    console.log(`Alpha Score Audit Complete. ${updated} record(s) updated.`);
} catch (err) {
    console.error('Audit failed:', err);
    process.exit(1);
} finally {
    db.close();
}
