import React from 'react';
import { AlertCircle } from 'lucide-react';
import Tooltip from './Tooltip';

interface AlphaBadgeProps {
  score: number | null | undefined;
  className?: string;
  showLabel?: boolean;
  /** Fields missing from this property — shown as a warning in the tooltip */
  shallowFields?: string[];
}

const AlphaBadge: React.FC<AlphaBadgeProps> = ({
  score,
  className = '',
  showLabel = false,
  shallowFields = [],
}) => {
  const isShallow = shallowFields.length > 0;

  if (score === null || score === undefined) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-linear-border bg-linear-card/50 text-linear-text-muted text-[10px] font-bold uppercase tracking-wider ${className}`}>
        <span>N/A</span>
        {showLabel && <span className="opacity-70">Alpha</span>}
      </div>
    );
  }

  const getColors = () => {
    if (score >= 8) return 'bg-linear-accent-emerald/10 text-linear-accent-emerald border-linear-accent-emerald/30';
    if (score >= 5) return 'bg-retro-amber/10 text-retro-amber border-retro-amber/30';
    return 'bg-linear-accent-rose/10 text-linear-accent-rose border-linear-accent-rose/30';
  };

  const getLabel = () => {
    if (score >= 8) return 'Investment Grade';
    if (score >= 5) return 'Market Neutral';
    return 'High Variance';
  };

  const renderTooltipContent = () => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center border-b border-linear-border pb-1.5">
        <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-widest">Alpha Rating v2</span>
        <span className={`text-[9px] font-bold uppercase ${score >= 8 ? 'text-linear-accent-emerald' : score >= 5 ? 'text-retro-amber' : 'text-linear-accent-rose'}`}>
          {getLabel()}
        </span>
      </div>
      {isShallow && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 bg-retro-amber/10 border border-retro-amber/20 rounded-lg">
          <AlertCircle size={10} className="text-retro-amber flex-shrink-0 mt-0.5" />
          <div className="text-[9px] text-retro-amber leading-relaxed">
            Shallow data — missing: {shallowFields.join(', ')}
          </div>
        </div>
      )}
      {/* v2 base factors */}
      <div className="space-y-1">
        {[
          { label: 'Tenure Quality', weight: '40%' },
          { label: 'Spatial Alpha', weight: '30%' },
          { label: 'Price Efficiency', weight: '30%' },
        ].map(factor => (
          <div key={factor.label} className="flex justify-between items-center">
            <span className="text-[9px] text-linear-text-muted font-medium">{factor.label}</span>
            <span className="text-[8px] text-linear-text-muted/50">{factor.weight}</span>
          </div>
        ))}
      </div>
      {/* v2 modifiers teaser */}
      <div className="flex flex-wrap gap-1 pt-1 border-t border-linear-border/50">
        {['DOM', 'EPC', 'Floor', 'SC', 'Appreciation', 'Market', 'Lifestyle'].map(mod => (
          <span key={mod} className="text-[7px] text-linear-text-muted/40 font-mono">{mod}</span>
        ))}
        <span className="text-[7px] text-linear-text-muted/40 font-mono">±</span>
      </div>
      <div className="pt-1 border-t border-linear-border/50 flex items-center justify-center gap-1">
        <span className="text-[8px] text-blue-400 font-bold">See full breakdown ↓</span>
      </div>
    </div>
  );

  return (
    <Tooltip renderContent={renderTooltipContent} width="w-48">
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider cursor-help transition-all hover:bg-linear-text-primary hover:text-linear-bg ${getColors()} ${className}`}>
        <span>{score.toFixed(1)}</span>
        {isShallow && <AlertCircle size={9} className="text-retro-amber" />}
        {showLabel && <span className="opacity-70">Alpha</span>}
      </div>
    </Tooltip>
  );
};

export default AlphaBadge;
