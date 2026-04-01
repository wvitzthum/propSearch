import React, { useState, useEffect } from 'react';
import { DollarSign, Minus, Plus } from 'lucide-react';
import { useAffordability } from '../hooks/useAffordability';

interface BudgetSliderProps {
  onBudgetChange?: (budget: number) => void;
  compact?: boolean;
}

const BudgetSlider: React.FC<BudgetSliderProps> = ({ onBudgetChange, compact = false }) => {
  const { monthlyBudget, updateBudget, getAffordablePrice, mortgageRate } = useAffordability();
  const [localBudget, setLocalBudget] = useState(monthlyBudget);

  useEffect(() => {
    setLocalBudget(monthlyBudget);
  }, [monthlyBudget]);

  const affordablePrice = getAffordablePrice(localBudget);

  const handleChange = (value: number) => {
    setLocalBudget(value);
  };

  const handleCommit = () => {
    updateBudget(localBudget);
    onBudgetChange?.(localBudget);
  };

  const quickAdjust = (delta: number) => {
    const newBudget = Math.max(500, Math.min(50000, localBudget + delta));
    setLocalBudget(newBudget);
    updateBudget(newBudget);
    onBudgetChange?.(newBudget);
  };

  const presets = [
    { label: '£4K', value: 4000 },
    { label: '£6K', value: 6000 },
    { label: '£8K', value: 8000 },
    { label: '£10K', value: 10000 },
    { label: '£15K', value: 15000 },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative group">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-linear-accent opacity-50 group-hover:opacity-100 transition-opacity">
            <DollarSign size={12} />
          </div>
          <input
            type="range"
            min="500"
            max="20000"
            step="100"
            value={localBudget}
            onChange={(e) => handleChange(Number(e.target.value))}
            onMouseUp={handleCommit}
            onTouchEnd={handleCommit}
            className="w-24 h-1 bg-linear-bg rounded-full appearance-none cursor-pointer accent-blue-500"
          />
        </div>
        <span className="text-xs font-bold text-white min-w-[60px]">
          £{localBudget.toLocaleString()}/mo
        </span>
      </div>
    );
  }

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <DollarSign size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">
              Monthly Budget
            </div>
            <div className="text-lg font-bold text-white tracking-tight">
              £{localBudget.toLocaleString()}
              <span className="text-[10px] text-linear-text-muted font-normal"> / month</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => quickAdjust(-500)}
            className="p-1.5 rounded-lg bg-linear-bg border border-linear-border text-linear-text-muted hover:text-white hover:border-blue-500/50 transition-all"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => quickAdjust(500)}
            className="p-1.5 rounded-lg bg-linear-bg border border-linear-border text-linear-text-muted hover:text-white hover:border-blue-500/50 transition-all"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <input
          type="range"
          min="500"
          max="20000"
          step="100"
          value={localBudget}
          onChange={(e) => handleChange(Number(e.target.value))}
          onMouseUp={handleCommit}
          onTouchEnd={handleCommit}
          className="w-full h-2 bg-linear-bg rounded-full appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-[9px] text-linear-text-muted">
          <span>£500</span>
          <span>£20,000</span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex gap-2 flex-wrap">
        {presets.map(preset => (
          <button
            key={preset.value}
            onClick={() => {
              setLocalBudget(preset.value);
              updateBudget(preset.value);
              onBudgetChange?.(preset.value);
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              localBudget === preset.value
                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                : 'bg-linear-bg border border-linear-border text-linear-text-muted hover:text-white hover:border-blue-500/30'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Affordability Summary */}
      <div className="pt-3 border-t border-linear-border/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">
              Affordable Range
            </div>
            <div className="text-sm font-bold text-white tracking-tight">
              £{(affordablePrice * 0.85).toLocaleString()} - £{affordablePrice.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">
              Est. Rate
            </div>
            <div className="text-sm font-bold text-white tracking-tight">
              {mortgageRate}%
              <span className="text-[9px] text-linear-text-muted font-normal ml-1">5yr fixed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetSlider;
