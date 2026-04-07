// UX-032: Market Verdict hero — synthesizes all rate/market data into one actionable headline
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';
import { useAffordability } from '../hooks/useAffordability';

const MarketVerdict: React.FC = () => {
  const { data } = useMacroData();
  const { getAffordablePrice, monthlyBudget } = useAffordability();

  // Data from useMacroData — extract from ProvenanceOrValue types
  const mos = extractValue(data?.inventory_velocity?.months_of_supply) ?? 4.2;
  const swapTrend = data?.swap_rates?.trend_5yr ?? 'holding';
  // Buyer favour score derived from MOS
  const buyerFavourScore = mos > 6 ? 7 : mos < 4 ? 3 : 5;
  const currentRate = data?.swap_rates?.gbp_5yr ?? 4.55;

  // Verdict logic
  const verdict: 'BUYERS WINDOW' | 'NEUTRAL' | 'SELLERS MARKET' =
    (mos > 6 && swapTrend === 'falling') ? 'BUYERS WINDOW'
    : (mos < 4 && swapTrend === 'rising') ? 'SELLERS MARKET'
    : 'NEUTRAL';

  const verdictColor = verdict === 'BUYERS WINDOW' ? '#22c55e'
    : verdict === 'SELLERS MARKET' ? '#ef4444' : '#f59e0b';

  const VerdictIcon = verdict === 'BUYERS WINDOW' ? TrendingUp
    : verdict === 'SELLERS MARKET' ? TrendingDown : Minus;

  // Narrative
  const narrative = useMemo(() => {
    if (verdict === 'BUYERS WINDOW') {
      return 'BoE cuts underway. Favourable conditions for London prime acquisitions.';
    } else if (verdict === 'SELLERS MARKET') {
      return 'Seller-favourable conditions. Exercise caution on pricing.';
    }
    return 'Market in equilibrium. Monitor rate signals for shifts.';
  }, [verdict]);

  return (
    <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-linear-border bg-linear-card/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${verdictColor}20`, borderWidth: 1, borderColor: `${verdictColor}40`, borderStyle: 'solid' }}>
            <VerdictIcon size={16} style={{ color: verdictColor }} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: verdictColor }}>Market Verdict</div>
            <div className="text-xl font-bold text-white tracking-tight">{verdict}</div>
          </div>
        </div>
        <p className="text-[11px] text-linear-text-muted mt-2 leading-relaxed">{narrative}</p>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
        {/* MOS */}
        <div className="px-5 py-4">
          <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1">MOS</div>
          <div className="text-lg font-bold text-white tracking-tight">{mos.toFixed(1)}mo</div>
          <div className="text-[8px] text-linear-text-muted mt-0.5">Months of Supply</div>
        </div>

        {/* Rate Signal */}
        <div className="px-5 py-4">
          <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1">Rate Trend</div>
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-bold tracking-tight ${swapTrend === 'falling' ? 'text-emerald-400' : swapTrend === 'rising' ? 'text-rose-400' : 'text-linear-text-muted'}`}>
              {swapTrend === 'falling' ? 'FALLING' : swapTrend === 'rising' ? 'RISING' : 'HOLDING'}
            </span>
          </div>
          <div className="text-[8px] text-linear-text-muted mt-0.5">{currentRate.toFixed(2)}% 5yr swap</div>
        </div>

        {/* Buyer Favour Score */}
        <div className="px-5 py-4">
          <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1">Buyer Score</div>
          <div className="text-lg font-bold text-white tracking-tight">{buyerFavourScore.toFixed(0)}/10</div>
          <div className="mt-1.5 h-1.5 w-full bg-linear-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${buyerFavourScore * 10}%`, backgroundColor: buyerFavourScore >= 7 ? '#22c55e' : buyerFavourScore >= 4 ? '#f59e0b' : '#ef4444' }}
            />
          </div>
        </div>

        {/* Affordability Delta */}
        <div className="px-5 py-4">
          <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1">Max Loan</div>
          <div className="flex items-center gap-1.5">
            <DollarSign size={14} className="text-blue-400" />
            <span className="text-lg font-bold text-white tracking-tight">£{(getAffordablePrice() / 1000).toFixed(0)}K</span>
          </div>
          <div className="text-[8px] text-linear-text-muted mt-0.5">at £{monthlyBudget.toLocaleString()}/mo</div>
        </div>
      </div>
    </div>
  );
};

export default MarketVerdict;
