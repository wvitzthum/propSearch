import { useState, useEffect } from 'react';
import type { MacroTrend } from '../types/macro';

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
        // Normalization Layer
        const normalized: MacroTrend = {
          london_hpi: raw.london_hpi ? {
            mom_pct: raw.london_hpi.monthly_change || 0,
            yoy_pct: raw.london_hpi.annual_change || 0,
            avg_price_pcl: raw.london_hpi.avg_price || 0
          } : undefined,
          inventory_velocity: raw.inventory_velocity || {
            months_of_supply: raw.supply_cap || 4.2,
            new_instructions_q_change: 12.5
          },
          negotiation_delta: raw.negotiation_delta || {
            avg_discount_pct: -7.4,
            pct_below_asking: 5.2
          },
          economic_indicators: {
            boe_base_rate: raw.boe_base_rate || 3.75,
            gbp_usd: raw.gbp_usd || 1.28,
            uk_inflation_cpi: raw.uk_inflation_cpi || 2.1,
            mortgage_rates: raw.mortgage_rates ? {
              "90_ltv_2yr_fixed": raw.mortgage_rates.two_year_fixed_90_ltv || raw.mortgage_rates["90_ltv_2yr_fixed"] || 4.45,
              "90_ltv_5yr_fixed": raw.mortgage_rates.five_year_fixed_90_ltv || raw.mortgage_rates["90_ltv_5yr_fixed"] || 4.55,
              "85_ltv_5yr_fixed": raw.mortgage_rates.five_year_fixed_85_ltv || 4.25,
              "75_ltv_5yr_fixed": raw.mortgage_rates.five_year_fixed_75_ltv || 4.10,
              "60_ltv_5yr_fixed": raw.mortgage_rates.five_year_fixed_60_ltv || 3.70,
              avg_fees: raw.mortgage_rates.avg_fees || 995
            } : {
              "90_ltv_2yr_fixed": 4.45,
              "90_ltv_5yr_fixed": 4.55,
              "85_ltv_5yr_fixed": 4.25,
              "75_ltv_5yr_fixed": 4.10,
              "60_ltv_5yr_fixed": 3.70,
              avg_fees: 995
            },
            mpc_next_meeting: raw.mpc_next_meeting,
            market_consensus: raw.market_consensus
          },
          mortgage_history: raw.mortgage_history ? raw.mortgage_history.map((h: any) => ({
            month: h.date || h.month,
            boe_rate: h.boe_rate || (raw.boe_base_rate || 3.75),
            mortgage_2yr: h.rate_90 || h.mortgage_2yr || 4.45,
            mortgage_5yr: h.rate_90 || h.mortgage_5yr || 4.55,
            cpi: h.cpi || 2.1
          })) : [],
          market_business: raw.market_business || raw.business_history || [],
          business_history: raw.business_history || raw.market_business || [],
          timing_signals: raw.timing_signals || {
            seasonal_buy_score: 8.5,
            optimal_window_description: 'Market conditions favoring buyer entry. Inventory build-up in PCL providing leverage.'
          },
          area_heat_index: raw.area_heat_index || (raw.area_trends ? Object.entries(raw.area_trends).map(([area, val]: [string, any]) => ({
            area,
            score: val.heat_index,
            trend: val.annual_growth > 0 ? 'up' : 'down'
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
