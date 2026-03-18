
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/propSearch.db');
const db = new Database(DB_PATH);

/**
 * Refined Alpha Score Calculation (2026 Connectivity Audit)
 * 
 * Weights:
 * - Tenure Quality (40%)
 * - Spatial Alpha (30%)
 * - Price Efficiency (30%)
 */

function calculateAlphaScore(property) {
    let tenureScore = 0;
    if (property.tenure.toLowerCase().includes('share of freehold')) {
        tenureScore = 10;
    } else if (property.tenure.toLowerCase().includes('leasehold')) {
        const years = parseInt(property.tenure.match(/\d+/) || 0);
        if (years >= 150) tenureScore = 10;
        else if (years >= 125) tenureScore = 8;
        else if (years >= 90) tenureScore = 7;
        else tenureScore = 4;
    }

    // Spatial Alpha (30%) - Refined for 2026 Elizabeth Line & Station Hubs
    let spatialScore = 0;
    const tubeDist = property.nearest_tube_distance || 1000;
    
    // Proximity to Tube/Elizabeth Line
    if (tubeDist <= 300) spatialScore += 7;
    else if (tubeDist <= 500) spatialScore += 5;
    else if (tubeDist <= 800) spatialScore += 3;
    
    // Park Proximity
    const parkDist = property.park_proximity || 1000;
    if (parkDist <= 400) spatialScore += 3;
    else if (parkDist <= 800) spatialScore += 1;
    
    spatialScore = Math.min(10, spatialScore);

    // Price Efficiency (30%) - Based on Price per SQM vs Area Benchmark
    // Benchmarks (Approximated for 2026)
    const benchmarks = {
        'Islington (N1)': 11000,
        'Islington (N7)': 9000,
        'Bayswater (W2)': 13000,
        'Belsize Park (NW3)': 12500,
        'West Hampstead (NW6)': 10500,
        'Chelsea (SW3)': 18000,
        'Chelsea (SW10)': 15000
    };

    const areaBenchmark = benchmarks[property.area] || 11000;
    const efficiency = (areaBenchmark - property.price_per_sqm) / areaBenchmark;
    let priceScore = 5 + (efficiency * 20); // 0% diff = 5, 25% cheaper = 10
    priceScore = Math.max(0, Math.min(10, priceScore));

    const finalScore = (tenureScore * 0.4) + (spatialScore * 0.3) + (priceScore * 0.3);
    return parseFloat(finalScore.toFixed(1));
}

try {
    const properties = db.prepare('SELECT * FROM properties').all();
    console.log(`Auditing Alpha Scores for ${properties.length} properties...`);

    const updateStmt = db.prepare('UPDATE properties SET alpha_score = ? WHERE id = ?');

    properties.forEach(p => {
        const newScore = calculateAlphaScore(p);
        if (newScore !== p.alpha_score) {
            console.log(`Updating ID ${p.id}: ${p.alpha_score} -> ${newScore}`);
            updateStmt.run(newScore, p.id);
        }
    });

    console.log('Alpha Score Audit Complete.');
} catch (err) {
    console.error('Audit failed:', err);
}
