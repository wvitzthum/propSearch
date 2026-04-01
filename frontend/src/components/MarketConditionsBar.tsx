import React, { useMemo } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Zap,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';

interface MarketConditionsBarProps {
  compact?: boolean;
}

const MarketConditionsBar: React.FC<MarketConditionsBarProps> = ({ compact = false }) => {
  const { data } = useMacroData();

  // Derive Market Mode from Months of Supply
  const mos = extractValue(data?.inventory_velocity?.months_of_supply) ?? 4.2;
  const marketMode: 'BUYER' | 'NEUTRAL' | 'SELLER' = mos < 4 ? 'SELLER' : mos > 6 ? 'BUYER' : 'NEUTRAL';
  const marketModeColor = marketMode === 'BUYER' ? '#22c55e' : marketMode === 'SELLER' ? '#ef4444' : '#f59e0b';

  // Negotiation Room: positive discount = buyer's room
  const discount = Math.abs(extractValue(data?.negotiation_delta?.avg_discount_pct) ?? 0);

  // Seasonal buy score
  const seasonalScore = extractValue(data?.timing_signals?.seasonal_buy_score) ?? 5;

  // Composite Buyer Favour Score (0-10)
  const buyerFavourScore = useMemo(() => {
    let score = 5; // base
    if (mos < 4) score -= 1.5;      // seller's market hurts
    else if (mos > 6) score += 2;   // buyer's market helps
    score += (discount / 10) * 2;   // more negotiation room helps
    score += ((seasonalScore - 5) / 5) * 1.5; // seasonal contribution
    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  }, [mos, discount, seasonalScore]);

  const favourColor = buyerFavourScore >= 7 ? '#22c55e' : buyerFavourScore >= 4 ? '#f59e0b' : '#ef4444';

  // Rate Signal from swap trend
  const swapTrend = data?.swap_rates?.trend_5yr ?? 'holding';
  const RateIcon = swapTrend === 'rising' ? TrendingUp : swapTrend === 'falling' ? TrendingDown : Minus;
  const rateSignalLabel = swapTrend === 'rising' ? 'RISING' : swapTrend === 'falling' ? 'FALLING' : 'HOLDING';
  const rateSignalColor = swapTrend === 'rising' ? '#ef4444' : swapTrend === 'falling' ? '#22c55e' : '#a1a1aa';

  // MPC next meeting
  const mpcNext = data?.economic_indicators?.mpc_next_meeting ?? 'TBD';

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest" style={{ backgroundColor: `${marketModeColor}20`, color: marketModeColor, border: `1px solid ${marketModeColor}40` }}>
          {marketMode}
        </div>
        <div className="text-[8px] text-linear-text-muted">MOS {mos.toFixed(1)}</div>
        <div className="mx-1 text-linear-border">|</div>
        <div className="flex items-center gap-1" style={{ color: favourColor }}>
          <Zap size={8} />
          <span className="text-[8px] font-black">{buyerFavourScore.toFixed(1)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl px-4 py-2.5 flex items-center gap-6 overflow-x-auto custom-scrollbar">
      {/* Market Mode */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: marketModeColor, boxShadow: `0 0 8px ${marketModeColor}` }} />
        <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Market</span>
        <span 
          className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${marketModeColor}20`, color: marketModeColor, border: `1px solid ${marketModeColor}40` }}
        >
          {marketMode === 'BUYER' ? 'BUYER' : marketMode === 'SELLER' ? 'SELLER' : 'NEUTRAL'}
        </span>
        <span className="text-[8px] text-linear-text-muted font-mono">{mos.toFixed(1)} MOS</span>
      </div>

      <div className="h-4 w-px bg-linear-border shrink-0" />

      {/* Negotiation Room */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Negotiation</span>
        <span className="text-[10px] font-black text-retro-green">-{discount.toFixed(1)}%</span>
        <span className="text-[8px] text-linear-text-muted">room</span>
      </div>

      <div className="h-4 w-px bg-linear-border shrink-0" />

      {/* Rate Signal */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Rates</span>
        <RateIcon size={10} style={{ color: rateSignalColor }} />
        <span className="text-[9px] font-black uppercase" style={{ color: rateSignalColor }}>{rateSignalLabel}</span>
      </div>

      <div className="h-4 w-px bg-linear-border shrink-0" />

      {/* Seasonal Window */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Seasonal</span>
        <div className="flex items-center gap-1">
          <Clock size={9} className="text-blue-400" />
          <span className="text-[10px] font-black text-white">{seasonalScore.toFixed(1)}</span>
          <span className="text-[8px] text-linear-text-muted">/10</span>
        </div>
      </div>

      <div className="h-4 w-px bg-linear-border shrink-0" />

      {/* Buyer Favour Score */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Buyer Favour</span>
        <div 
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black"
          style={{ backgroundColor: `${favourColor}20`, color: favourColor, border: `1px solid ${favourColor}40` }}
        >
          <Zap size={9} />
          {buyerFavourScore.toFixed(1)}/10
        </div>
      </div>

      <div className="h-4 w-px bg-linear-border shrink-0" />

      {/* MPC Date */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">MPC</span>
        <span className="text-[9px] font-mono text-white">{mpcNext}</span>
      </div>

      {/* SDLT Badge */}
      {data?.sdlt_countdown && (
        <>
          <div className="h-4 w-px bg-linear-border shrink-0" />
          <div className="flex items-center gap-1 shrink-0">
            <AlertCircle size={9} className="text-amber-400" />
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">SDLT {extractValue(data.sdlt_countdown)}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default MarketConditionsBar;
