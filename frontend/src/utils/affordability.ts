/**
 * affordabilityUtils.ts
 *
 * Pure calculation utilities extracted from useAffordability.
 * These have zero React dependencies and can be imported anywhere.
 *
 * NOTE ON SDLT RATES: HMRC SDLT rates effective 2025-04-01.
 * Verify these are current before launch — the UI shows a disclaimer.
 * Current rates:
 *   FTB nil-rate band: £0 – £425,000  (5% on £425,001 – £625,000)
 *   Standard: 0% (£0–£125K), 2% (£125K–£250K), 5% (£250K–£925K),
 *             10% (£925K–£1.5M), 12% (above £1.5M)
 *   Additional Property (HMRC higher rates): 3% (£0–£125K), 5% (£125K–£250K),
 *     8% (£250K–£925K), 13% (£925K–£1.5M), 15% (above £1.5M)
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MortgageCalcInput {
  monthlyPayment: number;
  annualRate: number;
  termYears: number;
}

export type BuyerScenario = 'ftb' | 'home_mover' | 'additional_property';

export interface MultiplierTier {
  maxIncome: number;
  std: number;
  max: number;
  label: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

export const MULTIPLIER_TIERS: MultiplierTier[] = [
  { maxIncome: 25000,   std: 4.5,  max: 4.75, label: 'Basic' },
  { maxIncome: 50000,   std: 4.75, max: 5.0,  label: 'Standard' },
  { maxIncome: 75000,   std: 5.0,  max: 5.25, label: 'Mid' },
  { maxIncome: 100000,  std: 5.25, max: 5.5,  label: 'Upper-Mid' },
  { maxIncome: Infinity, std: 5.5, max: 6.0,  label: 'High Earner' },
];

export const PROFESSIONAL_BOOST = 0.5;
export const PROFESSIONAL_SALARY_THRESHOLD = 75000;

export const SDLT_STANDARD_BANDS = [
  { upper: 125000,   rate: 0  },
  { upper: 250000,   rate: 2  },
  { upper: 925000,   rate: 5  },
  { upper: 1500000,  rate: 10 },
  { upper: Infinity, rate: 12 },
];

export const SDLT_FTB_BANDS = [
  { upper: 425000,   rate: 0 },
  { upper: 625000,   rate: 5 },
  { upper: Infinity, rate: 0 },
];

// FE-270: UK HMRC Additional Property (Higher Rates for SDLT)
// These are INDEPENDENT bands — NOT standard rates + 3% surcharge.
// Effective 2025-04-01 for additional dwellings purchase.
export const SDLT_HIGHER_BANDS = [
  { upper: 250000,   rate: 3  },
  { upper: 925000,   rate: 5  },
  { upper: 1500000,  rate: 8  },
  { upper: Infinity, rate: 10 },
];

// ── Pure Utilities ─────────────────────────────────────────────────────────────

export function getMultiplierTier(income: number): MultiplierTier {
  return (
    MULTIPLIER_TIERS.find(t => income <= t.maxIncome) ??
    MULTIPLIER_TIERS[MULTIPLIER_TIERS.length - 1]
  );
}

export function calcMaxMortgage(input: MortgageCalcInput): number {
  const { monthlyPayment, annualRate, termYears } = input;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return monthlyPayment * n;
  const pvf = (1 - Math.pow(1 + r, -n)) / r;
  return Math.max(0, monthlyPayment * pvf);
}

export function calcMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  const pvf = (1 - Math.pow(1 + r, -n)) / r;
  return Math.max(0, principal / pvf);
}

export function calcGrossIncome(params: {
  salary: number;
  bonusAmount: number;
  overtimeAmount: number;
}): { base: number; bonus: number; ot: number; total: number } {
  const { salary, bonusAmount, overtimeAmount } = params;
  return {
    base: salary,
    bonus: bonusAmount,
    ot: overtimeAmount * 0.5,
    total: salary + bonusAmount + overtimeAmount * 0.5,
  };
}

export interface IOCResult {
  maxMortgage: number;
  maxPayment: number;
  netPayment: number;
  rawAffordability: number;
  multiplier: number;
}

export function calcMaxMortgageFromIncome(params: {
  salary: number;
  bonusAmount: number;
  overtimeAmount: number;
  partnerSalary: number;
  isJoint: boolean;
  isProfessional: boolean;
  monthlyDebt: number;
  annualRate: number;
  termYears: number;
}): IOCResult {
  const {
    salary, bonusAmount, overtimeAmount, partnerSalary,
    isJoint, isProfessional, monthlyDebt, annualRate, termYears,
  } = params;

  const main = calcGrossIncome({ salary, bonusAmount, overtimeAmount });
  const partner = isJoint && partnerSalary > 0
    ? calcGrossIncome({ salary: partnerSalary, bonusAmount: 0, overtimeAmount: 0 })
    : { total: 0 };

  const combinedIncome = main.total + partner.total;
  const tier = getMultiplierTier(combinedIncome);
  const multiplier = isProfessional ? tier.max : tier.std;
  const rawAffordability = combinedIncome * multiplier;

  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  const pvf = r === 0 ? n : (1 - Math.pow(1 + r, -n)) / r;
  const maxPayment = rawAffordability / pvf;
  const netPayment = Math.max(0, maxPayment - monthlyDebt);
  const maxMortgage = r === 0 ? netPayment * n : netPayment * pvf;

  return {
    maxMortgage: Math.max(0, maxMortgage),
    maxPayment,
    netPayment,
    rawAffordability,
    multiplier,
  };
}

export interface SDLTResult {
  sdlt: number;
  sdltBand: string;
  isAboveFTBThreshold: boolean;
}

export function calcSDLT(price: number, scenario: BuyerScenario): SDLTResult {
  if (price <= 0) return { sdlt: 0, sdltBand: 'None', isAboveFTBThreshold: false };

  const isAdditionalProperty = scenario === 'additional_property';
  const isFtB = scenario === 'ftb';
  const isAboveFTBThreshold = isFtB && price > 625000;

  let bands: { upper: number; rate: number }[];
  let sdltBand: string;

  if (isFtB && !isAboveFTBThreshold) {
    bands = SDLT_FTB_BANDS;
    sdltBand = 'FTB Relief';
  } else if (isAdditionalProperty) {
    // FE-270 fix: use HMRC's own Higher Rates table — NOT standard + 3%
    bands = SDLT_HIGHER_BANDS;
    sdltBand = 'Higher SDLT Rates';
  } else {
    bands = SDLT_STANDARD_BANDS;
    sdltBand = 'Standard Rates';
  }

  let totalSDLT = 0;
  let prevUpper = 0;

  for (const band of bands) {
    if (prevUpper >= price) break;
    const taxableInBand = Math.min(price, band.upper) - prevUpper;
    if (taxableInBand > 0) {
      totalSDLT += taxableInBand * (band.rate / 100);
    }
    prevUpper = band.upper;
  }

  return { sdlt: Math.round(totalSDLT), sdltBand, isAboveFTBThreshold };
}

export interface PurchaseCostBreakdown {
  deposit: number;
  depositPct: number;
  mortgage: number;
  sdlt: number;
  sdltBand: string;
  solicitorFees: number;
  surveyFees: number;
  mortgageFees: number;
  totalCapital: number;
  totalCashNeeded: number;
  isFtB: boolean;
  isAdditionalProperty: boolean;
  isAboveFTBThreshold: boolean;
}

export function calcPurchaseCosts(params: {
  propertyPrice: number;
  scenario: BuyerScenario;
  depositPct: number;
  feeTier?: 'low' | 'typical' | 'high';
  surveyTier?: 'homebuyer' | 'building' | 'mortgage_valuation';
}): PurchaseCostBreakdown {
  const {
    propertyPrice, scenario, depositPct,
    feeTier = 'typical', surveyTier = 'homebuyer',
  } = params;

  const deposit = Math.round(propertyPrice * (depositPct / 100));
  const mortgage = Math.max(0, propertyPrice - deposit);
  const { sdlt, sdltBand, isAboveFTBThreshold } = calcSDLT(propertyPrice, scenario);

  const solicitorFees =
    feeTier === 'high' ? 3500 + 350
    : feeTier === 'low'  ? 1200 + 350
    :                      2000 + 350;

  const surveyFees =
    surveyTier === 'building'           ? 1200
    : surveyTier === 'mortgage_valuation' ? 250
    :                                      750;

  const mortgageFees =
    feeTier === 'high' ? 1500
    : feeTier === 'low'  ? 500
    :                      999;

  return {
    deposit,
    depositPct,
    mortgage,
    sdlt,
    sdltBand,
    solicitorFees,
    surveyFees,
    mortgageFees,
    totalCapital: deposit + sdlt,
    totalCashNeeded: deposit + sdlt + solicitorFees + surveyFees + mortgageFees,
    isFtB: scenario === 'ftb',
    isAdditionalProperty: scenario === 'additional_property',
    isAboveFTBThreshold,
  };
}

export interface CashStackEntry {
  label: string;
  amount: number;
  color: string;
  subLabel?: string;
}

export interface CashStackResult {
  entries: CashStackEntry[];
  totalCashNeeded: number;
  gap: number | null;
  gapPct: number | null;
}

export function buildCashStack(params: {
  propertyPrice: number;
  depositPct: number;
  scenario: BuyerScenario;
  availableCash: number | null;
  feeTier?: 'low' | 'typical' | 'high';
  surveyTier?: 'homebuyer' | 'building' | 'mortgage_valuation';
}): CashStackResult {
  const { propertyPrice, depositPct, scenario, availableCash, feeTier, surveyTier } = params;

  const costs = calcPurchaseCosts({ propertyPrice, scenario, depositPct, feeTier, surveyTier });

  const entries: CashStackEntry[] = [
    {
      label: 'Deposit',
      amount: costs.deposit,
      color: '#3b82f6',
      subLabel: `${costs.depositPct}% of price`,
    },
    {
      label: 'SDLT',
      amount: costs.sdlt,
      color: costs.isAboveFTBThreshold ? '#f59e0b' : '#a855f7',
      subLabel: costs.sdltBand,
    },
    {
      label: 'Fees & Disbursements',
      amount: costs.solicitorFees + costs.surveyFees + costs.mortgageFees,
      color: '#22c55e',
      subLabel: 'Legal · Survey · Mortgage',
    },
  ];

  const totalCashNeeded = costs.totalCashNeeded;
  const gap = availableCash != null && availableCash < totalCashNeeded
    ? totalCashNeeded - availableCash
    : null;
  const gapPct =
    totalCashNeeded > 0 && gap != null
      ? (gap / totalCashNeeded) * 100
      : null;

  return { entries, totalCashNeeded, gap, gapPct };
}

export function suggestPropertyPrice(maxMortgage: number): number {
  return Math.round((maxMortgage / 0.9) / 5000) * 5000;
}
