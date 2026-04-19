/**
 * BorrowingEngine.tsx — Floor 1: income → max mortgage hero number
 */
import React, { useCallback } from 'react';
import { TrendingUp, Users, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import type { IOCResult, MultiplierTier } from '../utils/affordability';
import { TERM_OPTIONS } from '../hooks/useAffordabilityCalculator';

// ── SliderField ────────────────────────────────────────────────────────────────
interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  formatValue: (v: number) => string;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

const SliderField: React.FC<SliderFieldProps> = ({
  label, value, min, max, step = 1000,
  formatValue, onChange, icon, disabled = false,
}) => {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div className={`space-y-2 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">{icon}
          <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-sm font-bold tracking-tight text-white">{formatValue(value)}</span>
      </div>
      <div className="relative h-1.5 bg-linear-bg rounded-full overflow-hidden">
        <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-100" style={{ width: `${pct}%` }} />
        <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
      </div>
      <div className="flex justify-between text-[8px] text-linear-text-muted/60">
        <span>{formatValue(min)}</span><span>{formatValue(max)}</span>
      </div>
    </div>
  );
};

// ── TermSelector ──────────────────────────────────────────────────────────────
const TermSelector: React.FC<{ termYears: number; updateTerm: (yrs: number) => void }> = ({ termYears, updateTerm }) => (
  <div className="flex items-center gap-2">
    <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">Term</span>
    <div className="flex gap-0.5">
      {TERM_OPTIONS.map((yrs) => (
        <button key={yrs} onClick={() => updateTerm(yrs)}
          className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border
            ${termYears === yrs ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
              : 'bg-linear-bg border-linear-border text-linear-text-muted hover:text-white hover:border-blue-500/30'}`}>
          {yrs}yr
        </button>
      ))}
    </div>
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────
interface BorrowingEngineProps {
  salary: number; setSalary: (v: number) => void;
  bonusAmount: number; setBonusAmount: (v: number) => void;
  overtimeAmount: number; setOvertimeAmount: (v: number) => void;
  monthlyDebt: number; setMonthlyDebt: (v: number) => void;
  isJoint: boolean; setIsJoint: (v: boolean) => void;
  partnerSalary: number; setPartnerSalary: (v: number) => void;
  professionalOverride: boolean | null; cycleProfessionalOverride: () => void; isProfessional: boolean;
  termYears: number; updateTerm: (yrs: number) => void;
  borrowing: IOCResult; activeTier: MultiplierTier; effectiveIncome: number;
}

// ── Component ────────────────────────────────────────────────────────────────
const BorrowingEngine: React.FC<BorrowingEngineProps> = ({
  salary, setSalary, bonusAmount, setBonusAmount, overtimeAmount, setOvertimeAmount,
  monthlyDebt, setMonthlyDebt, isJoint, setIsJoint, partnerSalary, setPartnerSalary,
  professionalOverride, cycleProfessionalOverride, isProfessional,
  termYears, updateTerm, borrowing, activeTier, effectiveIncome,
}) => {
  const [showBonus, setShowBonus] = React.useState(false);
  const [showDebt, setShowDebt] = React.useState(false);
  const salaryPresets = [50000, 75000, 100000, 150000, 200000];

  const handleRevealCash = useCallback(() => {
    document.getElementById('cash-assessment')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-linear-border/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <TrendingUp size={15} />
          </div>
          <div>
            <div className="text-[10px] font-black text-white uppercase tracking-widest">Borrowing Engine</div>
            <div className="text-[9px] text-linear-text-muted">
              {isJoint ? 'Joint ' : ''}IOC income × {isProfessional ? activeTier.max : activeTier.std}× multiplier
            </div>
          </div>
        </div>
        {/* Hero */}
        <div className="text-center py-3">
          <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-1">Max. Mortgage</div>
          <div className="text-4xl font-black text-white tracking-tighter tabular-nums">
            {salary === 0 && effectiveIncome === 0
              ? <span className="text-linear-text-muted/40">—</span>
              : `£${(borrowing.maxMortgage / 1000).toFixed(0)}K`}
          </div>
          <div className="text-[9px] text-linear-text-muted/60 mt-1">
            {termYears}yr · {borrowing.multiplier.toFixed(2)}× · {isProfessional ? 'professional' : 'standard'} tier
          </div>
        </div>
        {/* Tier badge */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border
            ${isProfessional ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-linear-bg border-linear-border text-linear-text-muted'}`}>
            {activeTier.label} {isProfessional ? activeTier.max : activeTier.std}×
          </div>
          {effectiveIncome > 0 && <span className="text-[9px] text-linear-text-muted/60">£{(effectiveIncome / 1000).toFixed(0)}K combined</span>}
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 py-4 space-y-4">
        <SliderField label="Salary" value={salary} min={20000} max={500000} step={1000}
          formatValue={(v) => `£${v.toLocaleString()}`} onChange={setSalary}
          icon={<DollarSign size={10} className="text-linear-text-muted mr-0.5" />} />

        <div className="flex gap-1 flex-wrap">
          {salaryPresets.map((p) => (
            <button key={p} onClick={() => setSalary(p)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all border
                ${salary === p ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'bg-linear-bg border-linear-border text-linear-text-muted hover:text-white hover:border-blue-500/30'}`}>
              £{(p / 1000).toFixed(0)}K
            </button>
          ))}
        </div>

        {/* Bonus */}
        <div className="border-t border-linear-border/30 pt-3 space-y-2">
          <button onClick={() => setShowBonus(v => !v)}
            className="flex items-center gap-1.5 text-[9px] font-black text-linear-text-muted uppercase tracking-widest hover:text-white transition-colors">
            <span>Bonus / Overtime</span>{showBonus ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          {showBonus && (
            <div className="space-y-3 pl-1">
              <SliderField label="Annual Bonus" value={bonusAmount} min={0} max={200000} step={1000}
                formatValue={(v) => `£${v.toLocaleString()}`} onChange={setBonusAmount} />
              <SliderField label="Overtime (annual)" value={overtimeAmount} min={0} max={100000} step={500}
                formatValue={(v) => `£${v.toLocaleString()}`} onChange={setOvertimeAmount} />
            </div>
          )}
        </div>

        {/* Debt + Joint */}
        <div className="border-t border-linear-border/30 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowDebt(v => !v)}
              className="flex items-center gap-1.5 text-[9px] font-black text-linear-text-muted uppercase tracking-widest hover:text-white transition-colors">
              <span>Monthly Debt</span>{showDebt ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            <button onClick={() => { const next = !isJoint; setIsJoint(next); if (!next) setPartnerSalary(0); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all
                ${isJoint ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'bg-linear-bg border-linear-border text-linear-text-muted hover:text-white hover:border-blue-500/30'}`}>
              <Users size={10} />Joint
            </button>
          </div>
          {showDebt && (
            <div className="pl-1">
              <SliderField label="Monthly Debt Obligations" value={monthlyDebt} min={0} max={5000} step={50}
                formatValue={(v) => `£${v.toLocaleString()}/mo`} onChange={setMonthlyDebt} />
            </div>
          )}
        </div>

        {/* Partner salary */}
        {isJoint && (
          <div className="border-t border-linear-border/30 pt-3 space-y-2">
            <SliderField label="Partner Salary" value={partnerSalary} min={0} max={500000} step={1000}
              formatValue={(v) => `£${v.toLocaleString()}`} onChange={setPartnerSalary} />
          </div>
        )}

        {/* Professional */}
        <div className="border-t border-linear-border/30 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">Professional</span>
            <button onClick={cycleProfessionalOverride}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all hover:border-blue-500/50 hover:text-blue-300
                ${isProfessional ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : professionalOverride === false ? 'bg-linear-bg border-linear-border text-linear-text-muted/60'
                  : 'bg-linear-bg border-linear-border text-linear-text-muted/40'}`}>
              {professionalOverride === null ? 'Auto' : professionalOverride ? 'On' : 'Off'}
            </button>
            {professionalOverride === null && !isProfessional && <span className="text-[8px] text-linear-text-muted/50">activates at £75K+</span>}
          </div>
        </div>

        <TermSelector termYears={termYears} updateTerm={updateTerm} />
      </div>

      {/* Reveal Cash Assessment */}
      <div className="px-5 pb-5">
        <button onClick={handleRevealCash}
          className="w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest
            bg-blue-500/20 border border-blue-500/40 text-blue-400
            hover:bg-blue-500/30 hover:border-blue-500/60 hover:text-blue-300 active:scale-[0.99] transition-all">
          Reveal Cash Assessment ↓
        </button>
      </div>
    </div>
  );
};

export default BorrowingEngine;
