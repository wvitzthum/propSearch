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
const TERM_STORAGE_KEY = 'propSearch_loan_term';
const DEPOSIT_MODE_KEY = 'propSearch_deposit_mode';
const DEPOSIT_PCT_KEY = 'propSearch_deposit_pct';
const VALID_TERMS = [15, 20, 25, 30] as const;
const DEPOSIT_PRESETS = [5, 10, 15, 20, 25] as const;
const DEFAULT_DEPOSIT_PCT = 15; // 15% — standard minimum for best LTV rates

export type DepositMode = 'auto' | 'fixed';

export interface TotalPurchaseCost {
  deposit: number;
  depositPct: number;
  mortgage: number;
  sdlt: number;
  solicitorFees: number;
  surveyFees: number;
  mortgageFees: number;
  totalCapital: number; // deposit + SDLT
  totalCashNeeded: number; // deposit + SDLT + solicitor + survey + mortgage fees
  isFtB: boolean;
  sdltBand: string;
}

export const useAffordability = () => {
  const { macroData } = useFinancialData();

  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    const stored = localStorage.getItem(LTV_STORAGE_KEY);
    if (!stored) return 6000;
    const parsed = JSON.parse(stored);
    // FE-231: Clamp on init to prevent corrupted localStorage values (e.g. test artifacts)
    // from producing astronomically large mortgage/payment displays on the property page.
    return Math.max(500, Math.min(50000, parsed));
  });

  const [termYears, _setTermYears] = useState<number>(() => {
    const stored = localStorage.getItem(TERM_STORAGE_KEY);
    if (!stored) return 25;
    const parsed = JSON.parse(stored);
    // Clamp on init: guard against corrupted stored values.
    return VALID_TERMS.includes(parsed as any) ? parsed : 25;
  });

  // Persist term to localStorage
  useEffect(() => {
    localStorage.setItem(TERM_STORAGE_KEY, JSON.stringify(termYears));
  }, [termYears]);

  const updateTermYears = useCallback((years: number) => {
    if (VALID_TERMS.includes(years as (typeof VALID_TERMS)[number])) {
      _setTermYears(years);
    }
  }, []);

  // --- Deposit Mode & Percentage (FE-169) ---
  const [depositMode, setDepositModeState] = useState<DepositMode>(() => {
    const stored = localStorage.getItem(DEPOSIT_MODE_KEY);
    return (stored ? JSON.parse(stored) : 'auto') as DepositMode;
  });

  const [depositPct, setDepositPctState] = useState<number>(() => {
    const stored = localStorage.getItem(DEPOSIT_PCT_KEY);
    if (!stored) return DEFAULT_DEPOSIT_PCT;
    const parsed = JSON.parse(stored);
    // Clamp on init: guard against corrupted stored values.
    return Math.max(5, Math.min(60, parsed));
  });

  // Persist deposit mode
  useEffect(() => {
    localStorage.setItem(DEPOSIT_MODE_KEY, JSON.stringify(depositMode));
  }, [depositMode]);

  // Persist deposit percentage
  useEffect(() => {
    localStorage.setItem(DEPOSIT_PCT_KEY, JSON.stringify(depositPct));
  }, [depositPct]);

  const setDepositMode = useCallback((mode: DepositMode) => {
    setDepositModeState(mode);
  }, []);

  const setDepositPct = useCallback((pct: number) => {
    setDepositPctState(Math.max(5, Math.min(60, pct)));
  }, []);

  // --- SDLT Calculation (FE-169) ---
  const calculateSDLT = useCallback((
    propertyPrice: number,
    isFtB: boolean = false,
    isAdditionalProperty: boolean = false
  ): { sdlt: number; sdltBand: string } => {
    const sdltTiers = macroData?.sdlt_tiers;
    if (!sdltTiers) {
      // Fallback: rough estimate using standard 5% on portion above £250K
      const taxable = Math.max(0, propertyPrice - 250000);
      return { sdlt: Math.round(taxable * 0.05), sdltBand: 'Standard (est.)' };
    }

    const standardRates = sdltTiers.standard_rates;
    const additionalSurcharge = sdltTiers.additional_property_surcharge ?? 3;

    // Determine which rate table to use
    let rates: { bracket: string; rate: number }[] = standardRates;
    let sdltBand = 'Standard';

    if (isFtB && !isAdditionalProperty) {
      const ftb = sdltTiers.first_time_buyer_relief;
      if (ftb && propertyPrice <= ftb.threshold) {
        rates = ftb.bands;
        sdltBand = 'FTB Relief';
      }
    }

    if (isAdditionalProperty) {
      sdltBand = `Standard + ${additionalSurcharge}% APS`;
    }

    // HMRC SDLT is charged cumulatively on each band.
    // Extract cumulative upper bounds and compute tax per band:
    // taxable_in_band_i = min(price, upper_i) - min(price, upper_{i-1})
    const upperBounds: number[] = [];
    for (const band of rates) {
      const match = band.bracket.match(/£([0-9,]+)\s*-\s*£([0-9,]+)/);
      if (match) {
        upperBounds.push(parseInt(match[2].replace(/,/g, ''), 10));
      } else {
        const openMatch = band.bracket.match(/£([0-9,]+)\+/);
        if (openMatch) {
          upperBounds.push(Infinity);
        }
      }
    }

    let totalSDLT = 0;
    let prevBound = 0;
    for (let i = 0; i < rates.length; i++) {
      const upper = upperBounds[i] ?? Infinity;
      const taxableInBand = Math.min(propertyPrice, upper) - prevBound;
      if (taxableInBand > 0) {
        totalSDLT += taxableInBand * (rates[i].rate / 100);
      }
      prevBound = upper;
      if (prevBound >= propertyPrice) break;
    }

    // Add 3% additional property surcharge if applicable
    if (isAdditionalProperty) {
      totalSDLT += propertyPrice * (additionalSurcharge / 100);
    }

    return { sdlt: Math.round(totalSDLT), sdltBand };
  }, [macroData]);

  // --- Total Purchase Cost Calculation (FE-169) ---
  const calculateTotalPurchaseCost = useCallback((
    propertyPrice: number,
    isFtB: boolean = false,
    isAdditionalProperty: boolean = false,
    surveyTier: 'homebuyer' | 'building' | 'mortgage_valuation' = 'homebuyer',
    feeTier: 'low' | 'typical' | 'high' = 'typical'
  ): TotalPurchaseCost => {
    const benchmarks = macroData?.purchase_cost_benchmarks;

    // Deposit: use configured pct or fall back to auto (15%)
    const effectiveDepositPct = depositMode === 'fixed' ? depositPct : 15;
    const deposit = Math.round(propertyPrice * (effectiveDepositPct / 100));
    const mortgage = Math.max(0, propertyPrice - deposit);

    // SDLT
    const { sdlt, sdltBand } = calculateSDLT(propertyPrice, isFtB, isAdditionalProperty);

    // Solicitor fees
    const solicitorTypical = benchmarks?.solicitor_conveyancing_fees?.typical?.value ?? 2000;
    const solicitorDisbursements = benchmarks?.solicitor_conveyancing_fees?.disbursements_estimate?.value ?? 350;
    const solicitorFees = feeTier === 'high'
      ? (benchmarks?.solicitor_conveyancing_fees?.high?.value ?? 3500) + solicitorDisbursements
      : feeTier === 'low'
      ? (benchmarks?.solicitor_conveyancing_fees?.low?.value ?? 1200) + solicitorDisbursements
      : solicitorTypical + solicitorDisbursements;

    // Survey fees
    const surveyKey = surveyTier === 'building'
      ? 'building_survey'
      : surveyTier === 'mortgage_valuation'
      ? 'mortgage_valuation'
      : 'homebuyer_report';
    const surveyFees = benchmarks?.rics_surveys?.[surveyKey]?.[feeTier]?.value
      ?? (surveyTier === 'building' ? 1000 : surveyTier === 'mortgage_valuation' ? 250 : 600);

    // Mortgage arrangement fee (typical)
    const mortgageFees = benchmarks?.mortgage_arrangement_fee?.[feeTier]?.value ?? 999;

    const totalCapital = deposit + sdlt;
    const totalCashNeeded = deposit + sdlt + solicitorFees + surveyFees + mortgageFees;

    return {
      deposit,
      depositPct: effectiveDepositPct,
      mortgage,
      sdlt,
      solicitorFees,
      surveyFees,
      mortgageFees,
      totalCapital,
      totalCashNeeded,
      isFtB,
      sdltBand,
    };
  }, [macroData, depositMode, depositPct, calculateSDLT]);

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
    // FE-230 BUG 1 fix: termYears was used as a default param but missing from dep array.
    // This caused stale-closure on term changes, making affordableRange stale even when
    // monthlyBudget changed. Added termYears here to keep calculateMortgageFromPayment fresh.
  }, [mortgageRate, termYears]);

  // Calculate monthly payment from mortgage amount (forward mortgage calculation)
  // This is the INVERSE of calculateMortgageFromPayment.
  const calculatePaymentFromMortgage = useCallback((
    mortgageAmount: number,
    annualRate: number,
    years: number = termYears
  ): number => {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;

    if (monthlyRate === 0) {
      return mortgageAmount / numPayments;
    }

    // Standard annuity formula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
    // Equivalently: PMT = P / [(1 - (1+r)^-n) / r]
    const presentValueFactor = (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate;
    return mortgageAmount / presentValueFactor;
  }, [termYears]);

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
  // BUG-001 FIX: Respect depositMode and depositPct instead of hardcoded 15%
  // In fixed mode: use configured depositPct (e.g., 25%) → max affordable = mortgage / (1 - depositPct/100)
  // In auto mode: default to 15% deposit → max affordable = mortgage / 0.85
  const getAffordablePrice = useCallback((budget: number = monthlyBudget): number => {
    const maxMortgage = calculateMortgageFromPayment(budget);
    const effectiveDepositPct = depositMode === 'fixed' ? depositPct : 15;
    const ltvFraction = 1 - effectiveDepositPct / 100;
    return Math.round(maxMortgage / ltvFraction);
  }, [monthlyBudget, depositMode, depositPct, calculateMortgageFromPayment]);

  // Get budget profile for a specific property
  const getBudgetProfile = useCallback((propertyPrice: number): BudgetProfile => {
    const maxMortgage = calculateMortgageFromPayment(monthlyBudget);

    // FIX: Respect depositMode — in fixed mode use configured deposit pct;
    // in auto mode derive deposit from monthly budget (affordability-based).
    let deposit: number;
    let mortgageAmount: number;
    let ltvBand: BudgetProfile['ltvBand'];

    if (depositMode === 'fixed') {
      // Use the user's configured fixed deposit percentage
      deposit = Math.round(propertyPrice * (depositPct / 100));
      mortgageAmount = Math.max(0, propertyPrice - deposit);
      ltvBand = calculateLTVBand(deposit, propertyPrice);
    } else {
      // Auto mode: derive deposit as whatever gap the monthly budget leaves
      deposit = Math.max(0, propertyPrice - maxMortgage);
      mortgageAmount = maxMortgage;
      ltvBand = calculateLTVBand(deposit, propertyPrice);
    }

    // Get the appropriate rate based on LTV band from live data
    const ltvRateMap: Record<string, number> = {
      '90%': mortgageRates.rate_90,
      '85%': mortgageRates.rate_85,
      '75%': mortgageRates.rate_75,
    };
    const adjustedRate = ltvRateMap[ltvBand] ?? mortgageRates.rate_90;

    // Monthly payment: in fixed mode use mortgage amount; in auto mode use the actual
    // payment for this property's mortgage at the LTV band's rate (not monthlyBudget).
    // BUG FIX: calculateMortgageFromPayment computes P from PMT — it cannot be reused as
    // "PMT from P". Use calculatePaymentFromMortgage instead.
    const principal = Math.min(mortgageAmount, propertyPrice);
    const actualMonthly = calculatePaymentFromMortgage(principal, adjustedRate, termYears);

    // Stress test at +2% rate
    const stressRate = adjustedRate + 2;
    const stressMonthly = calculatePaymentFromMortgage(principal, stressRate, termYears);

    return {
      monthlyBudget,
      maxMortgage: Math.round(mortgageAmount),
      ltvBand,
      deposit: Math.round(deposit),
      affordablePrice: Math.round(mortgageAmount + deposit),
      monthlyPayment: Math.round(actualMonthly),
      stressTest: {
        rateIncrease: 2,
        monthlyPayment: Math.round(stressMonthly),
        affordable: stressMonthly <= monthlyBudget * 1.3, // 30% stress buffer
      },
    };
  }, [monthlyBudget, depositMode, depositPct, mortgageRates, calculatePaymentFromMortgage, calculateLTVBand, termYears]);

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
    termYears,
    updateTermYears,
    // FE-169: Deposit configuration
    depositMode,
    depositPct,
    setDepositMode,
    setDepositPct,
    DEPOSIT_PRESETS,
    calculateSDLT,
    calculateTotalPurchaseCost,
  };
};
