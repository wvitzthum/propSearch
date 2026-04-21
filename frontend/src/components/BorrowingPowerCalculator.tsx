// FE-257: BorrowingPowerCalculator — income-to-maximum-loan component
// Multiplier tiers based on PO-006 specs (DE-230 pending)
import React, { useState, useCallback, useMemo } from 'react';
import { Briefcase, ChevronDown, ChevronUp, Calculator } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
type IncomeType = 'employed' | 'self_employed' | 'contractor';
type SingleOrJoint = 'single' | 'joint';

interface IncomeInputs {
  salary: number;
  bonusPct: number;        // % of salary
  bonusAmount: number;     // explicit £ amount (overrides bonusPct)
  overtimeAmount: number;  // £/yr
  incomeType: IncomeType;
  partnerSalary: number;   // 0 if single
}
interface LoanResults {
  min: number;   // conservative (4.0× for stressed rates)
  std: number;   // typical bank offer (uses tier multiplier)
  max: number;   // high earner factor (tier max × 1.05 for bonus-regular earners)
  capAtBudget: number;    // from monthlyBudget constraint
}

// ── Storage keys ──────────────────────────────────────────────────────────────
const SALARY_KEY = 'propSearch_income_salary';
const BONUS_PCT_KEY = 'propSearch_income_bonus_pct';
const BONUS_AMT_KEY = 'propSearch_income_bonus_amt';
const OVERTIME_KEY = 'propSearch_income_overtime';
const INCOME_TYPE_KEY = 'propSearch_income_type';
const PARTNER_KEY = 'propSearch_income_partner';

// ── Multiplier tiers (PO-006 / FE-257 task notes) ──────────────────────────────
const MULTIPLIER_TIERS = [
  { maxIncome: 25000,  std: 4.5,  max: 4.75, label: 'Basic' },
  { maxIncome: 50000,  std: 4.75, max: 5.0,  label: 'Standard' },
  { maxIncome: 75000,  std: 5.0,  max: 5.25, label: 'Mid' },
  { maxIncome: 100000, std: 5.25, max: 5.5,  label: 'Upper-Mid' },
  { maxIncome: Infinity,std: 5.5,  max: 6.0,  label: 'High Earner' },
] as const;

function getTier(income: number) {
  return MULTIPLIER_TIERS.find(t => income <= t.maxIncome) ?? MULTIPLIER_TIERS[MULTIPLIER_TIERS.length - 1];
}

// ── Gross annual income calculator ──────────────────────────────────────────────
function calcGrossIncome(inputs: IncomeInputs): { base: number; bonus: number; ot: number; total: number } {
  const base = inputs.salary;
  // Bonus: use explicit amount if provided, otherwise % of salary
  const bonus = inputs.bonusAmount > 0 ? inputs.bonusAmount : base * (inputs.bonusPct / 100);
  // Overtime: include 50% (consistent over 2yr assumption)
  const ot = inputs.overtimeAmount * 0.5;
  return { base, bonus, ot, total: base + bonus + ot };
}

// ── Monthly budget constraint (reverse mortgage formula) ──────────────────────
function calcBudgetCap(monthlyBudget: number, rate = 4.55, years = 25): number {
  const r = rate / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthlyBudget * n;
  const pvf = (1 - Math.pow(1 + r, -n)) / r;
  return monthlyBudget * pvf;
}

// ── Stress test: rate + 3pp, minimum 6.5% ──────────────────────────────────────
function calcStressMaxLoan(income: number, tierStd: number, rate = 4.55): number {
  const stressRate = Math.max(rate + 3, 6.5);
  // Stress-test the payment: can they afford the stressed rate on same loan?
  const maxLoanAtStress = calcBudgetCap(income * tierStd / 25, stressRate);
  return Math.min(income * tierStd, maxLoanAtStress);
}

// ── Main Component ─────────────────────────────────────────────────────────────
interface Props {
  monthlyBudget: number;  // from useAffordability
  onClose?: () => void;
}

const BorrowingPowerCalculator: React.FC<Props> = ({ monthlyBudget, onClose }) => {
  const [expanded, setExpanded] = useState(false);
  const [joint, setJoint] = useState<SingleOrJoint>(() =>
    localStorage.getItem('propSearch_income_joint') === 'true' ? 'joint' : 'single'
  );

  const [salary, setSalary] = useState<number>(() => {
    const s = localStorage.getItem(SALARY_KEY);
    return s ? JSON.parse(s) : 0;
  });
  const [bonusPct] = useState<number>(() => {
    const s = localStorage.getItem(BONUS_PCT_KEY);
    return s ? JSON.parse(s) : 0;
  });
  const [bonusAmount, setBonusAmount] = useState<number>(() => {
    const s = localStorage.getItem(BONUS_AMT_KEY);
    return s ? JSON.parse(s) : 0;
  });
  const [overtimeAmount, setOvertimeAmount] = useState<number>(() => {
    const s = localStorage.getItem(OVERTIME_KEY);
    return s ? JSON.parse(s) : 0;
  });
  const [incomeType, setIncomeType] = useState<IncomeType>(() => {
    const s = localStorage.getItem(INCOME_TYPE_KEY);
    return (s ? JSON.parse(s) : 'employed') as IncomeType;
  });
  const [partnerSalary, setPartnerSalary] = useState<number>(() => {
    const s = localStorage.getItem(PARTNER_KEY);
    return s ? JSON.parse(s) : 0;
  });

  // Persist on change
  const persist = useCallback((key: string, val: unknown) => {
    localStorage.setItem(key, JSON.stringify(val));
  }, []);

  const handleSalary = (v: number) => { setSalary(v); persist(SALARY_KEY, v); };
  const handleBonusAmt = (v: number) => { setBonusAmount(v); persist(BONUS_AMT_KEY, v); };
  const handleOvertime = (v: number) => { setOvertimeAmount(v); persist(OVERTIME_KEY, v); };
  const handleIncomeType = (v: IncomeType) => { setIncomeType(v); persist(INCOME_TYPE_KEY, v); };
  const handlePartner = (v: number) => { setPartnerSalary(v); persist(PARTNER_KEY, v); };
  const handleJoint = (v: SingleOrJoint) => {
    setJoint(v);
    localStorage.setItem('propSearch_income_joint', JSON.stringify(v === 'joint'));
  };

  // Calculate results
  const results = useMemo<LoanResults | null>(() => {
    if (salary <= 0 && partnerSalary <= 0) return null;

    const getCalc = (sal: number, bonusAmt: number, otAmt: number) => {
      const inc: IncomeInputs = {
        salary: sal, bonusPct: 0, bonusAmount: bonusAmt, overtimeAmount: otAmt,
        incomeType, partnerSalary: 0
      };
      const { total } = calcGrossIncome(inc);
      const tier = getTier(total);
      const std = total * tier.std;
      const max = total * tier.max;
      const min = calcStressMaxLoan(total, tier.std, 4.55);
      return { min, std, max };
    };

    if (joint && partnerSalary > 0) {
      const mainCalc = getCalc(salary, bonusAmount, overtimeAmount);
      const { total: pTotal } = calcGrossIncome({ salary: partnerSalary, bonusPct: 0, bonusAmount: 0, overtimeAmount: 0, incomeType: 'employed', partnerSalary: 0 });
      const combinedTotal = mainCalc.max + pTotal;
      const combinedTier = getTier(combinedTotal);
      const combinedStd = combinedTotal * Math.min(combinedTier.std + 0.25, 5.5);
      const combinedMax = combinedTotal * Math.min(combinedTier.max + 0.25, 6.0);
      const combinedMin = calcStressMaxLoan(combinedTotal, combinedTier.std, 4.55);
      const budgetCap = calcBudgetCap(monthlyBudget);
      return { min: combinedMin, std: combinedStd, max: combinedMax, capAtBudget: budgetCap };
    } else {
      const mainCalc = getCalc(salary, bonusAmount, overtimeAmount);
      const budgetCap = calcBudgetCap(monthlyBudget);
      return { min: mainCalc.min, std: mainCalc.std, max: mainCalc.max, capAtBudget: budgetCap };
    }
  }, [salary, bonusPct, bonusAmount, overtimeAmount, incomeType, partnerSalary, joint, monthlyBudget]);

  const bindingConstraint = results
    ? (results.capAtBudget < results.std ? 'budget' : 'income')
    : null;

  const hasInput = salary > 0 || partnerSalary > 0;

  // ── Expanded inputs view ──────────────────────────────────────────────────
  if (expanded) {
    return (
      <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-linear-border flex items-center justify-between bg-linear-card/50">
          <div className="flex items-center gap-2">
            <Briefcase size={14} className="text-blue-400" />
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Income Details</h3>
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <button onClick={onClose} className="text-[10px] text-linear-text-muted hover:text-white uppercase tracking-widest font-bold">
                Close
              </button>
            )}
            <button onClick={() => setExpanded(false)} className="text-linear-text-muted hover:text-white">
              <ChevronUp size={14} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Joint toggle */}
          <div className="flex bg-linear-bg rounded-xl border border-linear-border p-1 gap-1">
            {(['single', 'joint'] as SingleOrJoint[]).map(mode => (
              <button
                key={mode}
                onClick={() => handleJoint(mode)}
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  joint === mode ? 'bg-blue-500 text-white' : 'text-linear-text-muted hover:text-white'
                }`}
              >
                {mode === 'single' ? 'Individual' : 'Joint Mortgage'}
              </button>
            ))}
          </div>

          {/* Main income */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1 block">
                {joint ? 'Applicant' : ''} Annual Salary (£)
              </label>
              <input
                type="number"
                value={salary || ''}
                onChange={e => handleSalary(Number(e.target.value))}
                placeholder="75000"
                className="w-full bg-linear-bg border border-linear-border rounded-lg px-3 py-2.5 text-sm font-bold text-white placeholder-linear-text-muted/30 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1 block">Bonus (£/yr)</label>
              <input
                type="number"
                value={bonusAmount || ''}
                onChange={e => handleBonusAmt(Number(e.target.value))}
                placeholder="10000"
                className="w-full bg-linear-bg border border-linear-border rounded-lg px-3 py-2.5 text-sm font-bold text-white placeholder-linear-text-muted/30 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1 block">Overtime/Commission (£/yr)</label>
              <input
                type="number"
                value={overtimeAmount || ''}
                onChange={e => handleOvertime(Number(e.target.value))}
                placeholder="5000"
                className="w-full bg-linear-bg border border-linear-border rounded-lg px-3 py-2.5 text-sm font-bold text-white placeholder-linear-text-muted/30 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1 block">Employment Type</label>
              <select
                value={incomeType}
                onChange={e => handleIncomeType(e.target.value as IncomeType)}
                className="w-full bg-linear-bg border border-linear-border rounded-lg px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="employed">Employed (PAYE)</option>
                <option value="self_employed">Self-Employed (SA302)</option>
                <option value="contractor">Contractor/IR35</option>
              </select>
            </div>
          </div>

          {/* Partner salary (joint only) */}
          {joint && (
            <div>
              <label className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1 block">Partner Annual Salary (£)</label>
              <input
                type="number"
                value={partnerSalary || ''}
                onChange={e => handlePartner(Number(e.target.value))}
                placeholder="50000"
                className="w-full bg-linear-bg border border-linear-border rounded-lg px-3 py-2.5 text-sm font-bold text-white placeholder-linear-text-muted/30 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          )}

          {/* Multiplier tier info */}
          {hasInput && results && (
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-2">Your Multiplier Tier</div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {MULTIPLIER_TIERS.map(tier => {
                  const { total } = calcGrossIncome({ salary, bonusPct, bonusAmount, overtimeAmount, incomeType, partnerSalary: 0 });
                  const isActive = total > 0 && total <= tier.maxIncome && (tier === MULTIPLIER_TIERS.find(tt => total <= tt.maxIncome));
                  return (
                    <div key={tier.label} className={`p-2 rounded-lg border text-center ${isActive ? 'bg-blue-500/20 border-blue-500/40' : 'bg-linear-bg border-linear-border opacity-50'}`}>
                      <div className={`font-black uppercase ${isActive ? 'text-blue-400' : 'text-linear-text-muted'}`}>{tier.label}</div>
                      <div className={`font-bold ${isActive ? 'text-white' : 'text-linear-text-muted'}`}>{tier.std}×–{tier.max}×</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Loan Estimates</div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Conservative', val: results.min, color: '#ef4444', sub: 'Stress test (+3pp)' },
                  { label: 'Standard', val: results.std, color: '#3b82f6', sub: 'Typical offer' },
                  { label: 'Max (High Earner)', val: results.max, color: '#a855f7', sub: 'Best case' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl border" style={{ borderColor: `${item.color}30`, backgroundColor: `${item.color}08` }}>
                    <div className="text-[8px] font-black uppercase" style={{ color: item.color }}>{item.label}</div>
                    <div className="text-lg font-bold text-white tracking-tight mt-1">£{(item.val / 1000).toFixed(0)}K</div>
                    <div className="text-[8px] text-linear-text-muted/60 mt-0.5">{item.sub}</div>
                  </div>
                ))}
              </div>
              {/* Binding constraint */}
              {bindingConstraint && (
                <div className={`p-3 rounded-xl border ${
                  bindingConstraint === 'budget'
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-retro-green/5 border-retro-green/20'
                }`}>
                  <div className="text-[9px] font-black uppercase" style={{
                    color: bindingConstraint === 'budget' ? '#f59e0b' : '#22c55e'
                  }}>
                    Binding Constraint: {bindingConstraint === 'budget' ? 'Budget Limits You' : 'Income Limits You'}
                  </div>
                  <div className="text-[10px] text-linear-text-muted mt-1">
                    {bindingConstraint === 'budget'
                      ? `Your budget caps borrowing at £${(results.capAtBudget / 1000).toFixed(0)}K — below the income-based max of £${(results.std / 1000).toFixed(0)}K`
                      : `Income-based max is lower than budget — your borrowing power is the binding constraint`
                    }
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Collapsed hero view ────────────────────────────────────────────────────
  return (
    <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
      {/* Clickable header — expand inputs */}
      <button
        onClick={() => setExpanded(true)}
        className="w-full p-4 flex items-center justify-between hover:bg-linear-bg/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Calculator size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Your Borrowing Power</div>
            {hasInput && results ? (
              <>
                <div className="text-xl font-black text-white tracking-tighter mt-0.5">
                  Up to <span className="text-blue-400">£{(results.std / 1000).toFixed(0)}K</span>
                </div>
                {/* UX-61: Show income inputs summary in collapsed view */}
                <div className="text-[9px] text-linear-text-muted font-mono mt-0.5">
                  {salary > 0 && `Salary: £${salary.toLocaleString()}`}
                  {bonusAmount > 0 && ` · Bonus: £${bonusAmount.toLocaleString()}`}
                  {' · '}{incomeType === 'employed' ? 'PAYE' : incomeType === 'self_employed' ? 'SA302' : 'IR35'}
                  {joint && partnerSalary > 0 && ` · Partner: £${partnerSalary.toLocaleString()}`}
                </div>
              </>
            ) : salary <= 0 && partnerSalary > 0 ? (
              <>
                <div className="text-[11px] text-linear-text-muted mt-0.5">Enter income to calculate</div>
                <div className="text-[9px] text-linear-text-muted font-mono mt-0.5">
                  {`Partner: £${partnerSalary.toLocaleString()} · ${incomeType === 'employed' ? 'PAYE' : incomeType === 'self_employed' ? 'SA302' : 'IR35'}`}
                </div>
              </>
            ) : (
              <div className="text-[11px] text-linear-text-muted mt-0.5">Enter income to calculate</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasInput && results && (
            <div className="text-right">
              <div className="text-[8px] font-bold uppercase" style={{
                color: bindingConstraint === 'budget' ? '#f59e0b' : '#22c55e'
              }}>
                {bindingConstraint === 'budget' ? 'Budget-limited' : 'Income-limited'}
              </div>
            </div>
          )}
          <ChevronDown size={16} className="text-linear-text-muted" />
        </div>
      </button>
    </div>
  );
};

export default BorrowingPowerCalculator;
