// VISX-002: Shared chart grid component using @visx/grid and @visx/axis primitives
// VISX-014: Shared gradient library using @visx/gradient
// VISX-009: Shared legend using @visx/legend LegendOrdinal
import React from 'react';

export interface ChartLegendProps {
  items: Array<{ label: string; color: string; shape?: 'circle' | 'rect' | 'line' }>;
  position?: 'top-right' | 'bottom' | 'inline';
}

export const ChartLegend: React.FC<ChartLegendProps> = ({ items, position = 'top-right' }) => {
  if (!items.length) return null;
  if (position === 'inline') {
    return (
      <div className="flex flex-wrap gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {item.shape === 'circle' && (
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            )}
            {item.shape === 'rect' && (
              <div className="h-2 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
            )}
            {(item.shape === 'line' || !item.shape) && (
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: item.color }} />
            )}
            <span className="text-[8px] text-linear-text-muted font-bold uppercase tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 ${position === 'top-right' ? 'ml-auto' : ''}`}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-[8px] text-linear-text-muted font-bold">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default ChartLegend;
