// UX-58: RentalYieldVsGiltChart with property-specific rent input
// Wraps RentalYieldVsGiltChart (area-level) and adds manual estimated_rent for this property
import React, { useState, useCallback } from 'react';
import RentalYieldVsGiltChart from './RentalYieldVsGiltChart';
import type { PropertyWithCoords } from '../types/property';
// visx imports reserved for future property-specific overlay:
// import { scaleLinear } from '@visx/scale';
// import { Group } from '@visx/group';
// import { ParentSize } from '@visx/responsive';
// import { Bar } from '@visx/shape';

interface Props {
  property: PropertyWithCoords;
}

const RENT_STORAGE_KEY = (id: string) => `propSearch_rent_${id}`;

const RentalYieldVsGiltChartWithRent: React.FC<Props> = ({ property }) => {
  // Load stored rent for this property, or use schema value
  const [manualRent, setManualRent] = useState<number>(() => {
    const stored = localStorage.getItem(RENT_STORAGE_KEY(property.id));
    if (stored) return JSON.parse(stored);
    return typeof property.estimated_rent === 'number' && property.estimated_rent > 0
      ? property.estimated_rent
      : 0;
  });

  const [showInput, setShowInput] = useState(false);

  const saveRent = useCallback((rent: number) => {
    setManualRent(rent);
    localStorage.setItem(RENT_STORAGE_KEY(property.id), JSON.stringify(rent));
    setShowInput(false);
  }, [property.id]);

  const listPrice = property.list_price ?? 0;
  const hasRent = manualRent > 0;

  // Calculate property-specific yield
  const grossYield = hasRent && listPrice > 0 ? (manualRent * 12) / listPrice * 100 : null;
  const netYield = grossYield !== null ? grossYield * 0.76 : null;

  // Comparison: how does this property's yield stack vs area avg
  const areaGrossYield = 3.5; // fallback; ideally from macro data
  const yieldVsArea = grossYield !== null ? grossYield - areaGrossYield : null;

  return (
    <div className="space-y-3">
      {/* Property-specific rent input strip */}
      <div className="bg-linear-bg border border-linear-border rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">
            Your Estimated Rent
          </div>
          {hasRent ? (
            <div className="text-[11px] font-bold text-white">
              £{manualRent.toLocaleString()}/mo
              <span className="text-[9px] text-linear-text-muted ml-2">
                → {grossYield?.toFixed(1)}% gross · {netYield?.toFixed(1)}% net
              </span>
              {yieldVsArea !== null && (
                <span className={`text-[9px] font-black ml-3 ${
                  yieldVsArea >= 0 ? 'text-retro-green' : 'text-rose-400'
                }`}>
                  {yieldVsArea >= 0 ? '+' : ''}{yieldVsArea.toFixed(1)}pp vs area avg
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-linear-text-muted/60">No rent set — enter below to calculate yield</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showInput ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="£/month"
                className="w-28 bg-linear-card border border-linear-border rounded-lg px-3 py-1.5 text-sm font-bold text-white placeholder-linear-text-muted/40 focus:outline-none focus:border-retro-green/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = parseFloat((e.target as HTMLInputElement).value);
                    if (v > 0) saveRent(v);
                  }
                  if (e.key === 'Escape') setShowInput(false);
                }}
              />
              <button
                onClick={() => {
                  const input = document.activeElement as HTMLInputElement;
                  const v = parseFloat(input.value);
                  if (v > 0) saveRent(v);
                }}
                className="px-3 py-1.5 bg-retro-green text-black rounded-lg text-[10px] font-black uppercase tracking-widest"
              >
                Save
              </button>
              <button
                onClick={() => setShowInput(false)}
                className="px-2 py-1.5 text-linear-text-muted text-[10px]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="text-[10px] font-bold text-retro-green hover:text-retro-green/80 uppercase tracking-widest"
            >
              {hasRent ? 'Edit' : '+ Add Rent'}
            </button>
          )}
        </div>
      </div>

      {/* Area-level yield chart */}
      <RentalYieldVsGiltChart />
    </div>
  );
};

export default RentalYieldVsGiltChartWithRent;
