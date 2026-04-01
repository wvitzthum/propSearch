import { useMemo } from 'react';
import type { AppreciationModel } from '../types/macro';

interface MonteCarloResult {
  p10: number;       // Bear case threshold
  p50: number;       // Median / base
  p90: number;       // Bull case threshold
  p25: number;
  p75: number;
  mean: number;
  stdDev: number;
  iterations: number;
  horizonYears: number;
  finalValues: number[];  // all 10k final values for histogram
  yearlyBandP10: number[];
  yearlyBandP50: number[];
  yearlyBandP90: number[];
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function extractPostcode(area: string): string {
  // Extract postcode sector e.g. 'N1' from 'Islington (N1)'
  const match = area.match(/\(([^)]+)\)/);
  if (match) return match[1];
  // Fallback: first alphanumeric token
  const parts = area.split(/[\s,]+/);
  return parts[0] || 'N1';
}

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export const useMonteCarlo = (
  propertyPrice: number,
  area: string,
  appreciationModel: AppreciationModel | null,
  iterations = 10000,
  horizonYears = 5,
): MonteCarloResult | null => {
  return useMemo(() => {
    if (!appreciationModel || !propertyPrice) return null;

    const { postcode_volatility, monte_carlo_parameters } = appreciationModel;
    const { drift, volatility_range } = monte_carlo_parameters.random_walk_parameters;

    const postcodeCode = extractPostcode(area);
    const postcodeData = postcode_volatility[postcodeCode];

    // Use postcode volatility or fall back to London-wide
    const baseVol = postcodeData?.annual_volatility
      ? postcodeData.annual_volatility / 100
      : volatility_range[1]; // use upper bound as conservative

    // Adjust drift by risk-free rate assumption (3.75%)
    const riskFree = 0.0375;
    const adjDrift = drift + riskFree; // total expected return

    const n = horizonYears;
    const finalValues: number[] = [];
    const yearlyBandP10: number[] = [];
    const yearlyBandP50: number[] = [];
    const yearlyBandP90: number[] = [];

    // Pre-allocate year buckets
    const yearBuckets: number[][] = Array.from({ length: n + 1 }, () => []);
    yearBuckets[0].push(propertyPrice);

    for (let i = 0; i < iterations; i++) {
      let price = propertyPrice;
      yearBuckets[0].push(price);

      for (let year = 1; year <= n; year++) {
        // Geometric Brownian Motion
        const z = gaussianRandom();
        const t = 1;
        const volTerm = baseVol * Math.sqrt(t) * z;
        const driftTerm = (adjDrift - 0.5 * baseVol * baseVol) * t;
        price = price * Math.exp(driftTerm + volTerm);
        yearBuckets[year].push(price);
      }
      finalValues.push(price);
    }

    // Sort for percentile computation
    const sorted = [...finalValues].sort((a, b) => a - b);

    // Compute yearly bands
    for (let year = 0; year <= n; year++) {
      const sortedYear = [...yearBuckets[year]].sort((a, b) => a - b);
      yearlyBandP10.push(percentile(sortedYear, 10));
      yearlyBandP50.push(percentile(sortedYear, 50));
      yearlyBandP90.push(percentile(sortedYear, 90));
    }

    const mean = finalValues.reduce((a, b) => a + b, 0) / iterations;
    const variance = finalValues.reduce((a, b) => a + (b - mean) ** 2, 0) / iterations;

    return {
      p10: percentile(sorted, 10),
      p50: percentile(sorted, 50),
      p90: percentile(sorted, 90),
      p25: percentile(sorted, 25),
      p75: percentile(sorted, 75),
      mean,
      stdDev: Math.sqrt(variance),
      iterations,
      horizonYears,
      finalValues,
      yearlyBandP10,
      yearlyBandP50,
      yearlyBandP90,
    };
  }, [propertyPrice, area, appreciationModel, iterations, horizonYears]);
};
