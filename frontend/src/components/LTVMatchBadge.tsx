import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LTVMatchScore } from '../hooks/useAffordability';

interface LTVMatchBadgeProps {
  score: LTVMatchScore;
  size?: 'sm' | 'md' | 'lg';
}

const LTVMatchBadge: React.FC<LTVMatchBadgeProps> = ({
  score,
  size = 'sm'
}) => {
  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-1',
    lg: 'text-[11px] px-3 py-1.5'
  };

  const iconSize = {
    sm: 10,
    md: 12,
    lg: 14
  };

  const Icon = score.score >= 80 ? TrendingUp : score.score >= 50 ? Minus : TrendingDown;

  return (
    <div className="relative group">
      <span
        className={`
          inline-flex items-center gap-1 rounded font-bold uppercase tracking-wider
          transition-all cursor-default ${sizeClasses[size]}
        `}
        style={{
          backgroundColor: `${score.color}15`,
          color: score.color,
          border: `1px solid ${score.color}30`,
        }}
      >
        <Icon size={iconSize[size]} />
        <span>{score.score}</span>
        <span className="opacity-70">/ 100</span>
      </span>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        <div 
          className="bg-linear-card border border-linear-border rounded-xl shadow-2xl p-3 w-64"
          style={{ borderColor: `${score.color}40` }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: score.color }}>
            {score.band} Match
          </div>
          <div className="text-xs text-white font-medium mb-2">
            {score.message}
          </div>
          <div className="text-[9px] text-linear-text-muted mb-2">
            Max LTV: {score.maxLTV}%
          </div>
          <div className="space-y-1">
            {score.reasons.map((reason, i) => (
              <div key={i} className="text-[9px] text-linear-text-muted flex items-start gap-1.5">
                <span style={{ color: score.color }}>•</span>
                {reason}
              </div>
            ))}
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-linear-card border-r border-b border-linear-border" />
        </div>
      </div>
    </div>
  );
};

export default LTVMatchBadge;
