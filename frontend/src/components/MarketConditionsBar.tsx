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
import Tooltip from './Tooltip';

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
      {/* 1. Market Mode / MOS */}
      <Tooltip
        content="Market Mode is derived from Months of Supply (MOS). MOS < 4 = Seller's Market with low leverage for buyers. MOS > 6 = Buyer's Market with strong negotiating position."
        methodology="MOS = Active Listings / Average Monthly Sales Volume (12m rolling). < 4m = Seller's Market, 4-6m = Balanced, > 6m = Buyer's Market. Source: RICS UK Residential Survey + Land Registry."
      >
        <div className="flex items-center gap-2 shrink-0 cursor-help">
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
      </Tooltip>

      <div className="h-4 w-px bg-linear-border shrink-0" />

      {/* 2. Negotiation Room */}
      <Tooltip
        content="Negotiation Room is the average discount from asking price achievable in the current quarter. Higher = more buyer leverage."
        methodology="Average difference between Last Asking Price and Agreed Sale Price in prime postcodes. Derived from HM Land Registry sold price data vs. Rightmove/RICS asking price data. Based on Q1 2026 transactions."
      >
        <div className="flex items-center gap-2 shrink-0 cursor-help">
          <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Negotiation</span>
          <span className="text-[10px] font-black text-retro-green">-{discount.toFixed(1)}%</span>
          <span className="text-[8px] text-linear-text-muted">room</span>
        </div>
      </Tooltip>

      <div className="h-4 w-px bg-linear-border shrink-0" />

      {/* 3. Rate Signal */}
      <Tooltip
        content="Rate Signal reflects the trend in 5yr GBP Swap Rates — a leading indicator for retail mortgage pricing. Rising rates = tightening affordability. Falling = easing conditions."
        methodology="Swap rates sourced from market feeds (ICE SwapCut). Rising = mortgage costs increasing over 30-day window. Falling = mortgage costs decreasing. Holding = within ±5bp of prior period."
      >
        <div className="flex items-center gap-2 shrink-0 cursor-help">
          <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Rates</span>
          <RateIcon size={10} style={{ color: rateSignalColor }} />
          <span className="text-[9px] font-black uppercase" style={{ color: rateSignalColor }}>{rateSignalLabel}</span>
        </div>
      </Tooltip>

      <div className="h-4 w-px bg-linear-border shrink-0" />

      {/* 4. Seasonal Window */}
      <Tooltip
        content="Seasonal Buy Score (0-10) indicates the optimality of the current seasonal window for acquisition. Higher scores = better buy conditions based on historical pricing patterns."
        methodology="Based on historical price seasonality analysis (Land Registry, 2012-2024). Q4-Q1 (Dec-Feb) typically sees -2-4% discount vs. spring peak. Score weights: winter dip (+3), spring surge (-2), supply glut (+2), inventory drought (-1). 0 = worst window, 10 = optimal."
      >
        <div className="flex items-center gap-2 shrink-0 cursor-help">
          <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Seasonal</span>
          <div className="flex items-center gap-1">
            <Clock size={9} className="text-blue-400" />
            <span className="text-[10px] font-black text-white">{seasonalScore.toFixed(1)}</span>
            <span className="text-[8px] text-linear-text-muted">/10</span>
          </div>
        </div>
      </Tooltip>

      <div className="h-4 w-px bg-linear-border shrink-0" />

      {/* 5. Buyer Favour Score */}
      <Tooltip
        content={`Buyer Favour Score is a composite indicator of acquisition conditions for the current market window. > 7 = Favourable, 4-7 = Neutral, < 4 = Unfavourable. Score: ${buyerFavourScore.toFixed(1)}`}
        methodology={`Composite formula: Base 5.0 + MOS contribution (-1.5 if <4, +2.0 if >6) + Negotiation discount contribution (discount%/10 × 2.0) + Seasonal contribution ((seasonalScore - 5)/5 × 1.5). Clamped to [0, 10].`}
      >
        <div className="flex items-center gap-2 shrink-0 cursor-help">
          <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Buyer Favour</span>
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black"
            style={{ backgroundColor: `${favourColor}20`, color: favourColor, border: `1px solid ${favourColor}40` }}
          >
            <Zap size={9} />
            {buyerFavourScore.toFixed(1)}/10
          </div>
        </div>
      </Tooltip>

      <div className="h-4 w-px bg-linear-border shrink-0" />

      {/* 6. MPC Date */}
      <Tooltip
        content="MPC is the Bank of England Monetary Policy Committee — sets the base rate that governs retail mortgage pricing floors. Changes take 12-18 months to fully transmit to retail mortgage rates."
        methodology="MPC meeting dates from BoE official MPC calendar. Rate decisions are transmitted via the Bank Rate → SONIA → swap rates → retail mortgage pricing chain."
      >
        <div className="flex items-center gap-1 shrink-0 cursor-help">
          <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">MPC</span>
          <span className="text-[9px] font-mono text-white">{mpcNext}</span>
        </div>
      </Tooltip>

      {/* 7. SDLT Badge */}
      {data?.sdlt_countdown && (
        <>
          <div className="h-4 w-px bg-linear-border shrink-0" />
          <Tooltip
            content="SDLT (Stamp Duty Land Tax) surcharge tier status. The countdown shows days remaining in the current SDLT regime before the next threshold change."
            methodology="Q2 2026 SDLT milestone thresholds per HMRC. Surcharge thresholds are reviewed annually. Next scheduled review: April 2026."
          >
            <div className="flex items-center gap-1 shrink-0 cursor-help">
              <AlertCircle size={9} className="text-amber-400" />
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">SDLT {extractValue(data.sdlt_countdown)}</span>
            </div>
          </Tooltip>
        </>
      )}
    </div>
  );
};

export default MarketConditionsBar;
