import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  PiggyBank,
  ExternalLink
} from 'lucide-react';
import { useAffordability } from '../hooks/useAffordability';
import LTVMatchBadge from './LTVMatchBadge';

interface AffordabilityNodeProps {
  propertyPrice: number;
  serviceCharge?: number;
  groundRent?: number;
  compact?: boolean;
}

const AffordabilityNode: React.FC<AffordabilityNodeProps> = ({
  propertyPrice,
  serviceCharge,
  groundRent,
  compact = true
}) => {
  const {
    getBudgetProfile,
    getLTVMatchScore,
    getAffordablePrice,
    monthlyBudget
  } = useAffordability();

  const budgetProfile = getBudgetProfile(propertyPrice);
  const ltvScore = getLTVMatchScore(propertyPrice);
  const maxAffordable = getAffordablePrice();

  const isWithinBudget = propertyPrice <= maxAffordable * 1.1; // 10% buffer
  const shortfall = Math.max(0, propertyPrice - maxAffordable);

  // Compact view - summary card linking to Affordability Settings
  if (compact) {
    return (
      <div className="p-6 bg-linear-card border border-linear-border rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest flex items-center gap-2">
            <Calculator size={14} className="text-blue-400" />
            Affordability
          </h3>
          <Link
            to="/affordability"
            className="flex items-center gap-1.5 text-[9px] font-bold text-linear-accent hover:text-white transition-colors uppercase tracking-widest"
          >
            Configure
            <ExternalLink size={10} />
          </Link>
        </div>

        {/* Quick Metrics — FE-218: Responsive grid, 1 col on mobile, 2 on sm+ */}
        {/* FE-260: Show dual constraint — income-based ceiling + budget ceiling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Monthly Payment */}
          <div>
            <div className="text-[11px] text-linear-text-muted uppercase tracking-wider mb-1">Monthly Payment</div>
            <div className="text-lg font-bold text-white tracking-tight">£{budgetProfile.monthlyPayment.toLocaleString()}</div>
          </div>
          {/* Binding Constraint — FE-260: income vs budget dual display */}
          <div>
            <div className="text-[11px] text-linear-text-muted uppercase tracking-wider mb-1">Income Ceiling</div>
            {(() => {
              const incomeCeiling = (() => {
                const stored = localStorage.getItem('propSearch_income_salary');
                if (!stored) return null;
                const salary = JSON.parse(stored);
                if (!salary || salary <= 0) return null;
                const bonusStored = localStorage.getItem('propSearch_income_bonus_amt');
                const bonus = bonusStored ? JSON.parse(bonusStored) : 0;
                const income = salary + (bonus || 0);
                const tiers = [
                  { maxIncome: 25000, std: 4.5 }, { maxIncome: 50000, std: 4.75 },
                  { maxIncome: 75000, std: 5.0 }, { maxIncome: 100000, std: 5.25 }, { maxIncome: Infinity, std: 5.5 }
                ];
                const tier = tiers.find(t => income <= t.maxIncome) ?? tiers[tiers.length - 1];
                return income * tier.std;
              })();
              if (incomeCeiling == null) {
                return <div className="text-[10px] text-linear-text-muted/60 italic">Not configured</div>;
              }
              const binding = incomeCeiling < maxAffordable ? incomeCeiling : maxAffordable;
              const isBinding = incomeCeiling < maxAffordable;
              return (
                <div className="flex items-center gap-1.5">
                  <div className="text-lg font-bold tracking-tight" style={{ color: isBinding ? '#22c55e' : '#f59e0b' }}>
                    £{(binding / 1000).toFixed(0)}K
                  </div>
                  <div className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                    isBinding
                      ? 'bg-retro-green/10 border-retro-green/20 text-retro-green'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {isBinding ? 'BINDING' : 'BUDGET'}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Budget Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-linear-text-muted font-bold uppercase tracking-wider">Your Budget</span>
            <span className="text-white font-bold">£{monthlyBudget.toLocaleString()}/mo</span>
          </div>
          <div className="h-2 bg-linear-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (propertyPrice / maxAffordable) * 100)}%`,
                backgroundColor: isWithinBudget ? '#22c55e' : '#ef4444'
              }}
            />
          </div>
        </div>

        {/* Verdict */}
        <div className="flex items-center gap-2">
          {isWithinBudget ? (
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${
              isWithinBudget ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isWithinBudget ? 'Within Budget' : 'Above Budget'}
            </span>
            {shortfall > 0 && (
              <span className="text-[9px] text-linear-text-muted ml-2">
                Shortfall: £{shortfall.toLocaleString()}
              </span>
            )}
          </div>
          <LTVMatchBadge score={ltvScore} size="sm" />
        </div>
      </div>
    );
  }

  // Full view - the original expanded node
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest flex items-center gap-2">
          <Calculator size={14} className="text-blue-400" />
          Affordability Analysis
        </h3>
        <LTVMatchBadge score={ltvScore} size="md" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-linear-bg rounded-xl border border-linear-border">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={12} className="text-blue-400" />
            <span className="text-[11px] font-bold text-linear-text-muted uppercase tracking-wider">
              Monthly Payment
            </span>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            £{budgetProfile.monthlyPayment.toLocaleString()}
          </div>
          <div className="text-[9px] text-linear-text-muted mt-1">
            {budgetProfile.ltvBand} LTV
          </div>
        </div>

        <div className="p-4 bg-linear-bg rounded-xl border border-linear-border">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank size={12} className="text-emerald-400" />
            <span className="text-[11px] font-bold text-linear-text-muted uppercase tracking-wider">
              Deposit Required
            </span>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            £{budgetProfile.deposit.toLocaleString()}
          </div>
          <div className="text-[9px] text-linear-text-muted mt-1">
            {((budgetProfile.deposit / propertyPrice) * 100).toFixed(1)}% of property value
          </div>
        </div>
      </div>

      {/* Budget vs Affordability */}
      {/* FE-260: Add income-based constraint comparison */}
      <div className="p-4 bg-linear-card rounded-xl border border-linear-border">
        <div className="space-y-3">
          {/* Income-based constraint */}
          {(() => {
            const incomeCeiling = (() => {
              const stored = localStorage.getItem('propSearch_income_salary');
              if (!stored) return null;
              const salary = JSON.parse(stored);
              if (!salary || salary <= 0) return null;
              const bonusStored = localStorage.getItem('propSearch_income_bonus_amt');
              const bonus = bonusStored ? JSON.parse(bonusStored) : 0;
              const income = salary + (bonus || 0);
              const tiers = [
                { maxIncome: 25000, std: 4.5 }, { maxIncome: 50000, std: 4.75 },
                { maxIncome: 75000, std: 5.0 }, { maxIncome: 100000, std: 5.25 }, { maxIncome: Infinity, std: 5.5 }
              ];
              const tier = tiers.find(t => income <= t.maxIncome) ?? tiers[tiers.length - 1];
              return income * tier.std;
            })();
            if (incomeCeiling != null) {
              const binding = incomeCeiling < maxAffordable ? 'income' : 'budget';
              return (
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-linear-text-muted font-bold uppercase tracking-wider">
                      Income Ceiling
                    </span>
                    <span className="font-bold" style={{ color: binding === 'income' ? '#22c55e' : '#f59e0b' }}>
                      £{incomeCeiling.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[8px] text-linear-text-muted/60 mb-2">
                    {binding === 'income' ? 'BINDING — limits you below budget ceiling' : 'Budget is binding — income ceiling is higher'}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Budget max */}
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-linear-text-muted font-bold uppercase tracking-wider">Budget Ceiling</span>
              <span className="text-white font-bold">£{maxAffordable.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-linear-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (propertyPrice / maxAffordable) * 100)}%`,
                  backgroundColor: isWithinBudget ? '#22c55e' : '#ef4444'
                }}
              />
            </div>
          </div>

          <div className="flex justify-between text-[10px]">
            <span className="text-linear-text-muted font-bold uppercase tracking-wider">Property</span>
            <span className="text-white font-bold">£{propertyPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Affordability Verdict */}
      <div className={`
        p-4 rounded-xl border flex items-center gap-3
        ${isWithinBudget
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-rose-500/5 border-rose-500/20'
        }
      `}>
        {isWithinBudget ? (
          <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
        ) : (
          <AlertTriangle size={20} className="text-rose-400 flex-shrink-0" />
        )}
        <div className="flex-1">
          <div className={`text-xs font-bold uppercase tracking-widest ${
            isWithinBudget ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isWithinBudget ? 'Within Budget' : 'Above Budget'}
          </div>
          {shortfall > 0 && (
            <div className="text-[10px] text-linear-text-muted mt-0.5">
              Shortfall: £{shortfall.toLocaleString()} ({((shortfall / propertyPrice) * 100).toFixed(1)}% more needed)
            </div>
          )}
        </div>
      </div>

      {/* Running Costs Context */}
      <div className="p-4 bg-linear-bg rounded-xl border border-linear-border">
        <div className="text-[11px] font-bold text-linear-text-muted uppercase tracking-widest mb-3">
          Monthly Carry (after mortgage)
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-linear-text-muted uppercase tracking-wider">Service Charge</div>
            <div className="text-sm font-bold text-white">
              {serviceCharge != null ? `£${(serviceCharge / 12).toLocaleString()}` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-linear-text-muted uppercase tracking-wider">Ground Rent</div>
            <div className="text-sm font-bold text-white">
              {groundRent != null ? `£${(groundRent / 12).toLocaleString()}` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Link to Settings */}
      <Link
        to="/affordability"
        className="flex items-center justify-center gap-2 w-full py-3 bg-linear-bg border border-linear-border rounded-xl text-xs font-bold text-linear-text-muted hover:text-white hover:border-linear-accent transition-colors"
      >
        <ExternalLink size={12} />
        Configure Affordability Settings
      </Link>
    </div>
  );
};

export default AffordabilityNode;
