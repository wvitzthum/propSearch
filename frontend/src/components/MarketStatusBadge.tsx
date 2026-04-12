/**
 * ADR-017: Market Status Badge
 *
 * Analyst-owned axis — tells user whether the property is still on the market.
 * Independent of pipeline_status (user's own tracking axis).
 *
 * Colour semantics:
 *   active      → green  — still listed, potential to proceed
 *   under_offer → amber  — seller accepted a bid, ask is elevated
 *   sold_stc    → blue   — sold subject to contract (buyer still in diligence)
 *   sold_completed → gray — title transferred
 *   withdrawn   → rose   — pulled from market (could re-list)
 *   unknown     → muted  — not yet verified by analyst
 */

import React from 'react';
import type { MarketStatus } from '../types/property';
import Tooltip from './Tooltip';

const MARKET_STATUS_CONFIG: Record<MarketStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}> = {
  active: {
    label: 'Active',
    color: 'text-retro-green',
    bg: 'bg-retro-green/10',
    border: 'border-retro-green/30',
    description: 'Property is currently listed on the market.',
  },
  under_offer: {
    label: 'Under Offer',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    description: 'Seller has accepted a bid. Final sale price is typically elevated.',
  },
  sold_stc: {
    label: 'Sold STC',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    description: 'Sold Subject to Contract — buyer is in due diligence.',
  },
  sold_completed: {
    label: 'Sold',
    color: 'text-linear-text-muted',
    bg: 'bg-white/5',
    border: 'border-white/10',
    description: 'Title has transferred. Record retained for analytics.',
  },
  withdrawn: {
    label: 'Withdrawn',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    description: 'Removed from market. May re-list at a different price.',
  },
  unknown: {
    label: 'Unverified',
    color: 'text-linear-text-muted',
    bg: 'bg-linear-card/50',
    border: 'border-linear-border',
    description: 'Market status not yet confirmed by analyst.',
  },
};

interface MarketStatusBadgeProps {
  status: MarketStatus | undefined;
  className?: string;
  showLabel?: boolean;
  /** Compact dot-only mode for PropertyTable cells — no text label */
  compact?: boolean;
}

const MarketStatusBadge: React.FC<MarketStatusBadgeProps> = ({
  status,
  className = '',
  showLabel = false,
  compact = false,
}) => {
  // ADR-017: Guard against unexpected market_status values from API
  const validStatuses: MarketStatus[] = ['active', 'under_offer', 'sold_stc', 'sold_completed', 'withdrawn', 'unknown'];
  if (!status || !validStatuses.includes(status)) {
    status = 'unknown';
  }

  const cfg = MARKET_STATUS_CONFIG[status];

  const renderTooltipContent = () => (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center border-b border-linear-border pb-1.5">
        <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-widest">Market Status</span>
        <span className={`text-[9px] font-bold uppercase ${cfg.color}`}>{cfg.label}</span>
      </div>
      <p className="text-[8px] text-linear-text-muted leading-relaxed">{cfg.description}</p>
      <div className="pt-1 border-t border-linear-border/50">
        <span className="text-[7px] text-linear-text-muted/50 italic">
          Analyst axis · independent of your pipeline tracking
        </span>
      </div>
    </div>
  );

  // UX-048: Compact dot-only mode for PropertyTable cells
  if (compact) {
    return (
      <Tooltip renderContent={renderTooltipContent} width="w-48">
        <span
          className={`inline-block h-2 w-2 rounded-full cursor-help ${className} ${
            status === 'active' ? 'bg-retro-green' :
            status === 'under_offer' ? 'bg-amber-400' :
            status === 'sold_stc' ? 'bg-blue-400' :
            status === 'sold_completed' ? 'bg-linear-text-muted' :
            status === 'withdrawn' ? 'bg-rose-400' :
            'bg-linear-text-muted/40'
          }`}
          title={cfg.label}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip renderContent={renderTooltipContent} width="w-48">
      <div
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider cursor-help
          transition-all hover:brightness-110
          ${cfg.bg} ${cfg.color} ${cfg.border}
          ${className}
        `}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            status === 'active' ? 'bg-retro-green' :
            status === 'under_offer' ? 'bg-amber-400' :
            status === 'sold_stc' ? 'bg-blue-400' :
            status === 'sold_completed' ? 'bg-linear-text-muted' :
            status === 'withdrawn' ? 'bg-rose-400' :
            'bg-linear-text-muted/40'
          }`}
        />
        <span>{cfg.label}</span>
        {showLabel && <span className="opacity-70">Market</span>}
      </div>
    </Tooltip>
  );
};

export default MarketStatusBadge;
