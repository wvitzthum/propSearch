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
  Layers
} from 'lucide-react';
import type { PropertyWithCoords } from '../types/property';
import type { PropertyStatus } from '../hooks/usePipeline';
import AlphaBadge from './AlphaBadge';
import Tooltip from './Tooltip';
import { useComparison } from '../hooks/useComparison';
import { useThesisTags } from '../hooks/useThesisTags';
import ThesisTagBadge from './ThesisTagBadge';
import ThesisTagSelector from './ThesisTagSelector';
import BatchTagPanel from './BatchTagPanel';
import LTVMatchBadge from './LTVMatchBadge';
import { useAffordability } from '../hooks/useAffordability';

interface PropertyTableProps {
  properties: PropertyWithCoords[];
  onSortChange?: (key: string) => void;
  currentSort?: string;
  onPreview?: (property: PropertyWithCoords) => void;
  onStatusChange?: (id: string, status: PropertyStatus) => void;
  getStatus?: (id: string) => PropertyStatus;
  showThesisTags?: boolean;
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
  showThesisTags = true
}) => {
  const { toggleComparison, isInComparison } = useComparison();
  const { getTags } = useThesisTags();
  const { getLTVMatchScore } = useAffordability();
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

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-linear-card/50 border-b border-linear-border">
              {/* Batch Select Checkbox */}
              <th className="px-3 py-3 w-10 border-r border-linear-border/30">
                <button
                  onClick={selectAll}
                  className="flex items-center justify-center text-linear-text-muted hover:text-white transition-colors"
                  title={batchSelected.size === properties.length ? 'Deselect all' : 'Select all'}
                >
                  {batchSelected.size === properties.length && properties.length > 0 ? (
                    <CheckSquare size={16} className="text-blue-400" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              <TableHeader
                label="Asset / Area"
                columnKey="address"
                tooltip="Full address and acquisition area zone."
                className="sticky left-10 bg-linear-bg/80 backdrop-blur-md z-10"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
                rowSpan={2}
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
                rowSpan={2}
              />
              <th colSpan={2} className="px-2 py-2 bg-linear-accent/5 border-x border-linear-border/30 text-center text-[8px] font-bold text-linear-text-muted uppercase tracking-widest border-b border-linear-border/30">
                Acquisition Model
              </th>
              <TableHeader
                label="Eff."
                columnKey="price_per_sqm"
                tooltip="Pricing efficiency in GBP per square meter relative to micro-location benchmarks."
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
                rowSpan={2}
              />
              <TableHeader
                label="App."
                columnKey="appreciation_potential"
                tooltip="Institutional forecast for 5-year capital appreciation."
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
                rowSpan={2}
              />
              <TableHeader
                label="Com."
                columnKey="commute_utility"
                tooltip="Aggregated commute utility score to City/Wharf hubs (lower is better)."
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
                rowSpan={2}
              />
              <TableHeader 
                label="SQFT" 
                columnKey="sqft" 
                className="px-2" 
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
                rowSpan={2}
              />
              <TableHeader 
                label="EPC" 
                columnKey="epc" 
                className="px-2" 
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
                rowSpan={2}
              />
              <TableHeader
                label="DoM"
                columnKey="dom"
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
                rowSpan={2}
              />
              <th rowSpan={2} className="px-2 py-3 text-center text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.1em] whitespace-nowrap min-w-[80px]">
                LTV
              </th>
              {showThesisTags && (
                <th rowSpan={2} className="px-2 py-3 text-center text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.1em] whitespace-nowrap min-w-[100px]">
                  Thesis
                </th>
              )}
              <th rowSpan={2} className="px-2 py-3 text-right text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.1em] whitespace-nowrap">Action</th>
            </tr>
            <tr className="bg-linear-card/30 border-b border-linear-border">
              {/* Empty cell for batch checkbox */}
              <th className="border-r border-linear-border/30"></th>
              <TableHeader
                label="Target"
                columnKey="realistic_price"
                tooltip="Calculated bid target based on market conditions, DoM, and area liquidity."
                className="border-l border-linear-border/30"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              <TableHeader
                label="Gap"
                columnKey="value_gap"
                tooltip="Delta between list price and realistic acquisition target."
                className="border-r border-linear-border/30"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              {/* Empty cells for remaining columns */}
              <th className="border-r border-linear-border/30"></th>
              <th className="border-r border-linear-border/30"></th>
              <th className="border-r border-linear-border/30"></th>
              <th className="border-r border-linear-border/30"></th>
              <th className="border-r border-linear-border/30"></th>
              <th className="border-r border-linear-border/30"></th>
              {showThesisTags && <th className="border-r border-linear-border/30"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-linear-border/50">
            {sortedProperties.map((property) => {
              const status = getStatus ? getStatus(property.id) : 'discovered';
              const isSelected = isInComparison(property.id);
              const isShallow = !property.sqft || !property.epc || property.service_charge === undefined;
              const propTags = getTags(property.id);
              const isBatchSelected = batchSelected.has(property.id);

              return (
                <tr
                  key={property.id}
                  className={`hover:bg-linear-card/40 transition-colors group ${
                    status === 'shortlisted' ? 'bg-linear-accent-blue/5' :
                    status === 'vetted' ? 'bg-linear-accent-emerald/10' : ''
                  } ${isSelected ? 'bg-linear-accent-blue/10' : ''} ${isBatchSelected ? 'bg-blue-500/5' : ''}`}
                >
                  {/* Batch Select Checkbox */}
                  <td
                    className="px-3 py-4 w-10 border-r border-linear-border/30"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => toggleBatchSelect(property.id)}
                      className={`flex items-center justify-center transition-colors ${
                        isBatchSelected ? 'text-blue-400' : 'text-linear-text-muted hover:text-white'
                      }`}
                    >
                      {isBatchSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>
                  {/* Address Column */}
                  <td
                    className="px-4 py-4 sticky left-10 bg-linear-bg/80 group-hover:bg-linear-card/40 z-10 min-w-[280px] border-r border-linear-border/30 cursor-pointer"
                    onClick={() => onPreview && onPreview(property)}
                  >
                    <div className="flex flex-col">
                      <div className="text-[11px] font-bold text-linear-text-primary group-hover:text-linear-accent-blue truncate tracking-tight transition-colors">
                        {property.address}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-wider">{(property.area || 'Unknown').split(' (')[0]}</span>
                        {status === 'vetted' && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black text-linear-accent-emerald bg-linear-accent-emerald/10 px-1 rounded border border-linear-accent-emerald/20">
                            <ShieldCheck size={8} /> VETTED
                          </span>
                        )}
                        {property.metadata.is_new && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black text-linear-accent-blue bg-linear-accent-blue/10 px-1 rounded border border-linear-accent-blue/20">
                            NEW
                          </span>
                        )}
                        {property.is_value_buy && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black text-retro-green bg-retro-green/10 px-1 rounded border border-retro-green/20">
                            VALUE
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <AlphaBadge score={property.alpha_score} />
                      {isShallow && (
                        <span className="text-[7px] font-black text-retro-amber bg-retro-amber/10 px-1 rounded border border-retro-amber/20 tracking-tighter uppercase">
                          Shallow Data
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-4 bg-linear-accent/5 border-l border-linear-border/30">
                    <div className="text-[11px] font-bold text-linear-text-primary tracking-tighter text-center">
                      £{(property.realistic_price || 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-2 py-4 bg-linear-accent/5 border-r border-linear-border/30">
                    <div className={`text-[10px] font-bold text-center ${ (property.list_price - property.realistic_price) > 0 ? 'text-linear-accent-rose' : 'text-linear-accent-emerald'}`}>
                      { (property.list_price - property.realistic_price) > 0 ? '-' : '+' }£{Math.abs( (property.list_price || 0) - (property.realistic_price || 0) ).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <div className={`text-[11px] font-bold ${property.is_value_buy ? 'text-retro-green' : 'text-linear-text-muted'}`}>
                      £{(property.price_per_sqm || 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-linear-text-primary">{(property.appreciation_potential || 0)}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold ${( (property.commute_paternoster || 0) + (property.commute_canada_square || 0) ) <= 50 ? 'text-linear-accent-emerald' : 'text-linear-text-muted'}`}>
                        {( (property.commute_paternoster || 0) + (property.commute_canada_square || 0) )}m
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-4 text-[11px] text-linear-text-muted font-bold">
                    {property.sqft || '—'}
                  </td>
                  <td className="px-2 py-4">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
                      ['A', 'B'].includes(property.epc || '') ? 'text-retro-green border-retro-green/20 bg-retro-green/10' :
                      ['C', 'D'].includes(property.epc || '') ? 'text-retro-amber border-retro-amber/20 bg-retro-amber/10' :
                      'text-linear-accent-rose border-linear-accent-rose/20 bg-linear-accent-rose/10'
                    }`}>
                      {property.epc || 'N/A'}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-[11px] text-zinc-500 font-bold italic">
                    {property.dom || 0}d
                  </td>
                  <td className="px-2 py-4" onClick={(e) => e.stopPropagation()}>
                    <LTVMatchBadge score={getLTVMatchScore(property.realistic_price)} />
                  </td>
                  {showThesisTags && (
                    <td className="px-2 py-4" onClick={(e) => e.stopPropagation()}>
                      {propTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                          {propTags.slice(0, 2).map(tag => (
                            <ThesisTagBadge key={tag} tag={tag} size="sm" />
                          ))}
                          {propTags.length > 2 && (
                            <span className="text-[8px] text-linear-text-muted">+{propTags.length - 2}</span>
                          )}
                          <ThesisTagSelector
                            propertyId={property.id}
                            currentTags={propTags}
                            size="sm"
                          />
                        </div>
                      ) : (
                        <ThesisTagSelector
                          propertyId={property.id}
                          currentTags={[]}
                          size="sm"
                        />
                      )}
                    </td>
                  )}
                  <td className="px-2 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => toggleComparison(property.id)}
                        className={`p-1 rounded transition-all ${
                          isSelected ? 'text-linear-accent-blue bg-linear-accent-blue/10' : 'text-linear-accent hover:text-linear-text-primary'
                        }`}
                        title="Add to Comparison"
                      >
                        <Zap size={14} fill={isSelected ? 'currentColor' : 'none'} />
                      </button>
                      <div className="w-px h-4 bg-linear-border mx-0.5"></div>
                      <button 
                        onClick={() => onStatusChange && onStatusChange(property.id, status === 'shortlisted' ? 'discovered' : 'shortlisted')}
                        className={`p-1 rounded transition-all hover:scale-110 ${
                          status === 'shortlisted' ? 'text-linear-accent-blue' : 'text-linear-accent hover:text-linear-text-primary'
                        }`}
                        title="Shortlist"
                      >
                        <Bookmark size={14} fill={status === 'shortlisted' ? 'currentColor' : 'none'} />
                      </button>
                      <button 
                        onClick={() => onStatusChange && onStatusChange(property.id, status === 'vetted' ? 'shortlisted' : 'vetted')}
                        className={`p-1 rounded transition-all hover:scale-110 ${
                          status === 'vetted' ? 'text-linear-accent-emerald' : 'text-linear-accent hover:text-linear-text-primary'
                        }`}
                        title="Mark as Vetted"
                      >
                        <ShieldCheck size={14} fill={status === 'vetted' ? 'currentColor' : 'none'} />
                      </button>
                      <button 
                        onClick={() => onStatusChange && onStatusChange(property.id, status === 'archived' ? 'discovered' : 'archived')}
                        className={`p-1 rounded transition-all hover:scale-110 ${
                          status === 'archived' ? 'text-linear-accent-rose' : 'text-linear-accent hover:text-linear-accent-rose'
                        }`}
                        title="Archive"
                      >
                        {status === 'archived' ? <RotateCcw size={14} /> : <Archive size={14} />}
                      </button>
                      <div className="w-px h-4 bg-linear-border mx-1"></div>
                      <Link 
                        to={`/property/${property.id}`}
                        className="p-1.5 text-linear-text-muted hover:text-linear-text-primary hover:bg-linear-accent rounded transition-all"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
