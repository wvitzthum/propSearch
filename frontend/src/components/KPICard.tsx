import React from 'react';
import type { LucideIcon } from 'lucide-react';
import Tooltip from './Tooltip';

interface KPICardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
  loading?: boolean;
  tooltip?: string;
  methodology?: string;
}

const KPICard: React.FC<KPICardProps> = ({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  className = '', 
  loading = false,
  tooltip,
  methodology
}) => {
  if (loading) {
    return (
      <div className={`p-4 bg-linear-card border border-linear-border rounded-xl animate-pulse ${className}`}>
        <div className="h-3 w-20 bg-linear-bg rounded mb-3"></div>
        <div className="h-6 w-24 bg-linear-bg rounded"></div>
      </div>
    );
  }

  return (
    <Tooltip content={tooltip} methodology={methodology} className="w-full">
      <div className={`p-4 bg-linear-card border border-linear-border rounded-xl shadow-sm hover:border-linear-accent transition-all group/kpi relative h-full ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.1em]">{label}</span>
          {Icon && <Icon size={14} className="text-linear-accent" />}
        </div>
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold text-linear-text-primary tracking-tighter">{value}</div>
          {trend && (
            <div className={`text-[10px] font-bold ${trend.isPositive ? 'text-linear-accent-emerald' : 'text-linear-accent-rose'}`}>
              {trend.value}
            </div>
          )}
        </div>
      </div>
    </Tooltip>
  );
};

export default KPICard;
