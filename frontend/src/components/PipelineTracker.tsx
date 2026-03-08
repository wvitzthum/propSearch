import React from 'react';
import { CheckCircle2, Circle, Bookmark, ShieldCheck, Archive } from 'lucide-react';
import type { PropertyStatus } from '../hooks/usePipeline';

interface PipelineTrackerProps {
  status: PropertyStatus;
  onStatusChange?: (status: PropertyStatus) => void;
  className?: string;
}

const STEPS: { status: PropertyStatus; label: string; icon: any }[] = [
  { status: 'discovered', label: 'Discovered', icon: Circle },
  { status: 'shortlisted', label: 'Shortlisted', icon: Bookmark },
  { status: 'vetted', label: 'Vetted', icon: ShieldCheck },
  { status: 'archived', label: 'Archived', icon: Archive },
];

const PipelineTracker: React.FC<PipelineTrackerProps> = ({ status, onStatusChange, className = '' }) => {
  const currentIndex = STEPS.findIndex(s => s.status === status);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Asset Lifecycle</span>
        <span className="text-[10px] font-bold text-linear-accent uppercase tracking-widest">{status}</span>
      </div>
      
      <div className="relative flex justify-between">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-linear-border -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-700" 
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
              className={`relative z-10 flex flex-col items-center group ${!onStatusChange ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className={`
                h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500 border-2
                ${isCompleted ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 
                  isCurrent ? 'bg-linear-card border-blue-400 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 
                  'bg-linear-bg border-linear-border text-linear-text-muted hover:border-linear-accent'}
              `}>
                {isCompleted ? <CheckCircle2 size={14} /> : <Icon size={14} />}
              </div>
              <span className={`
                absolute -bottom-6 text-[8px] font-black uppercase tracking-tighter transition-colors duration-500 whitespace-nowrap
                ${isCurrent ? 'text-white' : 'text-linear-text-muted group-hover:text-white'}
              `}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineTracker;
