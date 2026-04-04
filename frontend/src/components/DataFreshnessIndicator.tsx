// UX-009: Add Data Freshness Indicator — shows when market data was last updated
import React, { useMemo } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

const formatLastUpdated = (timestamp: string | undefined): { label: string; freshness: 'fresh' | 'stale' | 'unknown' } => {
  if (!timestamp) return { label: 'Unknown', freshness: 'unknown' };

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return { label: 'Unknown', freshness: 'unknown' };

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 24) {
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return { label: `${diffMins}m ago`, freshness: 'fresh' };
      }
      return { label: `${Math.floor(diffHours)}h ago`, freshness: 'fresh' };
    }
    if (diffDays < 7) {
      return { label: `${Math.floor(diffDays)}d ago`, freshness: 'stale' };
    }
    return { label: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), freshness: 'stale' };
  } catch {
    return { label: 'Unknown', freshness: 'unknown' };
  }
};

const DataFreshnessIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { data, loading } = useMacroData();

  const { label, freshness } = useMemo(
    () => formatLastUpdated(data?.last_refreshed),
    [data?.last_refreshed]
  );

  if (loading) return null;

  const iconColor = freshness === 'fresh' ? '#22c55e' : freshness === 'stale' ? '#f59e0b' : '#a1a1aa';
  const bgClass = freshness === 'fresh'
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : freshness === 'stale'
    ? 'bg-amber-500/10 border-amber-500/20'
    : 'bg-gray-500/10 border-gray-500/20';
  const dotClass = freshness === 'fresh'
    ? 'bg-emerald-400 animate-pulse'
    : freshness === 'stale'
    ? 'bg-amber-400'
    : 'bg-gray-400';

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${bgClass} ${className}`}>
      {freshness === 'fresh' ? (
        <CheckCircle size={9} style={{ color: iconColor }} />
      ) : freshness === 'stale' ? (
        <AlertCircle size={9} style={{ color: iconColor }} />
      ) : (
        <Clock size={9} style={{ color: iconColor }} />
      )}
      <div className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-widest">
        Data {label}
      </span>
    </div>
  );
};

export default DataFreshnessIndicator;
