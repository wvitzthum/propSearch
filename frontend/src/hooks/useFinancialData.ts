import { useState, useEffect } from 'react';
import type { MacroTrend } from '../types/macro';
import type { FinancialContext } from '../types/financial';
import type { Property } from '../types/property';

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

        // Normalization Layer for Macro
        const normalizeMacro = (raw: any): MacroTrend => ({
          ...raw,
          economic_indicators: {
            boe_base_rate: raw.boe_base_rate || 3.75,
            gbp_usd: raw.gbp_usd || 1.28,
            uk_inflation_cpi: raw.uk_inflation_cpi || 2.1,
            mortgage_rates: {
              "90_ltv_2yr_fixed": raw.mortgage_rates?.two_year_fixed_90_ltv || raw.mortgage_rates?.["90_ltv_2yr_fixed"] || 4.45,
              "90_ltv_5yr_fixed": raw.mortgage_rates?.five_year_fixed_90_ltv || raw.mortgage_rates?.["90_ltv_5yr_fixed"] || 4.55,
              "85_ltv_5yr_fixed": raw.mortgage_rates?.five_year_fixed_85_ltv || raw.mortgage_rates?.["85_ltv_5yr_fixed"] || 4.25,
              "75_ltv_5yr_fixed": raw.mortgage_rates?.five_year_fixed_75_ltv || raw.mortgage_rates?.["75_ltv_5yr_fixed"] || 4.05,
              "60_ltv_5yr_fixed": raw.mortgage_rates?.five_year_fixed_60_ltv || raw.mortgage_rates?.["60_ltv_5yr_fixed"] || 3.85,
              avg_fees: raw.mortgage_rates?.avg_fees || 995
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
          })) : []
        });

        setMacroData(normalizeMacro(macro));
        setFinancialContext(financial);
      } catch (err: any) {
        console.error('Financial data loading error:', err);
        setError(err.message);
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
    const annualRate = (rates?.["90_ltv_5yr_fixed"] || 4.5) / 100;
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
    const monthlyServiceCharge = property.service_charge / 12;
    const monthlyGroundRent = property.ground_rent / 12;

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
