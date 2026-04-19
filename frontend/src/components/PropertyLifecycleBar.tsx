/**
 * PropertyLifecycleBar.tsx — UX-123: Collapses PipelineTracker + ThesisTags into a single compact bar
 * UX-126: PipelineTracker wrapped in horizontal scroll container
 */
import React from 'react';
import { CheckCircle2, Circle, Bookmark, ShieldCheck, Archive, Star, Tag, Plus } from 'lucide-react';
import type { PropertyStatus } from '../hooks/usePipeline';
import type { ThesisTag } from '../hooks/useThesisTags';
import { THESIS_TAG_CONFIG } from '../hooks/useThesisTags';

interface PropertyLifecycleBarProps {
  status: PropertyStatus;
  onStatusChange?: (status: PropertyStatus) => void;
  tags?: ThesisTag[];
  onAddTag?: () => void;
  lastCheckedDaysAgo?: number;
  verifiedColor?: string;
}

const STEPS: { status: PropertyStatus; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { status: 'discovered', label: 'Disc.', icon: Circle },
  { status: 'shortlisted', label: 'Short.', icon: Bookmark },
  { status: 'vetted', label: 'Vetted', icon: ShieldCheck },
  { status: 'watchlist', label: 'Watch', icon: Star },
  { status: 'archived', label: 'Arch.', icon: Archive },
];

const TAG_COLORS: Record<string, string> = {
  'moat-play': '#3b82f6',
  'yield-hunt': '#10b981',
  'value-add': '#f59e0b',
  'turnkey': '#8b5cf6',
  'off-market': '#ec4899',
  'development-potential': '#f97316',
  'cashflow-play': '#06b6d4',
  'legacy-hold': '#84cc16',
  'distressed': '#ef4444',
  'neglected-gem': '#a855f7',
};

const PropertyLifecycleBar: React.FC<PropertyLifecycleBarProps> = ({
  status,
  onStatusChange,
  tags = [],
  onAddTag,
  lastCheckedDaysAgo,
  verifiedColor,
}) => {
  const currentIndex = STEPS.findIndex(s => s.status === status);

  return (
    <div className="bg-linear-card border border-linear-border rounded-2xl shadow-xl overflow-hidden">
      {/* Pipeline steps — horizontal scroll (UX-126) */}
      <div className="px-4 pt-4 pb-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Asset Lifecycle</span>
          <div className="flex items-center gap-3">
            {lastCheckedDaysAgo !== undefined && (
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: verifiedColor ?? '#22c55e' }} />
                <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest whitespace-nowrap">
                  Verified {lastCheckedDaysAgo}d ago
                </span>
              </div>
            )}
            <span className="text-[10px] font-bold text-linear-accent uppercase tracking-widest whitespace-nowrap">{status}</span>
          </div>
        </div>

        {/* Steps row — horizontal scroll (UX-126) */}
        <div className="relative flex min-w-max overflow-x-auto pb-1 -mx-1 px-1">
          <div className="absolute top-4 left-0 w-full h-0.5 bg-linear-border -translate-y-1/2 z-0" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-700"
            style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
          />

          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <button
                key={step.status}
                onClick={() => onStatusChange?.(step.status)}
                disabled={!onStatusChange}
                className={`relative z-10 flex flex-col items-center group flex-shrink-0 mr-5 last:mr-0 ${!onStatusChange ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className={`
                  h-7 w-7 rounded-full flex items-center justify-center transition-all duration-500 border
                  ${isCompleted ? 'bg-blue-500 border-blue-400 text-white' :
                    isCurrent ? 'bg-linear-card border-blue-400 text-blue-400' :
                    'bg-linear-bg border-linear-border text-linear-text-muted hover:border-blue-500/40'}
                `}>
                  {isCompleted ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                </div>
                <span className={`
                  text-[7px] font-black uppercase tracking-tighter mt-1.5 transition-colors duration-300
                  ${isCurrent ? 'text-white' : 'text-linear-text-muted group-hover:text-white'}
                `}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thesis tags row */}
      <div className="px-4 pb-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 flex-wrap min-h-[20px]">
          <Tag size={9} className="text-linear-text-muted flex-shrink-0" />
          {tags.map(tag => (
            <span
              key={tag}
              className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded tracking-widest flex-shrink-0"
              style={{
                backgroundColor: `${TAG_COLORS[tag] ?? '#3b82f6'}20`,
                color: TAG_COLORS[tag] ?? '#3b82f6',
                border: `1px solid ${TAG_COLORS[tag] ?? '#3b82f6'}40`,
              }}
            >
              {THESIS_TAG_CONFIG[tag]?.label ?? tag}
            </span>
          ))}
          {onAddTag && (
            <button
              onClick={onAddTag}
              className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-widest
                px-1.5 py-0.5 rounded border border-linear-border text-linear-text-muted
                hover:text-white hover:border-blue-500/40 transition-all flex-shrink-0"
            >
              <Plus size={8} />
              <Tag size={8} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyLifecycleBar;
