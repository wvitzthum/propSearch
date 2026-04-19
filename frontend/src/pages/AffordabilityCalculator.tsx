/**
 * AffordabilityCalculator.tsx — Assembles Floor 1 + Floor 2, wires live rates
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { useFinancialData } from '../hooks/useFinancialData';
import { extractValue } from '../types/macro';
import BorrowingEngine from '../components/BorrowingEngine';
import CashAssessment from '../components/CashAssessment';
import PurchasingPowerChart from '../components/PurchasingPowerChart';
import LoadingNode from '../components/LoadingNode';

const AffordabilityCalculator: React.FC = () => {
  const { macroData, loading } = useFinancialData();
  const [ppExpanded, setPpExpanded] = useState(false);

  const liveRate = (() => {
    if (!macroData) return 4.55;
    const r = macroData.economic_indicators?.mortgage_rates?.['90_ltv_5yr_fixed'];
    return extractValue(r) ?? 4.55;
  })();

  const {
    salary, setSalary,
    bonusAmount, setBonusAmount,
    overtimeAmount, setOvertimeAmount,
    monthlyDebt, setMonthlyDebt,
    professionalOverride, cycleProfessionalOverride, isProfessional,
    isJoint, setIsJoint,
    partnerSalary, setPartnerSalary,
    termYears, updateTerm,
    borrowing,
    activeTier,
    effectiveIncome,
    scenario, setScenario,
    propertyPrice, setPropertyPrice,
    depositPct, setDepositPct,
    availableCash, setAvailableCash,
    cashStack,
    suggestedPrice,
    effectivePrice,
  } = useAffordabilityCalculator(liveRate);

  if (loading) {
    return <LoadingNode label="Loading rates…" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Affordability Calculator</h1>
          <p className="text-[10px] text-linear-text-muted mt-0.5">
            Two-floor model: borrowing capacity (Floor 1) + cash required (Floor 2)
          </p>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">Live 5yr Fixed Rate</div>
          <div className="text-sm font-black text-linear-accent">{liveRate.toFixed(2)}%</div>
          <Link to="/rates" className="text-[8px] text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center justify-end gap-0.5 mt-0.5">
            View rate history <ExternalLink size={7} />
          </Link>
        </div>
      </div>

      {/* Two-floor layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Floor 1: Borrowing Engine */}
        <BorrowingEngine
          salary={salary} setSalary={setSalary}
          bonusAmount={bonusAmount} setBonusAmount={setBonusAmount}
          overtimeAmount={overtimeAmount} setOvertimeAmount={setOvertimeAmount}
          monthlyDebt={monthlyDebt} setMonthlyDebt={setMonthlyDebt}
          isJoint={isJoint} setIsJoint={setIsJoint}
          partnerSalary={partnerSalary} setPartnerSalary={setPartnerSalary}
          professionalOverride={professionalOverride}
          cycleProfessionalOverride={cycleProfessionalOverride}
          isProfessional={isProfessional}
          termYears={termYears} updateTerm={updateTerm}
          borrowing={borrowing}
          activeTier={activeTier}
          effectiveIncome={effectiveIncome}
        />

        {/* Floor 2: Cash Assessment */}
        <CashAssessment
          scenario={scenario} setScenario={setScenario}
          propertyPrice={propertyPrice} setPropertyPrice={setPropertyPrice}
          depositPct={depositPct} setDepositPct={setDepositPct}
          availableCash={availableCash} setAvailableCash={setAvailableCash}
          cashStack={cashStack}
          suggestedPrice={suggestedPrice}
          effectivePrice={effectivePrice}
        />
      </div>

      {/* FE-271: Purchasing Power History — collapsible chart below Floor 2 */}
      {/* Collapsible section */}
      <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setPpExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">
              Purchasing Power History
            </span>
            <span className="text-[9px] text-white/40">how mortgage power has shifted over time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white/40 text-xs">{ppExpanded ? '▲' : '▼'}</span>
          </div>
        </button>
        {ppExpanded && (
          <div className="px-5 pb-5">
            <PurchasingPowerChart
              monthlyBudget={borrowing.maxPayment}
              termYears={termYears}
            />
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <div className="text-center text-[8px] text-linear-text-muted/40 leading-relaxed">
        SDLT rates based on HMRC thresholds effective April 2025. Rates may vary — consult HMRC or a mortgage broker.
      </div>
    </div>
  );
};

export default AffordabilityCalculator;
