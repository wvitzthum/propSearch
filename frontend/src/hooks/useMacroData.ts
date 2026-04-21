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
      .then(/* eslint-disable @typescript-eslint/no-explicit-any */ (raw: any) => {
        // Normalization Layer — extract all provenance-wrapped values
        const rawEcon = raw.economic_indicators || raw;
        const rawRates = rawEcon.mortgage_rates || raw.mortgage_rates || {};

        // --- FE-164 / DE-166: area_heat_index normalization —
        // DE-166: area_trends can now be an array OR a legacy object.
        // Build area_heat_index from whichever source is available.
        const areaHeatRaw: any[] = (() => {
          // Source 1: explicit array in the JSON
          if (Array.isArray(raw.area_heat_index)) return raw.area_heat_index;
          // Source 2: area_trends as an array (DE-166 restructure)
          if (Array.isArray(raw.area_trends)) {
            return raw.area_trends.map((a: any) => ({
              area: a.area,
              score: extractValue(a.heat_index ?? a.score) ?? 5,
              trend: (extractValue(a.annual_growth) ?? 0) > 0 ? 'Rising' : 'Cooling'
            }));
          }
          // Source 3: legacy area_trends as object (pre-DE-166)
          if (raw.area_trends && typeof raw.area_trends === 'object') {
            return Object.entries(raw.area_trends)
                .filter(([key]) => key !== '_provenance')
                .map(([area, val]: [string, any]) => ({
                  area,
                  score: extractValue(val?.heat_index ?? val?.score) ?? 5,
                  trend: (extractValue(val?.annual_growth) ?? 0) > 0 ? 'Rising' : 'Cooling'
                }));
          }
          return [];
        })();

        // --- FE-164: area_trends normalization ---
        // DE-166: area_trends can now be an array (restructured JSON) or legacy object.
        const areaTrendsNormalized: any[] = (() => {
          if (!raw.area_trends) return [];
          // Array format (DE-166+): already has .area field, pass through
          if (Array.isArray(raw.area_trends)) return raw.area_trends;
          // Legacy object format: convert to array
          if (typeof raw.area_trends === 'object') {
            return Object.entries(raw.area_trends)
                .filter(([key]) => key !== '_provenance')
                .map(([area, val]: [string, any]) => {
                  const heat = extractValue(val?.heat_index) ?? 5;
                  const growth = extractValue(val?.annual_growth) ?? 0;
                  const forecast = extractValue(val?.hpi_forecast_12m);
                  const benchmark = extractValue(val?.london_benchmark);
                  return {
                    area,
                    heat_index: val?.heat_index ?? heat,
                    annual_growth: val?.annual_growth ?? growth,
                    hpi_forecast_12m: val?.hpi_forecast_12m ?? forecast,
                    london_benchmark: val?.london_benchmark ?? benchmark,
                    delta: forecast != null && benchmark != null
                      ? forecast - benchmark
                      : (forecast != null ? forecast - 1.2 : undefined)
                  };
                });
          }
          return [];
        })();

        // --- FE-164: hpi_forecasts normalization ---
        const hpiForecastsNormalized = Array.isArray(raw.hpi_forecasts)
          ? raw.hpi_forecasts.map((f: any) => ({
              area: f.area,
              forecast_12m: f.forecast_12m,
              london_benchmark: f.london_benchmark ?? 1.2,
              delta: extractValue(f.forecast_12m) - extractValue(f.london_benchmark ?? 1.2)
            }))
          : [];

        // --- FE-182: swap_rates normalization — handle both flat and nested API formats ---
        const rawSwap = raw.swap_rates;
        // Support nested API format: { current: { two_year_gbp_swap, five_year_gbp_swap }, history_2yr, history_5yr }
        // Support flat format: { gbp_2yr, gbp_5yr, history_2yr, history_5yr }
        const swapCurrent = rawSwap?.current ?? rawSwap ?? null;
        const swapHistory2yr: any[] = Array.isArray(rawSwap?.history_2yr) ? rawSwap.history_2yr
          : Array.isArray(rawSwap?.current?.history_2yr) ? rawSwap.current.history_2yr : [];
        const swapHistory5yr: Array<{month: string; rate: any}> = Array.isArray(rawSwap?.history_5yr) ? rawSwap.history_5yr
          : Array.isArray(rawSwap?.current?.history_5yr) ? rawSwap.current.history_5yr : [];

        const calcTrend = (history: any[], current: number): 'rising' | 'falling' | 'holding' => {
          if (history.length < 2) return 'holding';
          const prev = extractValue(history[history.length - 2]?.rate) ?? current;
          const diff = current - prev;
          return diff > 0.05 ? 'rising' : diff < -0.05 ? 'falling' : 'holding';
        };

        const raw2yr = swapCurrent
          ? (extractValue(swapCurrent.gbp_2yr) ?? extractValue(swapCurrent.two_year_gbp_swap) ?? 4.10)
          : 4.10;
        const raw5yr = swapCurrent
          ? (extractValue(swapCurrent.gbp_5yr) ?? extractValue(swapCurrent.five_year_gbp_swap) ?? 3.95)
          : 3.95;

        // FE-182: Normalize to plain numbers (not ProvenanceOrValue) to prevent NaN in SVG math
        const swapRatesNormalized = swapCurrent ? {
          gbp_2yr: raw2yr,
          gbp_5yr: raw5yr,
          trend_2yr: (rawSwap as any)?.trend_2yr ?? calcTrend(swapHistory2yr, raw2yr),
          trend_5yr: (rawSwap as any)?.trend_5yr ?? calcTrend(swapHistory5yr, raw5yr),
          history_2yr: swapHistory2yr.map((h: any) => ({
            month: h.month || h.date,
            rate: extractValue(h.rate) ?? h.rate ?? 0
          })),
          history_5yr: swapHistory5yr.map((h: any) => ({
            month: h.month || h.date,
            rate: extractValue(h.rate) ?? h.rate ?? 0
          }))
        } : undefined;

        // --- FE-164: boe_rate_consensus normalization ---
        const boeCons = raw.boe_rate_consensus;
        const boeConsNormalized = boeCons ? {
          current_rate: boeCons.current_rate ?? rawEcon.boe_base_rate ?? 3.75,
          scenarios: {
            bear: boeCons.scenarios?.bear ?? { label: 'Bear', end_q2_2027_rate: 5.25, path: [3.75, 4.0, 4.5, 5.0, 5.25] },
            base: boeCons.scenarios?.base ?? { label: 'Base', end_q2_2027_rate: 4.0, path: [3.75, 3.75, 3.75, 3.75, 4.0] },
            bull: boeCons.scenarios?.bull ?? { label: 'Bull', end_q2_2027_rate: 3.0, path: [3.75, 3.5, 3.25, 3.0, 3.0] },
          },
          mpc_dates: boeCons.mpc_dates ?? ['2026-05-07', '2026-06-18', '2026-08-06', '2026-09-17']
        } : {
          current_rate: rawEcon.boe_base_rate ?? 3.75,
          scenarios: {
            bear: { label: 'Bear', end_q2_2027_rate: 5.25, path: [3.75, 4.0, 4.5, 5.0, 5.25] },
            base: { label: 'Base', end_q2_2027_rate: 4.0, path: [3.75, 3.75, 3.75, 3.75, 4.0] },
            bull: { label: 'Bull', end_q2_2027_rate: 3.0, path: [3.75, 3.5, 3.25, 3.0, 3.0] },
          },
          mpc_dates: ['2026-05-07', '2026-06-18', '2026-08-06', '2026-09-17']
        };

        const normalized: MacroTrend = {
          london_hpi: raw.london_hpi ? {
            mom_pct: extractValue(raw.london_hpi.monthly_change ?? raw.london_hpi.mom_pct) ?? 0,
            yoy_pct: extractValue(raw.london_hpi.annual_change ?? raw.london_hpi.yoy_pct) ?? 0,
            avg_price_pcl: extractValue(raw.london_hpi.avg_price_pcl ?? raw.london_hpi.avg_price) ?? 0,
            last_updated: extractValue(raw.london_hpi.last_updated) ?? undefined,
            annual_change: extractValue(raw.london_hpi.annual_change ?? raw.london_hpi.yoy_pct) ?? 0
          } : undefined,
          // UX-004: Single canonical London benchmark — use across all components
          london_benchmark: extractValue(raw.london_hpi?.annual_change ?? raw.london_hpi?.yoy_pct) ?? 1.2,
          // UX-009: Data freshness tracking
          last_refreshed: raw.london_hpi?.last_updated ?? raw._meta?.generated_at ?? raw._provenance?.fetched ?? new Date().toISOString(),
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
          mortgage_history: (() => {
            const rawHist = raw.mortgage_history;
            const arr = Array.isArray(rawHist) ? rawHist
              : (rawHist && typeof rawHist === 'object' && Array.isArray((rawHist as any).data)) ? (rawHist as any).data
              : [];
            return arr.map((h: any) => ({
              month: h.date || h.month,
              date: h.date,
              boe_rate: extractValue(h.boe_rate) ?? extractValue(rawEcon.boe_base_rate) ?? 3.75,
              mortgage_2yr: extractValue(h.rate_90 ?? h.mortgage_2yr_90ltv ?? h.mortgage_2yr) ?? 4.45,
              mortgage_5yr: extractValue(h.rate_75 ?? h.mortgage_5yr_75ltv ?? h.mortgage_5yr) ?? 4.55,
              cpi: extractValue(h.cpi) ?? 2.1,
              // Preserve all LTV tier rates for MarketPulse (FE-164)
              rate_90: extractValue(h.rate_90 ?? h.mortgage_2yr_90ltv) ?? 4.45,
              rate_85: extractValue(h.mortgage_2yr_85ltv) ?? 4.25,
              rate_75: extractValue(h.rate_75 ?? h.mortgage_5yr_75ltv) ?? 4.05,
              rate_60: extractValue(h.mortgage_5yr_60ltv) ?? 3.85,
              mortgage_2yr_90ltv: extractValue(h.mortgage_2yr_90ltv) ?? 4.45,
              mortgage_2yr_85ltv: extractValue(h.mortgage_2yr_85ltv) ?? 4.25,
              mortgage_2yr_75ltv: extractValue(h.mortgage_2yr_75ltv) ?? 4.05,
              mortgage_2yr_60ltv: extractValue(h.mortgage_2yr_60ltv) ?? 3.85,
              mortgage_5yr_90ltv: extractValue(h.mortgage_5yr_90ltv) ?? 4.55,
              mortgage_5yr_85ltv: extractValue(h.mortgage_5yr_85ltv) ?? 4.25,
              mortgage_5yr_75ltv: extractValue(h.mortgage_5yr_75ltv) ?? 4.05,
              mortgage_5yr_60ltv: extractValue(h.mortgage_5yr_60ltv) ?? 3.85,
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
          sdlt_countdown: raw.sdlt_countdown,
          epc_deadline_risk: raw.epc_deadline_risk,
          area_heat_index: areaHeatRaw,
          // FE-164: new fields
          area_trends: areaTrendsNormalized,
          hpi_forecasts: hpiForecastsNormalized,
          swap_rates: swapRatesNormalized,
          boe_rate_consensus: boeConsNormalized,
          // Pass through hpi_history for HPIHistoryChart + LondonPrimePremiumChart
          // Schema: { date, london_hpi, uk_hpi, london_vs_uk_pct } — HM Land Registry
          hpi_history: raw.hpi_history,
          // PO-003: Analyst Statement Panel — pass through from macro_trend data
          analyst_statements: raw.analyst_statements ?? [],
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
