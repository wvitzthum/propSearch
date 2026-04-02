import { useState, useEffect, useMemo } from 'react';
import type { AppreciationModel, AppreciationProfile, ScenarioResult } from '../types/macro';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export const useAppreciationModel = (propertyPrice?: number) => {
  const [data, setData] = useState<AppreciationModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = IS_DEMO ? '/data/appreciation_model.json' : '/api/appreciation';
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch appreciation model: ${res.status}`);
        return res.json();
      })
      .then((raw: AppreciationModel) => {
        setData(raw);
        setLoading(false);
      })
      .catch(err => {
        console.error('Appreciation model loading error:', err);
        setLoading(false);
      });
  }, []);

  // Compute property-specific appreciation profile
  const profile = useMemo<AppreciationProfile | null>(() => {
    if (!data || propertyPrice == null) return null;

    const { scenario_definitions } = data;
    const scenarios: ScenarioResult[] = [];

    const scenarioConfig = {
      bear: { label: 'Bear Case', color: '#ef4444', key: 'bear' as const },
      base: { label: 'Base Case', color: '#3b82f6', key: 'base' as const },
      bull: { label: 'Bull Case', color: '#22c55e', key: 'bull' as const },
    };

    let totalProbability = 0;
    let weightedFiveYearTotal = 0;

    for (const [, config] of Object.entries(scenarioConfig)) {
      const def = scenario_definitions[config.key];
      const annualReturn = def.annual_return / 100;
      const fiveYearTotal = def.five_year_total / 100;

      // Compound growth over 5 years
      const fiveYearValue = propertyPrice * Math.pow(1 + annualReturn, 5);
      const cumulativeGain = fiveYearValue - propertyPrice;

      const result: ScenarioResult = {
        scenario: config.key,
        label: config.label,
        color: config.color,
        annual_return: def.annual_return,
        five_year_total: def.five_year_total,
        five_year_value: fiveYearValue,
        probability: def.probability,
        cumulative_gain: cumulativeGain,
      };

      scenarios.push(result);
      totalProbability += def.probability;
      weightedFiveYearTotal += fiveYearTotal * def.probability;
    }

    // Expected 5-year appreciation (probability-weighted)
    const expectedFiveYearTotal = weightedFiveYearTotal / totalProbability;
    const expectedValue = propertyPrice * Math.pow(1 + expectedFiveYearTotal / 100, 5);

    // Risk-free rate = current BoE base rate
    // IRR premium vs risk-free
    const riskFreeAnnual = 0.0375; // 3.75% BoE base rate
    const baseAnnual = scenario_definitions.base.annual_return / 100;
    const portfolioAlpha = (baseAnnual - riskFreeAnnual) * 100; // pp premium
    const weightedIRR = (expectedFiveYearTotal / 100 - riskFreeAnnual) * 100;

    return {
      currentPrice: propertyPrice,
      riskFreeRate: riskFreeAnnual * 100,
      scenarios,
      expectedValue,
      weightedIRR,
      portfolioAlpha,
    };
  }, [data, propertyPrice]);

  return { data, loading, profile };
};
