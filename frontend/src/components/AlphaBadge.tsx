import React from 'react';

interface AlphaBadgeProps {
  score: number;
  className?: string;
  showLabel?: boolean;
}

const AlphaBadge: React.FC<AlphaBadgeProps> = ({ score, className = '', showLabel = false }) => {
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

  return (
    <div className={`group/badge relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider cursor-help transition-all hover:bg-white hover:text-black ${getColors()} ${className}`}>
      <span>{score.toFixed(1)}</span>
      {showLabel && <span className="opacity-70">Alpha</span>}

      {/* Institutional Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-linear-card border border-linear-border rounded-xl shadow-2xl opacity-0 group-hover/badge:opacity-100 pointer-events-none transition-all z-50 scale-95 group-hover/badge:scale-100 origin-bottom">
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
                {[1,2,3].map(i => <div key={i} className={`h-1 w-2 rounded-full ${i <= (score/3) ? 'bg-blue-500' : 'bg-linear-bg border border-linear-border'}`} />)}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-linear-text-muted font-bold">Price Efficiency</span>
              <div className="flex gap-0.5">
                {[1,2,3].map(i => <div key={i} className={`h-1 w-2 rounded-full ${i <= (score/3.5) ? 'bg-blue-500' : 'bg-linear-bg border border-linear-border'}`} />)}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-linear-text-muted font-bold">Spatial Alpha</span>
              <div className="flex gap-0.5">
                {[1,2,3].map(i => <div key={i} className={`h-1 w-2 rounded-full ${i <= (score/4) ? 'bg-blue-500' : 'bg-linear-bg border border-linear-border'}`} />)}
              </div>
            </div>
          </div>
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-linear-card" />
      </div>
    </div>
  );
};

export default AlphaBadge;
