import React from 'react';
import { Calculator, TrendingUp, Shield, FileText, CreditCard, Info } from 'lucide-react';
import type { TotalPurchaseCost } from '../hooks/useAffordability';

interface AdditionalCostsCardProps {
  costs: TotalPurchaseCost;
  compact?: boolean;
}

const AdditionalCostsCard: React.FC<AdditionalCostsCardProps> = ({
  costs,
  compact = false,
}) => {
  const rows = [
    {
      icon: <TrendingUp size={12} className="text-blue-400" />,
      label: 'Deposit',
      value: costs.deposit,
      subLabel: `${costs.depositPct}% of price`,
      accent: 'text-white',
    },
    {
      icon: <Shield size={12} className="text-rose-400" />,
      label: 'SDLT',
      value: costs.sdlt,
      subLabel: costs.sdltBand,
      accent: costs.isFtB ? 'text-emerald-400' : 'text-rose-400',
    },
    {
      icon: <FileText size={12} className="text-purple-400" />,
      label: 'Solicitor + Disb.',
      value: costs.solicitorFees,
      subLabel: 'Legal & searches',
      accent: 'text-white',
    },
    {
      icon: <Calculator size={12} className="text-amber-400" />,
      label: 'Survey',
      value: costs.surveyFees,
      subLabel: 'RICS HomeBuyer Report',
      accent: 'text-white',
    },
    {
      icon: <CreditCard size={12} className="text-emerald-400" />,
      label: 'Mortgage Arrangement',
      value: costs.mortgageFees,
      subLabel: 'Arrangement fee',
      accent: 'text-white',
    },
  ];

  if (compact) {
    return (
      <div className="p-4 bg-linear-card border border-linear-border rounded-xl space-y-2">
        <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">
          Additional Purchase Costs
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-linear-text-muted">SDLT</span>
          <span className="text-white font-medium">£{costs.sdlt.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-linear-text-muted">Solicitor</span>
          <span className="text-white font-medium">£{costs.solicitorFees.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-linear-text-muted">Survey</span>
          <span className="text-white font-medium">£{costs.surveyFees.toLocaleString()}</span>
        </div>
        <div className="pt-2 border-t border-linear-border flex justify-between">
          <span className="text-[10px] font-bold text-white">Total Cash Needed</span>
          <span className="text-[10px] font-bold text-linear-accent">
            £{costs.totalCashNeeded.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-linear-card border border-linear-border rounded-3xl overflow-hidden">
      <div className="p-5 border-b border-linear-border flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Calculator size={16} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">
            Additional Purchase Costs
          </h3>
          <p className="text-[9px] text-linear-text-muted">
            One-time costs beyond the deposit and mortgage
          </p>
        </div>
      </div>

      <div className="divide-y divide-linear-border">
        {rows.map((row) => (
          <div key={row.label} className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {row.icon}
              <div>
                <div className="text-[10px] font-bold text-white">{row.label}</div>
                <div className="text-[9px] text-linear-text-muted">{row.subLabel}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold ${row.accent}`}>
                £{row.value.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="p-5 space-y-3 bg-gradient-to-r from-linear-bg/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp size={12} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-white">Total Capital Required</div>
              <div className="text-[9px] text-linear-text-muted">Deposit + SDLT</div>
            </div>
          </div>
          <div className="text-lg font-bold text-white tracking-tight">
            £{costs.totalCapital.toLocaleString()}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-linear-border">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CreditCard size={12} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-white">Total Cash Needed at Completion</div>
              <div className="text-[9px] text-linear-text-muted">
                {costs.isFtB ? 'FTB relief applied' : 'Includes 3% additional property surcharge'}
              </div>
            </div>
          </div>
          <div className="text-xl font-bold text-linear-accent tracking-tight">
            £{costs.totalCashNeeded.toLocaleString()}
          </div>
        </div>

        {costs.sdlt > 0 && (
          <div className="flex items-start gap-2 p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl">
            <Info size={12} className="text-rose-400 mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-rose-300 leading-relaxed">
              SDLT of £{costs.sdlt.toLocaleString()} is payable on completion.{' '}
              {!costs.isFtB && 'FTB relief may reduce this if you have never owned property.'}
              {' '}This is a separate cash requirement on top of your deposit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdditionalCostsCard;
