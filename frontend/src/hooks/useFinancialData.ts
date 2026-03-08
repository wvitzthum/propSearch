import { useState, useEffect } from 'react';
import type { MacroTrend } from '../types/macro';
import type { FinancialContext } from '../types/financial';
import type { Property } from '../types/property';

const API_BASE = 'http://localhost:3001/api';

export const useFinancialData = () => {
  const [macroData, setMacroData] = useState<MacroTrend | null>(null);
  const [financialContext, setFinancialContext] = useState<FinancialContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let macro: MacroTrend;
        let financial: FinancialContext;

        try {
          const [macroRes, financialRes] = await Promise.all([
            fetch(`${API_BASE}/macro`),
            fetch(`${API_BASE}/financials`)
          ]);
          if (!macroRes.ok || !financialRes.ok) throw new Error('API Unavailable');
          macro = await macroRes.json();
          financial = await financialRes.json();
        } catch (e) {
          console.warn('API unavailable, falling back to static files');
          const [macroRes, financialRes] = await Promise.all([
            fetch('/data/macro_trend.json'),
            fetch('/data/financial_context.json')
          ]);
          if (!macroRes.ok || !financialRes.ok) throw new Error('Static data unavailable');
          macro = await macroRes.json();
          financial = await financialRes.json();
        }

        setMacroData(macro);
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
    const annualRate = macroData.economic_indicators.mortgage_rates["90_ltv_5yr_fixed"] / 100;
    const monthlyRate = annualRate / 12;
    const numberOfPayments = 25 * 12; // Standard 25 year term

    const monthlyMortgage = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    // 2. Council Tax
    const councilInfo = financialContext.council_tax.find(c => 
      c.areas.includes(property.area)
    );
    const band = property.council_tax_band || 'E'; // Default to E for prime London
    const annualCouncilTax = councilInfo?.bands[band]?.["2025_26"] || 2000;
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
