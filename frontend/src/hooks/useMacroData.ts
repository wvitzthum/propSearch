import { useState, useEffect } from 'react';
import type { MacroTrend } from '../types/macro';
import { extractValue } from '../types/macro';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export const useMacroData = () => {
  const [data, setData] = useState<MacroTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = IS_DEMO ? '/data/macro_trend.json' : '/api/macro';
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch macro data: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((raw: any) => {
        // Normalization Layer — extract all provenance-wrapped values
        const rawEcon = raw.economic_indicators || raw;
        const rawRates = rawEcon.mortgage_rates || raw.mortgage_rates || {};

        const normalized: MacroTrend = {
          london_hpi: raw.london_hpi ? {
            mom_pct: extractValue(raw.london_hpi.monthly_change ?? raw.london_hpi.mom_pct) ?? 0,
            yoy_pct: extractValue(raw.london_hpi.annual_change ?? raw.london_hpi.yoy_pct) ?? 0,
            avg_price_pcl: extractValue(raw.london_hpi.avg_price_pcl ?? raw.london_hpi.avg_price) ?? 0,
            last_updated: extractValue(raw.london_hpi.last_updated) ?? undefined
          } : undefined,
          inventory_velocity: raw.inventory_velocity ? {
            months_of_supply: extractValue(raw.inventory_velocity.months_of_supply) ?? 4.2,
            new_instructions_q_change: extractValue(raw.inventory_velocity.new_instructions_q_change) ?? 12.5
          } : { months_of_supply: 4.2, new_instructions_q_change: 12.5 },
          negotiation_delta: raw.negotiation_delta ? {
            avg_discount_pct: extractValue(raw.negotiation_delta.avg_discount_pct) ?? -7.4,
            pct_below_asking: extractValue(raw.negotiation_delta.pct_below_asking) ?? 5.2,
            market_sentiment: extractValue(raw.negotiation_delta.market_sentiment) ?? 'Stable'
          } : { avg_discount_pct: -7.4, pct_below_asking: 5.2 },
          economic_indicators: {
            boe_base_rate: extractValue(rawEcon.boe_base_rate) ?? 3.75,
            gbp_usd: extractValue(rawEcon.gbp_usd) ?? 1.28,
            uk_inflation_cpi: extractValue(rawEcon.uk_inflation_cpi) ?? 2.1,
            mortgage_rates: {
              "90_ltv_2yr_fixed": extractValue(rawRates.two_year_fixed_90_ltv ?? rawRates["90_ltv_2yr_fixed"]) ?? 4.45,
              "90_ltv_5yr_fixed": extractValue(rawRates.five_year_fixed_90_ltv ?? rawRates["90_ltv_5yr_fixed"]) ?? 4.55,
              "85_ltv_5yr_fixed": extractValue(rawRates.five_year_fixed_85_ltv ?? rawRates["85_ltv_5yr_fixed"]) ?? 4.25,
              "75_ltv_5yr_fixed": extractValue(rawRates.five_year_fixed_75_ltv ?? rawRates["75_ltv_5yr_fixed"]) ?? 4.10,
              "60_ltv_5yr_fixed": extractValue(rawRates.five_year_fixed_60_ltv ?? rawRates["60_ltv_5yr_fixed"]) ?? 3.70,
              avg_fees: extractValue(rawRates.avg_fees) ?? 995
            },
            mpc_next_meeting: extractValue(rawEcon.mpc_next_meeting) ?? extractValue(raw.mpc_next_meeting) ?? undefined,
            market_consensus: extractValue(rawEcon.market_consensus) ?? extractValue(raw.market_consensus) ?? undefined
          },
          // mortgage_history can be a direct array (demo) or wrapped { _provenance, data } (API)
          mortgage_history: (() => {
            const rawHist = raw.mortgage_history;
            const arr = Array.isArray(rawHist) ? rawHist
              : (rawHist && typeof rawHist === 'object' && Array.isArray((rawHist as any).data)) ? (rawHist as any).data
              : [];
            return arr.map((h: any) => ({
              month: h.date || h.month,
              boe_rate: extractValue(h.boe_rate) ?? extractValue(rawEcon.boe_base_rate) ?? 3.75,
              mortgage_2yr: extractValue(h.rate_90 ?? h.mortgage_2yr) ?? 4.45,
              mortgage_5yr: extractValue(h.rate_75 ?? h.mortgage_5yr) ?? 4.55,
              cpi: extractValue(h.cpi) ?? 2.1
            }));
          })(),
          market_business: raw.market_business || raw.business_history || [],
          business_history: raw.business_history || raw.market_business || [],
          timing_signals: raw.timing_signals ? {
            seasonal_buy_score: extractValue(raw.timing_signals.seasonal_buy_score) ?? 8.5,
            optimal_window_description: raw.timing_signals.optimal_window_description ?? 'Market conditions favoring buyer entry.'
          } : {
            seasonal_buy_score: 8.5,
            optimal_window_description: 'Market conditions favoring buyer entry. Inventory build-up in PCL providing leverage.'
          },
          // area_trends can be provenance-wrapped with _provenance key — filter it out
          area_heat_index: raw.area_heat_index || (raw.area_trends && typeof raw.area_trends === 'object' && !Array.isArray(raw.area_trends) ? Object.entries(raw.area_trends)
            .filter(([key]) => key !== '_provenance')
            .map(([area, val]: [string, any]) => ({
              area,
              score: extractValue(val?.heat_index) ?? 5,
              trend: (extractValue(val?.annual_growth) ?? 0) > 0 ? 'Rising' : 'Cooling'
            })) : [])
        };

        setData(normalized);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Macro data loading error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
};
