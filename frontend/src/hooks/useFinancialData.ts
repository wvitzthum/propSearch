import { useState, useEffect } from 'react';
import type { MacroTrend } from '../types/macro';
import type { FinancialContext } from '../types/financial';
import type { Property } from '../types/property';
import { extractValue } from '../types/macro';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
const API_BASE = IS_DEMO ? '/data' : '/api';

export const useFinancialData = () => {
  const [macroData, setMacroData] = useState<MacroTrend | null>(null);
  const [financialContext, setFinancialContext] = useState<FinancialContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const macroRes = await fetch(IS_DEMO ? `${API_BASE}/macro_trend.json` : `${API_BASE}/macro`);
        const financialRes = await fetch(IS_DEMO ? `${API_BASE}/financial_context.json` : `${API_BASE}/financials`);

        if (!macroRes.ok || !financialRes.ok) {
          throw new Error('Data fetch failed');
        }

        const macro = await macroRes.json();
        const financial = await financialRes.json();

        // Normalization Layer for Macro — extract provenance-wrapped values
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalizeMacro = (raw: any): MacroTrend => {
          const rawEcon = raw.economic_indicators || raw;
          const rawRates = rawEcon.mortgage_rates || raw.mortgage_rates || {};
          return {
            economic_indicators: {
              boe_base_rate: extractValue(rawEcon.boe_base_rate) ?? 3.75,
              gbp_usd: extractValue(rawEcon.gbp_usd) ?? 1.28,
              uk_inflation_cpi: extractValue(rawEcon.uk_inflation_cpi) ?? 2.1,
              mortgage_rates: {
                "90_ltv_2yr_fixed": extractValue(rawRates.two_year_fixed_90_ltv ?? rawRates["90_ltv_2yr_fixed"]) ?? 4.45,
                "90_ltv_5yr_fixed": extractValue(rawRates.five_year_fixed_90_ltv ?? rawRates["90_ltv_5yr_fixed"]) ?? 4.55,
                "85_ltv_5yr_fixed": extractValue(rawRates.five_year_fixed_85_ltv ?? rawRates["85_ltv_5yr_fixed"]) ?? 4.25,
                "75_ltv_5yr_fixed": extractValue(rawRates.five_year_fixed_75_ltv ?? rawRates["75_ltv_5yr_fixed"]) ?? 4.05,
                "60_ltv_5yr_fixed": extractValue(rawRates.five_year_fixed_60_ltv ?? rawRates["60_ltv_5yr_fixed"]) ?? 3.85,
                avg_fees: extractValue(rawRates.avg_fees) ?? 995
              },
              mpc_next_meeting: extractValue(rawEcon.mpc_next_meeting) ?? extractValue(raw.mpc_next_meeting) ?? undefined,
              market_consensus: extractValue(rawEcon.market_consensus) ?? extractValue(raw.market_consensus) ?? undefined
            },
            mortgage_history: (() => {
              const rawHist = raw.mortgage_history;
              const arr = Array.isArray(rawHist) ? rawHist
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                : (rawHist && typeof rawHist === 'object' && Array.isArray((rawHist as any).data)) ? (rawHist as any).data
                : [];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return arr.map((h: any) => ({
                month: h.date || h.month,
                date: h.date,
                boe_rate: extractValue(h.boe_rate) ?? extractValue(rawEcon.boe_base_rate) ?? 3.75,
                mortgage_2yr: extractValue(h.rate_90 ?? h.mortgage_2yr_90ltv ?? h.mortgage_2yr) ?? 4.45,
                mortgage_5yr: extractValue(h.rate_75 ?? h.mortgage_5yr_75ltv ?? h.mortgage_5yr) ?? 4.55,
                cpi: extractValue(h.cpi) ?? 2.1,
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
            })()
          };
        };

        setMacroData(normalizeMacro(macro));
        setFinancialContext(financial);
      } catch (err: unknown) {
        console.error('Financial data loading error:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateMonthlyOutlay = (property: Property) => {
    if (!macroData || !financialContext) return null;

    // 1. Mortgage Calculation (90% LTV, 5yr Fixed)
    const principal = property.realistic_price * 0.9;
    const rates = macroData.economic_indicators?.mortgage_rates;
    const annualRate = (extractValue(rates?.["90_ltv_5yr_fixed"]) ?? 4.5) / 100;
    const monthlyRate = annualRate / 12;
    const numberOfPayments = 25 * 12; // Standard 25 year term

    const monthlyMortgage = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    // 2. Council Tax
    const councilInfo = financialContext.council_tax.find(c => 
      (c.areas && c.areas.includes(property.area)) || (c.area === property.area)
    );
    const band = property.council_tax_band || 'E'; // Default to E for prime London
    const annualCouncilTax = councilInfo?.bands?.[band]?.["2025_26"] || councilInfo?.annual_cost || 2000;
    const monthlyCouncilTax = annualCouncilTax / 12;

    // 3. Service Charge & Ground Rent
    // BUG-006: Only include real numbers. null/undefined → 0 (unknown cost not fabricated).
    // Real £0 service charge (from portal) will still appear as £0 — distinction is
    // null = "not enriched" (unknown) vs 0 = "confirmed £0" (shown as £0).
    const monthlyServiceCharge = (property.service_charge != null ? property.service_charge : 0) / 12;
    const monthlyGroundRent = (property.ground_rent != null ? property.ground_rent : 0) / 12;

    const totalMonthly = monthlyMortgage + monthlyCouncilTax + monthlyServiceCharge + monthlyGroundRent;

    return {
      mortgage: Math.round(monthlyMortgage),
      councilTax: Math.round(monthlyCouncilTax),
      serviceCharge: Math.round(monthlyServiceCharge),
      groundRent: Math.round(monthlyGroundRent),
      total: Math.round(totalMonthly),
      principal: Math.round(principal),
      rate: annualRate * 100
    };
  };

  return { macroData, financialContext, loading, error, calculateMonthlyOutlay };
};
