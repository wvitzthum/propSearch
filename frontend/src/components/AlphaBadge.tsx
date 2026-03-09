import React from 'react';
import Tooltip from './Tooltip';

interface AlphaBadgeProps {
  score: number | null | undefined;
  className?: string;
  showLabel?: boolean;
}

const AlphaBadge: React.FC<AlphaBadgeProps> = ({ score, className = '', showLabel = false }) => {
  if (score === null || score === undefined) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-linear-border bg-linear-card/50 text-linear-text-muted text-[10px] font-black uppercase tracking-wider ${className}`}>
        <span>N/A</span>
        {showLabel && <span className="opacity-70">Alpha</span>}
      </div>
    );
  }

  const getColors = () => {
    if (score >= 8) return 'bg-retro-green/10 text-retro-green border-retro-green/30';
    if (score >= 5) return 'bg-retro-amber/10 text-retro-amber border-retro-amber/30';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  };

  const getLabel = () => {
    if (score >= 8) return 'Investment Grade';
    if (score >= 5) return 'Market Neutral';
    return 'High Variance';
  };

  const renderTooltipContent = () => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center border-b border-linear-border pb-1.5">
        <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">Alpha Rating</span>
        <span className={`text-[9px] font-black uppercase ${score >= 8 ? 'text-retro-green' : score >= 5 ? 'text-retro-amber' : 'text-rose-400'}`}>
          {getLabel()}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-linear-text-muted font-bold">Tenure Quality</span>
          <div className="flex gap-0.5">
            {[1,2,3].map(i => <div key={i} className={`h-1 w-2 rounded-full ${i <= (score * 0.4 / 10 * 3) ? 'bg-blue-500' : 'bg-linear-bg border border-linear-border'}`} />)}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-linear-text-muted font-bold">Price Efficiency</span>
          <div className="flex gap-0.5">
            {[1,2,3].map(i => <div key={i} className={`h-1 w-2 rounded-full ${i <= (score * 0.3 / 10 * 3) ? 'bg-blue-500' : 'bg-linear-bg border border-linear-border'}`} />)}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-linear-text-muted font-bold">Spatial Alpha</span>
          <div className="flex gap-0.5">
            {[1,2,3].map(i => <div key={i} className={`h-1 w-2 rounded-full ${i <= (score * 0.3 / 10 * 3) ? 'bg-blue-500' : 'bg-linear-bg border border-linear-border'}`} />)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Tooltip renderContent={renderTooltipContent} width="w-48">
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider cursor-help transition-all hover:bg-white hover:text-black ${getColors()} ${className}`}>
        <span>{score.toFixed(1)}</span>
        {showLabel && <span className="opacity-70">Alpha</span>}
      </div>
    </Tooltip>
  );
};

export default AlphaBadge;
