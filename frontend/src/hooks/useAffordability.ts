import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFinancialData } from './useFinancialData';
import { extractValue } from '../types/macro';

export interface BudgetProfile {
  monthlyBudget: number;
  maxMortgage: number;
  ltvBand: '90%' | '85%' | '75%';
  deposit: number;
  affordablePrice: number;
  monthlyPayment: number;
  stressTest: {
    rateIncrease: number;
    monthlyPayment: number;
    affordable: boolean;
  };
}

export interface LTVMatchScore {
  score: number; // 0-100
  band: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  color: string;
  message: string;
  maxLTV: number;
  reasons: string[];
}

const LTV_STORAGE_KEY = 'propSearch_ltv_budget';

export const useAffordability = () => {
  const { macroData } = useFinancialData();

  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    const stored = localStorage.getItem(LTV_STORAGE_KEY);
    return stored ? JSON.parse(stored) : 6000; // Default £6,000/month
  });

  const [termYears] = useState(25);

  // Live mortgage rates from macro_trend.json via useFinancialData
  // Falls back to market defaults if data unavailable
  const mortgageRates = useMemo(() => {
    const rates = macroData?.economic_indicators?.mortgage_rates;
    return {
      rate_90: extractValue(rates?.["90_ltv_5yr_fixed"]) ?? 4.55,
      rate_85: extractValue(rates?.["85_ltv_5yr_fixed"]) ?? 4.25,
      rate_75: extractValue(rates?.["75_ltv_5yr_fixed"]) ?? 4.05,
      rate_60: extractValue(rates?.["60_ltv_5yr_fixed"]) ?? 3.85,
      boe_base: extractValue(macroData?.economic_indicators?.boe_base_rate) ?? 3.75,
    };
  }, [macroData]);

  // Default rate for 90% LTV (entry gate)
  const mortgageRate = mortgageRates.rate_90;

  // Persist budget to localStorage
  useEffect(() => {
    localStorage.setItem(LTV_STORAGE_KEY, JSON.stringify(monthlyBudget));
  }, [monthlyBudget]);

  // Calculate mortgage amount from monthly payment (reverse mortgage calculation)
  const calculateMortgageFromPayment = useCallback((
    monthlyPayment: number,
    annualRate: number = mortgageRate,
    years: number = termYears
  ): number => {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    
    if (monthlyRate === 0) {
      return monthlyPayment * numPayments;
    }
    
    // Reverse annuity formula: P = PMT * [(1 - (1 + r)^-n) / r]
    const presentValueFactor = (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate;
    return monthlyPayment * presentValueFactor;
  }, [mortgageRate, termYears]);

  // Calculate LTV band based on deposit and property price
  const calculateLTVBand = useCallback((deposit: number, propertyPrice: number): '90%' | '85%' | '75%' => {
    const ltv = (propertyPrice - deposit) / propertyPrice;
    if (ltv <= 0.75) return '75%';
    if (ltv <= 0.85) return '85%';
    return '90%';
  }, []);

  // Calculate deposit from budget
  const calculateDeposit = useCallback((propertyPrice: number, monthlyBudget: number): number => {
    // First, calculate how much mortgage we can afford
    const maxMortgage = calculateMortgageFromPayment(monthlyBudget);
    // Deposit is what makes up the difference
    return Math.max(0, propertyPrice - maxMortgage);
  }, [calculateMortgageFromPayment]);

  // Get LTV Match Score for a property
  const getLTVMatchScore = useCallback((
    propertyPrice: number,
    budget: number = monthlyBudget
  ): LTVMatchScore => {
    const maxMortgage = calculateMortgageFromPayment(budget);
    const requiredDeposit = propertyPrice - maxMortgage;
    
    // If negative, we can afford without deposit (property is well within budget)
    // Cap display maxLTV at 95% since no UK lender offers 100% LTV
    if (requiredDeposit <= 0) {
      return {
        score: 100,
        band: 'Excellent',
        color: '#22c55e', // green
        message: 'Well within budget',
        maxLTV: 95,
        reasons: ['Property affordable on budget', 'Maximum leverage available (up to 95% LTV)']
      };
    }

    const depositRatio = requiredDeposit / propertyPrice;
    const ltv = 1 - depositRatio;

    // Score based on how much deposit is needed
    let score: number;
    let band: LTVMatchScore['band'];
    let color: string;
    let message: string;
    const reasons: string[] = [];

    if (depositRatio <= 0.10) { // <= 10% deposit needed
      score = 95;
      band = 'Excellent';
      color = '#22c55e';
      message = 'Minimal deposit required';
      reasons.push('Deposit under 10% of value');
    } else if (depositRatio <= 0.15) { // 10-15%
      score = 85;
      band = 'Good';
      color = '#3b82f6';
      message = 'Attainable with standard deposit';
      reasons.push('Deposit 10-15% of value');
    } else if (depositRatio <= 0.25) { // 15-25%
      score = 70;
      band = 'Fair';
      color = '#f59e0b';
      message = 'Higher deposit needed';
      reasons.push('Deposit 15-25% of value');
    } else if (depositRatio <= 0.35) { // 25-35%
      score = 50;
      band = 'Fair';
      color = '#f59e0b';
      message = 'Significant deposit required';
      reasons.push('Deposit 25-35% of value');
    } else {
      score = 30;
      band = 'Poor';
      color = '#ef4444';
      message = 'Large deposit / outside budget';
      reasons.push('Deposit exceeds 35% of value');
      reasons.push('May need alternative financing');
    }

    // LTV band affects rate
    const ltvPct = ltv * 100;
    if (ltvPct > 90) {
      reasons.push('LTV above 90% - premium rate applies');
    } else if (ltvPct > 85) {
      reasons.push('LTV 85-90% - competitive rate');
    } else if (ltvPct > 75) {
      reasons.push('LTV 75-85% - best standard rates');
    } else {
      reasons.push('LTV under 75% - lowest rates available');
    }

    return {
      score,
      band,
      color,
      message,
      maxLTV: Math.round(ltvPct),
      reasons
    };
  }, [monthlyBudget, calculateMortgageFromPayment]);

  // Calculate what property price is affordable on budget
  const getAffordablePrice = useCallback((budget: number = monthlyBudget): number => {
    const maxMortgage = calculateMortgageFromPayment(budget);
    // Assume buyer has 15% deposit (standard minimum for best rates)
    // So max affordable = maxMortgage / 0.85
    return Math.round(maxMortgage / 0.85);
  }, [monthlyBudget, calculateMortgageFromPayment]);

  // Get budget profile for a specific property
  const getBudgetProfile = useCallback((propertyPrice: number): BudgetProfile => {
    const maxMortgage = calculateMortgageFromPayment(monthlyBudget);
    const deposit = Math.max(0, propertyPrice - maxMortgage);
    const ltvBand = calculateLTVBand(deposit, propertyPrice);

    // Get the appropriate rate based on LTV band from live data
    const ltvRateMap: Record<string, number> = {
      '90%': mortgageRates.rate_90,
      '85%': mortgageRates.rate_85,
      '75%': mortgageRates.rate_75,
    };
    const adjustedRate = ltvRateMap[ltvBand] ?? mortgageRates.rate_90;
    const actualMonthly = calculateMortgageFromPayment(monthlyBudget, adjustedRate);

    // Stress test at +2% rate
    const stressRate = adjustedRate + 2;
    const stressMonthly = calculateMortgageFromPayment(monthlyBudget, stressRate);

    return {
      monthlyBudget,
      maxMortgage: Math.round(maxMortgage),
      ltvBand,
      deposit: Math.round(deposit),
      affordablePrice: Math.round(maxMortgage + deposit),
      monthlyPayment: Math.round(actualMonthly),
      stressTest: {
        rateIncrease: 2,
        monthlyPayment: Math.round(stressMonthly),
        affordable: stressMonthly <= monthlyBudget * 1.3 // 30% stress buffer
      }
    };
  }, [monthlyBudget, mortgageRates, calculateMortgageFromPayment, calculateLTVBand]);

  // Update monthly budget
  const updateBudget = useCallback((newBudget: number) => {
    setMonthlyBudget(Math.max(500, Math.min(50000, newBudget))); // Clamp 500-50k
  }, []);

  return {
    monthlyBudget,
    updateBudget,
    getLTVMatchScore,
    getAffordablePrice,
    getBudgetProfile,
    calculateMortgageFromPayment,
    calculateDeposit,
    calculateLTVBand,
    mortgageRate,
    mortgageRates,
    termYears
  };
};
