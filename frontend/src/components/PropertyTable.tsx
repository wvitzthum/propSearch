import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ArrowUpDown,
  Bookmark,
  Archive,
  RotateCcw,
  Zap,
  ShieldCheck,
  CheckSquare,
  Square,
  Star,
} from 'lucide-react';
import type { PropertyWithCoords } from '../types/property';
import type { PropertyStatus } from '../hooks/usePipeline';
import AlphaBadge from './AlphaBadge';
import Tooltip from './Tooltip';
import { useComparison } from '../hooks/useComparison';
import BatchTagPanel from './BatchTagPanel';

interface PropertyTableProps {
  properties: PropertyWithCoords[];
  onSortChange?: (key: string) => void;
  currentSort?: string;
  onPreview?: (property: PropertyWithCoords) => void;
  onStatusChange?: (id: string, status: PropertyStatus) => void;
  getStatus?: (id: string) => PropertyStatus;
  // UX-034: Rank — get/set user priority rank
  getRank?: (id: string) => number | undefined;
  onRankChange?: (id: string, rank: number | null) => void;
  /** UX-046: Show batch selection checkbox column — hidden by default, toggled via toolbar */
  showBatchCheckbox?: boolean;
}

const SortIcon = ({ 
  columnKey, 
  currentSort, 
  direction 
}: { 
  columnKey: string, 
  currentSort: string, 
  direction: 'asc' | 'desc' 
}) => {
  if (currentSort !== columnKey) return <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-40" />;
  return direction === 'asc' ? <ArrowUp size={10} className="text-linear-accent-blue" /> : <ArrowDown size={10} className="text-linear-accent-blue" />;
};

const TableHeader = ({ 
  label, 
  columnKey, 
  tooltip, 
  methodology, 
  className = "", 
  onSort, 
  currentSort, 
  direction,
  rowSpan,
  colSpan
}: { 
  label: string, 
  columnKey: string, 
  tooltip?: string, 
  methodology?: string, 
  className?: string,
  onSort: (key: string) => void,
  currentSort: string,
  direction: 'asc' | 'desc',
  rowSpan?: number,
  colSpan?: number
}) => (
  <th 
    className={`px-3 py-3 text-left text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.1em] cursor-pointer group hover:bg-linear-card transition-colors relative ${className}`}
    onClick={() => onSort(columnKey)}
    rowSpan={rowSpan}
    colSpan={colSpan}
  >
    <Tooltip content={tooltip} methodology={methodology} className="w-full">
      <div className="flex items-center gap-1.5">
        {label}
        <SortIcon columnKey={columnKey} currentSort={currentSort} direction={direction} />
      </div>
    </Tooltip>
  </th>
);

const PropertyTable: React.FC<PropertyTableProps> = ({
  properties,
  onSortChange,
  currentSort,
  onPreview,
  onStatusChange,
  getStatus,
  getRank,
  onRankChange,
  showBatchCheckbox = false,
}) => {
  const { toggleComparison, isInComparison } = useComparison();
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [localSort, setLocalSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: currentSort || 'alpha_score',
    direction: 'desc'
  });

  const toggleBatchSelect = (id: string) => {
    setBatchSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (batchSelected.size === properties.length) {
      setBatchSelected(new Set());
    } else {
      setBatchSelected(new Set(properties.map(p => p.id)));
    }
  };

  const clearBatch = () => {
    setBatchSelected(new Set());
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (localSort.key === key && localSort.direction === 'asc') {
      direction = 'desc';
    }
    setLocalSort({ key, direction });
    if (onSortChange) onSortChange(key);
  };

  const sortedProperties = [...properties].sort((a, b) => {
    const key = localSort.key;
    let aValue: any;
    let bValue: any;

    if (key === 'value_gap') {
      aValue = (a.list_price || 0) - (a.realistic_price || 0);
      bValue = (b.list_price || 0) - (b.realistic_price || 0);
    } else if (key === 'commute_utility') {
      aValue = (a.commute_paternoster || 0) + (a.commute_canada_square || 0);
      bValue = (b.commute_paternoster || 0) + (b.commute_canada_square || 0);
    } else if (key.includes('.')) {
      const [main, sub] = key.split('.') as [keyof PropertyWithCoords, string];
      aValue = (a[main] as any)?.[sub];
      bValue = (b[main] as any)?.[sub];
    } else {
      aValue = (a as any)[key];
      bValue = (b as any)[key];
    }

    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    if (aValue < bValue) return localSort.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return localSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="bg-linear-bg border border-linear-border rounded-xl overflow-hidden shadow-2xl">
      {/* Batch Selection Header */}
      {batchSelected.size > 0 && (
        <div className="px-4 py-3 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Layers size={16} className="text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-widest">
                {batchSelected.size} Selected
              </div>
              <div className="text-[10px] text-blue-400">
                Batch tagging mode active
              </div>
            </div>
          </div>
          <button
            onClick={clearBatch}
            className="px-3 py-1.5 text-[10px] font-bold text-white bg-blue-500/20 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
          >
            Cancel Selection
          </button>
        </div>
      )}

      {/* Mobile scroll affordance — right-edge fade hint */}
      <div className="relative">
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-linear-bg to-transparent z-20 pointer-events-none md:hidden" />
        {/* Mobile scroll hint — shown on small screens */}
        <div className="flex items-center gap-1 px-4 py-1.5 bg-linear-card/30 border-b border-linear-border/30 md:hidden">
          <div className="h-1 w-1 rounded-full bg-linear-text-muted/40 animate-pulse" />
          <span className="text-[8px] text-linear-text-muted/40 font-bold uppercase tracking-widest">
            Scroll right for more columns
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
          {/* UX-041: Redesigned header — 8 default columns + Actions. Single header row, no sub-header groups. */}
          <thead>
            <tr className="bg-linear-card/50 border-b border-linear-border">
              {/* UX-034: Rank column header — click to sort by user priority */}
              <th
                className="px-2 py-3 text-center text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.1em] cursor-pointer group hover:bg-linear-card transition-colors relative border-r border-linear-border/30 min-w-[44px]"
                onClick={() => onSortChange?.('user_priority')}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span>Rk</span>
                  <SortIcon columnKey="user_priority" currentSort={localSort.key} direction={localSort.direction} />
                </div>
              </th>
              <TableHeader
                label="Asset"
                columnKey="address"
                tooltip="Full address and acquisition area zone."
                className="sticky left-0 bg-linear-bg/80 backdrop-blur-md z-10 min-w-[240px]"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              <TableHeader
                label="Alpha"
                columnKey="alpha_score"
                tooltip="A proprietary 0-10 composite rating representing the overall acquisition quality of an asset."
                methodology="Weighted: Tenure (40%), Spatial Alpha (30%), Price Efficiency (30%)."
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              <TableHeader
                label="Target"
                columnKey="realistic_price"
                tooltip="Calculated bid target based on market conditions, DoM, and area liquidity."
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              <TableHeader
                label="Gap"
                columnKey="value_gap"
                tooltip="Delta between list price and realistic acquisition target."
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              <TableHeader
                label="SQFT"
                columnKey="sqft"
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              <TableHeader
                label="Bed"
                columnKey="bedrooms"
                tooltip="Number of bedrooms (decimal for en-suite/double rooms)."
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              <TableHeader
                label="EPC"
                columnKey="epc"
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              <TableHeader
                label="DoM"
                columnKey="dom"
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              <th className="px-2 py-3 text-right text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.1em] whitespace-nowrap">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linear-border/50">
            {sortedProperties.map((property) => {
              const status = getStatus ? getStatus(property.id) : 'discovered';
              const isSelected = isInComparison(property.id);
              const propTags = getTags(property.id);
              const isBatchSelected = batchSelected.has(property.id);

              return (
                <tr
                  key={property.id}
                  className={`hover:bg-linear-card/40 transition-colors group ${
                    status === 'shortlisted' ? 'bg-linear-accent-blue/5' :
                    status === 'vetted' ? 'bg-linear-accent-emerald/10' :
                    status === 'archived' ? 'opacity-50 bg-linear-accent-rose/5' : ''
                  } ${isSelected ? 'bg-linear-accent-blue/10' : ''} ${isBatchSelected ? 'bg-blue-500/5' : ''}`}
                >
                  {/* UX-034: Rank cell — click to assign/remove rank */}
                  <td
                    className="px-2 py-4 text-center border-r border-linear-border/30"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {getRank ? (
                      <button
                        onClick={() => {
                          const currentRank = getRank(property.id);
                          if (currentRank !== undefined) {
                            onRankChange?.(property.id, null);
                          } else {
                            let count = 0;
                            for (const p of properties) {
                              if (getRank(p.id) !== undefined) count++;
                            }
                            onRankChange?.(property.id, count + 1);
                          }
                        }}
                        className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-black transition-all ${
                          getRank(property.id) !== undefined
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'text-linear-text-muted/40 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20'
                        }`}
                        title={getRank(property.id) !== undefined ? `Rank ${getRank(property.id)} — click to remove` : 'Assign rank'}
                      >
                        {getRank(property.id) !== undefined ? (
                          getRank(property.id) === 1 ? (
                            <div className="flex items-center justify-center gap-0.5">
                              <Star size={9} className="text-amber-400 fill-amber-400" />
                              <span>{getRank(property.id)}</span>
                            </div>
                          ) : (
                            getRank(property.id)
                          )
                        ) : '—'}
                      </button>
                    ) : null}
                  </td>
                  {/* Asset / Area — sticky, with compact pipeline status dot */}
                  <td
                    className="px-3 py-4 sticky left-0 bg-linear-bg/80 group-hover:bg-linear-card/40 z-10 min-w-[240px] border-r border-linear-border/30 cursor-pointer"
                    onClick={() => onPreview && onPreview(property)}
                  >
                    <div className="flex items-start gap-2">
                      {/* UX-041: Compact pipeline status dot — next to address */}
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            status === 'shortlisted' ? 'bg-blue-400' :
                            status === 'vetted' ? 'bg-emerald-400' :
                            status === 'archived' ? 'bg-rose-400' :
                            'bg-zinc-500'
                          }`}
                          title={`Pipeline: ${status}`}
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="text-[11px] font-bold text-linear-text-primary group-hover:text-linear-accent-blue truncate tracking-tight transition-colors">
                          {property.address}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-wider">{(property.area || 'Unknown').split(' (')[0]}</span>
                          {status === 'vetted' && (
                            <span className="flex items-center gap-0.5 text-[8px] font-black text-linear-accent-emerald bg-linear-accent-emerald/10 px-1 rounded border border-linear-accent-emerald/20">
                              <ShieldCheck size={8} /> VETTED
                            </span>
                          )}
                          {property.metadata?.is_new && (
                            <span className="flex items-center gap-0.5 text-[8px] font-black text-linear-accent-blue bg-linear-accent-blue/10 px-1 rounded border border-linear-accent-blue/20">
                              NEW
                            </span>
                          )}
                          {status === 'archived' && (
                            <span className="flex items-center gap-0.5 text-[8px] font-black text-linear-accent-rose bg-linear-accent-rose/10 px-1 rounded border border-linear-accent-rose/20">
                              <Archive size={8} /> ARCHIVED
                            </span>
                          )}
                          {property.is_value_buy && (
                            <span className="flex items-center gap-0.5 text-[8px] font-black text-retro-green bg-retro-green/10 px-1 rounded border border-retro-green/20">
                              VALUE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Alpha score */}
                  <td className="px-2 py-4">
                    <AlphaBadge
                      score={property.alpha_score}
                      shallowFields={
                        !property.sqft || !property.epc || property.service_charge === undefined
                          ? [
                              ...(!property.sqft ? ['sqft'] : []),
                              ...(!property.epc ? ['EPC'] : []),
                              ...(property.service_charge === undefined ? ['service charge'] : []),
                            ]
                          : []
                      }
                    />
                  </td>
                  {/* Target — realistic price */}
                  <td className="px-2 py-4">
                    <div className="text-[11px] font-bold text-linear-text-primary tracking-tighter">
                      £{(property.realistic_price || 0).toLocaleString()}
                    </div>
                  </td>
                  {/* Value Gap — percentage below/above list */}
                  <td className="px-2 py-4">
                    {(() => {
                      const list = property.list_price || 0;
                      const realistic = property.realistic_price || 0;
                      const delta = list - realistic;
                      const pct = list > 0 ? (delta / list) * 100 : 0;
                      const isOpportunity = delta > 0;
                      return (
                        <div className="flex flex-col items-center">
                          <div className={`text-[10px] font-bold tracking-tight ${isOpportunity ? 'text-retro-green' : 'text-rose-400'}`}>
                            {isOpportunity ? '-' : '+'}{Math.abs(pct).toFixed(1)}%
                          </div>
                          <div className="text-[7px] text-linear-text-muted">{isOpportunity ? 'below' : 'above'}</div>
                        </div>
                      );
                    })()}
                  </td>
                  {/* SQFT */}
                  <td className="px-2 py-4 text-[11px] text-linear-text-muted font-bold">
                    {property.sqft || '—'}
                  </td>
                  {/* Bedrooms */}
                  <td className="px-2 py-4 text-[11px] text-linear-text-muted font-bold">
                    {property.bedrooms != null ? property.bedrooms : '—'}
                  </td>
                  {/* EPC */}
                  <td className="px-2 py-4">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
                      ['A', 'B'].includes(property.epc || '') ? 'text-retro-green border-retro-green/20 bg-retro-green/10' :
                      ['C', 'D'].includes(property.epc || '') ? 'text-retro-amber border-retro-amber/20 bg-retro-amber/10' :
                      'text-linear-accent-rose border-linear-accent-rose/20 bg-linear-accent-rose/10'
                    }`}>
                      {property.epc || 'N/A'}
                    </span>
                  </td>
                  {/* Days on Market */}
                  <td className="px-2 py-4 text-[11px] text-linear-text-muted font-bold">
                    {property.dom || 0}d
                  </td>
                  {/* UX-041: Compact action buttons — Compare + Pipeline advance + View */}
                  <td className="px-2 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleComparison(property.id)}
                        className={`p-1.5 rounded transition-all ${
                          isSelected ? 'text-linear-accent-blue bg-linear-accent-blue/10' : 'text-linear-accent hover:text-white'
                        }`}
                        title={isSelected ? 'Remove from Comparison' : 'Add to Comparison'}
                      >
                        <Zap size={14} fill={isSelected ? 'currentColor' : 'none'} />
                      </button>
                      {/* UX-041: Single context-aware pipeline advance button */}
                      <button
                        onClick={() => {
                          if (!onStatusChange) return;
                          const next = status === 'discovered' ? 'shortlisted'
                            : status === 'shortlisted' ? 'vetted'
                            : status === 'archived' ? 'discovered'
                            : 'archived';
                          onStatusChange(property.id, next);
                        }}
                        className={`p-1.5 rounded transition-all ${
                          status === 'shortlisted' ? 'text-blue-400 hover:text-white' :
                          status === 'vetted' ? 'text-emerald-400 hover:text-white' :
                          status === 'archived' ? 'text-rose-400 hover:text-white' :
                          'text-linear-accent hover:text-white'
                        }`}
                        title={`Pipeline: ${status} → click to advance`}
                      >
                        {status === 'discovered' ? <Bookmark size={14} /> :
                         status === 'shortlisted' ? <ShieldCheck size={14} /> :
                         status === 'archived' ? <RotateCcw size={14} /> :
                         <ShieldCheck size={14} />}
                      </button>
                      <Link
                        to={`/property/${property.id}`}
                        className="p-1.5 text-linear-text-muted hover:text-white hover:bg-linear-accent rounded transition-all"
                      >
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>

      {/* Batch Tag Panel */}
      {batchSelected.size > 0 && (
        <BatchTagPanel
          selectedIds={Array.from(batchSelected)}
          onClose={clearBatch}
          onComplete={() => {}}
        />
      )}
    </div>
  );
};

export default PropertyTable;
