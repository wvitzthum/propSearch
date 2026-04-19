/**
 * useAffordabilityCalculator.ts
 *
 * State + localStorage management for the two-floor affordability calculator.
 *
 * Floor 1 (Borrowing Engine): income inputs → max mortgage (IOC model)
 * Floor 2 (Cash Assessment): scenario + price + deposit → cash stack
 *
 * All pure calculation logic lives in affordabilityUtils.ts.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  calcMaxMortgageFromIncome,
  calcPurchaseCosts,
  buildCashStack,
  suggestPropertyPrice,
  getMultiplierTier,
  PROFESSIONAL_SALARY_THRESHOLD,
  type IOCResult,
  type BuyerScenario,
  type PurchaseCostBreakdown,
  type CashStackResult,
} from '../utils/affordability';

// ── Storage keys ────────────────────────────────────────────────────────────────
const KEY_SALARY        = 'propCalc_salary';
const KEY_BONUS_AMT     = 'propCalc_bonus_amt';
const KEY_OT_AMT        = 'propCalc_ot_amt';
const KEY_DEBT          = 'propCalc_debt';
const KEY_PROFESSIONAL  = 'propCalc_professional';
const KEY_JOINT         = 'propCalc_joint';
const KEY_PARTNER       = 'propCalc_partner';
const KEY_SCENARIO      = 'propCalc_scenario';
const KEY_PRICE         = 'propCalc_price';
const KEY_DEPOSIT_PCT   = 'propCalc_deposit_pct';
const KEY_AVAILABLE_CASH = 'propCalc_available_cash';
const KEY_TERM          = 'propCalc_term';

// ── Helpers ────────────────────────────────────────────────────────────────────

function loadNum(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    return typeof v === 'number' && isFinite(v) ? v : fallback;
  } catch { return fallback; }
}

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) === true;
  } catch { return fallback; }
}

function loadStr(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}

function save(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ── Constants ──────────────────────────────────────────────────────────────────
export const TERM_OPTIONS = [15, 20, 25, 30] as const;
export const DEPOSIT_PRESETS = [5, 10, 15, 20, 25] as const;
export const DEFAULT_TERM = 25;
export const DEFAULT_DEPOSIT_PCT = 10;

// ── Default live rate (overridden by useFinancialData in the page) ─────────────
export const DEFAULT_ANNUAL_RATE = 4.55;

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useAffordabilityCalculator(liveRate: number = DEFAULT_ANNUAL_RATE) {
  const [termYears, _setTermYears] = useState<number>(() =>
    loadNum(KEY_TERM, DEFAULT_TERM)
  );

  // Floor 1 — Income inputs
  const [salary, setSalary] = useState<number>(() => loadNum(KEY_SALARY, 75000));
  const [bonusAmount, setBonusAmount] = useState<number>(() => loadNum(KEY_BONUS_AMT, 0));
  const [overtimeAmount, setOvertimeAmount] = useState<number>(() => loadNum(KEY_OT_AMT, 0));
  const [monthlyDebt, setMonthlyDebt] = useState<number>(() => loadNum(KEY_DEBT, 0));

  // Professional toggle — auto-activates when salary > threshold
  const [professionalOverride, setProfessionalOverride] = useState<boolean | null>(() =>
    loadBool(KEY_PROFESSIONAL, false) ? true : null // null = auto, true = on, false = off
  );
  const isProfessional = professionalOverride === true ||
    (professionalOverride === null && salary >= PROFESSIONAL_SALARY_THRESHOLD);

  // Joint mortgage
  const [isJoint, setIsJoint] = useState<boolean>(() => loadBool(KEY_JOINT, false));
  const [partnerSalary, setPartnerSalary] = useState<number>(() => loadNum(KEY_PARTNER, 0));

  // Floor 2 — Cash assessment
  const [scenario, setScenario] = useState<BuyerScenario>(() =>
    loadStr(KEY_SCENARIO, 'ftb') as BuyerScenario
  );
  const [propertyPrice, setPropertyPrice] = useState<number>(() =>
    loadNum(KEY_PRICE, 0)  // 0 = use suggestion
  );
  const [depositPct, setDepositPct] = useState<number>(() =>
    loadNum(KEY_DEPOSIT_PCT, DEFAULT_DEPOSIT_PCT)
  );
  const [availableCash, setAvailableCash] = useState<number | null>(() => {
    const raw = localStorage.getItem(KEY_AVAILABLE_CASH);
    if (raw == null) return null;
    try { const v = JSON.parse(raw); return typeof v === 'number' ? v : null; } catch { return null; }
  });

  // ── Persist ──────────────────────────────────────────────────────────────────
  useEffect(() => { save(KEY_TERM, termYears); }, [termYears]);
  useEffect(() => { save(KEY_SALARY, salary); }, [salary]);
  useEffect(() => { save(KEY_BONUS_AMT, bonusAmount); }, [bonusAmount]);
  useEffect(() => { save(KEY_OT_AMT, overtimeAmount); }, [overtimeAmount]);
  useEffect(() => { save(KEY_DEBT, monthlyDebt); }, [monthlyDebt]);
  useEffect(() => { save(KEY_PROFESSIONAL, professionalOverride); }, [professionalOverride]);
  useEffect(() => { save(KEY_JOINT, isJoint); }, [isJoint]);
  useEffect(() => { save(KEY_PARTNER, partnerSalary); }, [partnerSalary]);
  useEffect(() => { save(KEY_SCENARIO, scenario); }, [scenario]);
  useEffect(() => { save(KEY_PRICE, propertyPrice); }, [propertyPrice]);
  useEffect(() => { save(KEY_DEPOSIT_PCT, depositPct); }, [depositPct]);
  useEffect(() => { save(KEY_AVAILABLE_CASH, availableCash); }, [availableCash]);

  // ── Term ─────────────────────────────────────────────────────────────────────
  const updateTerm = useCallback((yrs: number) => {
    if (TERM_OPTIONS.includes(yrs as typeof TERM_OPTIONS[number])) _setTermYears(yrs);
  }, []);

  // ── Professional toggle ───────────────────────────────────────────────────────
  /**
   * Cycles professional override:
   *   null (auto) → true (force on) → false (force off) → null (auto)
   */
  const cycleProfessionalOverride = useCallback(() => {
    setProfessionalOverride(prev => {
      if (prev === null) return true;
      if (prev === true)  return false;
      return null;
    });
  }, []);

  // ── Floor 1 result ───────────────────────────────────────────────────────────
  const borrowing: IOCResult = useMemo(
    () =>
      calcMaxMortgageFromIncome({
        salary, bonusAmount, overtimeAmount,
        partnerSalary: isJoint ? partnerSalary : 0,
        isJoint,
        isProfessional,
        monthlyDebt,
        annualRate: liveRate,
        termYears,
      }),
    [salary, bonusAmount, overtimeAmount, partnerSalary, isJoint, isProfessional, monthlyDebt, liveRate, termYears]
  );

  // Effective income for tier display
  const effectiveIncome = useMemo(() => {
    const main = salary + bonusAmount + overtimeAmount * 0.5;
    const partner = isJoint ? partnerSalary : 0;
    return main + partner;
  }, [salary, bonusAmount, overtimeAmount, partnerSalary, isJoint]);

  const activeTier = useMemo(() => getMultiplierTier(effectiveIncome), [effectiveIncome]);

  // ── Suggested property price (max mortgage + 10% headroom) ────────────────────
  const suggestedPrice = useMemo(
    () => suggestPropertyPrice(borrowing.maxMortgage),
    [borrowing.maxMortgage]
  );

  const effectivePrice = propertyPrice > 0 ? propertyPrice : suggestedPrice;

  // ── Floor 2 result ───────────────────────────────────────────────────────────
  const purchaseCosts: PurchaseCostBreakdown = useMemo(
    () => calcPurchaseCosts({ propertyPrice: effectivePrice, scenario, depositPct }),
    [effectivePrice, scenario, depositPct]
  );

  const cashStack: CashStackResult = useMemo(
    () => buildCashStack({ propertyPrice: effectivePrice, depositPct, scenario, availableCash }),
    [effectivePrice, depositPct, scenario, availableCash]
  );

  // ── Cash validation ──────────────────────────────────────────────────────────
  const hasCashGap = cashStack.gap != null && cashStack.gap > 0;

  return {
    // Floor 1 — Borrowing Engine
    salary, setSalary,
    bonusAmount, setBonusAmount,
    overtimeAmount, setOvertimeAmount,
    monthlyDebt, setMonthlyDebt,
    professionalOverride, cycleProfessionalOverride, isProfessional,
    isJoint, setIsJoint,
    partnerSalary, setPartnerSalary,
    borrowing,
    activeTier,
    effectiveIncome,
    // Floor 2 — Cash Assessment
    scenario, setScenario,
    propertyPrice, setPropertyPrice,
    depositPct, setDepositPct,
    availableCash, setAvailableCash,
    purchaseCosts,
    cashStack,
    hasCashGap,
    suggestedPrice,
    effectivePrice,
    // Shared
    termYears, updateTerm,
  };
}
