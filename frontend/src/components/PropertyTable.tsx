import React, { useState, useEffect } from 'react';
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
  Layers,
} from 'lucide-react';
import type { PropertyWithCoords } from '../types/property';
import type { PropertyStatus } from '../hooks/usePipeline';
import AlphaBadge from './AlphaBadge';
import Tooltip from './Tooltip';
import { useComparison } from '../hooks/useComparison';
import BatchTagPanel from './BatchTagPanel';
import MarketStatusBadge from './MarketStatusBadge';

interface PropertyTableProps {
  properties: PropertyWithCoords[];
  onSortChange?: (key: string) => void;
  currentSort?: string;
  /** SORT-001: sortOrder from URL — used to initialise localSort.direction correctly on load. */
  sortOrder?: 'ASC' | 'DESC';
  onPreview?: (property: PropertyWithCoords) => void;
  onStatusChange?: (id: string, status: PropertyStatus) => void;
  getStatus?: (id: string) => PropertyStatus;
  /** UX-041: Show batch selection checkbox column — toggled via toolbar */
  showBatchCheckbox?: boolean;
  /** UX-041: Set of hidden column keys — accessible via column toggle. Defaults empty (all visible). */
  hiddenColumns?: Set<string>;
  /** UX-82: Set of selected row IDs — lives at page level to survive view-mode switch */
  batchSelected?: Set<string>;
  /** UX-82: Callback receives (id, selected) for external state updates */
  onBatchSelectedChange?: (id: string, selected: boolean) => void;
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
  sortOrder,
  onPreview,
  onStatusChange,
  getStatus,
  showBatchCheckbox = false,
  hiddenColumns = new Set(),
  batchSelected: externalBatchSelected,
  onBatchSelectedChange,
}: PropertyTableProps) => {
  const { toggleComparison, isInComparison } = useComparison();
  // UX-82: batchSelected lives at page level — survives view-mode switch
  const [internalBatchSelected, setInternalBatchSelected] = useState<Set<string>>(new Set());
  const batchSelected = externalBatchSelected ?? internalBatchSelected;
  // SORT-001 BUG #2 fix: direction is no longer hardcoded — reads from URL sortOrder.
  // Falls back to 'desc' when sortOrder is not yet set (initial render before URL is parsed).
  const [localSort, setLocalSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: currentSort || 'alpha_score',
    direction: sortOrder === 'ASC' ? 'asc' : 'desc',
  });

  // SORT-001: Keep localSort.direction in sync with URL sortOrder.
  // useState only reads initial values on mount; when the URL updates (e.g. after a
  // column-header click in PropertiesPage), sortOrder prop changes but localSort is stale.
  useEffect(() => {
    setLocalSort(prev => {
      const newDir = sortOrder === 'ASC' ? 'asc' : 'desc';
      return prev.direction === newDir ? prev : { ...prev, direction: newDir };
    });
  }, [sortOrder]);

  const toggleBatchSelect = (id: string) => {
    if (onBatchSelectedChange) {
      onBatchSelectedChange(id, !batchSelected.has(id));
    } else {
      setInternalBatchSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    }
  };

  const selectAll = () => {
    if (batchSelected.size === properties.length) {
      if (onBatchSelectedChange) {
        properties.forEach(p => onBatchSelectedChange(p.id, false));
      } else {
        setInternalBatchSelected(new Set());
      }
    } else {
      if (onBatchSelectedChange) {
        properties.forEach(p => onBatchSelectedChange(p.id, true));
      } else {
        setInternalBatchSelected(new Set(properties.map(p => p.id)));
      }
    }
  };

  const clearBatch = () => {
    if (onBatchSelectedChange) {
      batchSelected.forEach(id => onBatchSelectedChange(id, false));
    } else {
      setInternalBatchSelected(new Set());
    }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let aValue: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bValue: any;

    if (key === 'value_gap') {
      aValue = (a.list_price || 0) - (a.realistic_price || 0);
      bValue = (b.list_price || 0) - (b.realistic_price || 0);
    } else if (key === 'commute_paternoster') {
      aValue = a.commute_paternoster ?? 999;
      bValue = b.commute_paternoster ?? 999;
    } else if (key === 'commute_canada_square') {
      aValue = a.commute_canada_square ?? 999;
      bValue = b.commute_canada_square ?? 999;
    } else if (key.includes('.')) {
      const [main, sub] = key.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aValue = (a as any)[main]?.[sub];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bValue = (b as any)[main]?.[sub];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aValue = (a as any)[key];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bValue = (b as any)[key];
    }

    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    // SORT-001: user_priority is ordinal — rank 1 always at top regardless of direction.
    // This mirrors the keyboard shortcut behaviour in PropertiesPage.
    if (key === 'user_priority') {
      const rankA = (a as any).user_priority ?? 0;
      const rankB = (b as any).user_priority ?? 0;
      if (rankA === 0 && rankB === 0) return 0;
      if (rankA === 0) return 1;
      if (rankB === 0) return -1;
      return rankA - rankB;
    }
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
              {/* UX-041/UX-046: Batch checkbox — hidden by default, toggled via showBatchCheckbox prop */}
              <th className={`px-3 py-3 w-10 border-r border-linear-border/30 ${showBatchCheckbox ? '' : 'hidden'}`}>
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
              {/* UX-060: Watchlist indicator column header */}
              <th className="px-2 py-3 text-center border-r border-linear-border/30 min-w-[36px]" />
              <TableHeader
                label="Asset"
                columnKey="address"
                tooltip="Full address and acquisition area zone."
                className={`sticky bg-linear-bg/80 backdrop-blur-md z-10 min-w-[240px] ${showBatchCheckbox ? 'left-[52px]' : 'left-0'}`}
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
                tooltip='Negotiation margin: list price minus your target price. Negative = opportunity (target below list). Positive = overpaying (target above list). Sort by this column to find the best deals.'
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
                tooltip="Days on market — sourced from portal listing (Rightmove / Zoopla). Stale listings (>30d) may indicate price reductions."
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              {/* UX-043: Split Com. into Pat. (Paternoster Sq) and Can. (Canada Sq) */}
              <TableHeader
                label="Pat."
                columnKey="commute_paternoster"
                tooltip="Minutes to Paternoster Square — City of London hub."
                methodology="Walk time at ~83m/s. ≤10 min green, ≤20 min amber, >20 min neutral."
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              <TableHeader
                label="Can."
                columnKey="commute_canada_square"
                tooltip="Minutes to Canada Square — Canary Wharf hub."
                methodology="Walk time at ~83m/s. ≤10 min green, ≤20 min amber, >20 min neutral."
                className="px-2"
                onSort={handleSort}
                currentSort={localSort.key}
                direction={localSort.direction}
              />
              <TableHeader
                label="Added"
                columnKey="date_added"
                tooltip="Date this property was added to your pipeline. Sort by this to find recent entries."
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
              const isBatchSelected = batchSelected.has(property.id);

              return (
                <tr
                  key={property.id}
                  className={`hover:bg-linear-card/40 transition-colors group ${
                    status === 'shortlisted' ? 'bg-linear-accent-blue/5' :
                    status === 'vetted' ? 'bg-linear-accent-emerald/10' :
                    status === 'watchlist' ? 'bg-amber-500/5' :
                    status === 'archived' ? 'opacity-50 bg-linear-accent-rose/5' : ''
                  } ${isSelected ? 'bg-linear-accent-blue/10' : ''} ${isBatchSelected ? 'bg-blue-500/5' : ''}`}
                >
                  {/* UX-041/UX-046: Batch checkbox cell */}
                  {showBatchCheckbox && (
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
                  )}
                  {/* UX-060: Watchlist status indicator */}
                  <td
                    className="px-2 py-4 text-center border-r border-linear-border/30"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {status === 'watchlist' ? (
                      <div className="w-2 h-2 rounded-full bg-amber-400 mx-auto" title="Watchlist" />
                    ) : null}
                  </td>
                  {/* Asset / Area — sticky, with compact pipeline status dot */}
                  <td
                    className={`px-3 py-4 sticky bg-linear-bg/80 group-hover:bg-linear-card/40 z-10 min-w-[240px] border-r border-linear-border/30 cursor-pointer ${showBatchCheckbox ? 'left-[52px]' : 'left-0'}`}
                    onClick={() => onPreview && onPreview(property)}
                  >
                    <div className="flex items-start gap-2">
                      {/* UX-041: Compact pipeline status dot — next to address */}
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            status === 'shortlisted' ? 'bg-blue-400' :
                            status === 'vetted' ? 'bg-emerald-400' :
                            status === 'watchlist' ? 'bg-amber-400' :
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
                          {status === 'watchlist' && (
                            <span className="flex items-center gap-0.5 text-[8px] font-black text-amber-400 bg-amber-500/10 px-1 rounded border border-amber-500/20">
                              <Archive size={8} /> WATCHLIST
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
                  {/* UX-043: Pat. — minutes to Paternoster Square */}
                  <td className="px-2 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {property.commute_paternoster != null ? (
                      <span className={`text-[10px] font-bold ${
                        property.commute_paternoster <= 10 ? 'text-retro-green' :
                        property.commute_paternoster <= 20 ? 'text-retro-amber' :
                        'text-linear-text-muted'
                      }`}>
                        {property.commute_paternoster}
                      </span>
                    ) : '—'}
                  </td>
                  {/* UX-043: Can. — minutes to Canada Square */}
                  <td className="px-2 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {property.commute_canada_square != null ? (
                      <span className={`text-[10px] font-bold ${
                        property.commute_canada_square <= 10 ? 'text-retro-green' :
                        property.commute_canada_square <= 20 ? 'text-retro-amber' :
                        'text-linear-text-muted'
                      }`}>
                        {property.commute_canada_square}
                      </span>
                    ) : '—'}
                  </td>
                  {/* FE-274: Date Added column */}
                  <td className="px-2 py-4 text-[10px] text-linear-text-muted font-mono" onClick={(e) => e.stopPropagation()}>
                    {property.metadata?.first_seen
                      ? new Date(property.metadata.first_seen).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                      : '—'}
                  </td>
                  {/* UX-041: Appreciation — accessible via column toggle */}
                  {!hiddenColumns.has('appreciation_potential') && (
                    <td className="px-2 py-4 text-[11px] text-linear-text-muted font-bold">
                      {(property.appreciation_potential ?? 0)}%
                    </td>
                  )}
                  {/* UX-041: Bathrooms — accessible via column toggle */}
                  {!hiddenColumns.has('bathrooms') && (
                    <td className="px-2 py-4 text-[11px] text-linear-text-muted font-bold">
                      {property.bathrooms != null ? property.bathrooms : '—'}
                    </td>
                  )}
                  {/* UX-041: Market status dot — accessible via column toggle */}
                  {!hiddenColumns.has('market_status') && (
                    <td className="px-2 py-4" onClick={(e) => e.stopPropagation()}>
                      <MarketStatusBadge status={property.market_status} compact />
                    </td>
                  )}
                  {/* UX-041: Council Tax — accessible via column toggle */}
                  {!hiddenColumns.has('council_tax_band') && (
                    <td className="px-2 py-4 text-[11px] text-linear-text-muted font-bold">
                      {property.council_tax_band || '—'}
                    </td>
                  )}
                  {/* UX-041: Date Added — accessible via column toggle */}
                  {!hiddenColumns.has('metadata.first_seen') && (
                    <td className="px-2 py-4 text-[10px] text-linear-text-muted font-mono" onClick={(e) => e.stopPropagation()}>
                      {property.metadata?.first_seen
                        ? new Date(property.metadata.first_seen).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                        : '—'}
                    </td>
                  )}
                  {/* UX-041: Compact action buttons — Compare + Pipeline advance + View */}
                  <td className="px-2 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleComparison(property.id)}
                        className={`p-1.5 rounded transition-all flex items-center gap-1 ${
                          isSelected ? 'text-linear-accent-blue bg-linear-accent-blue/10' : 'text-linear-accent hover:text-white'
                        }`}
                        title={isSelected ? 'Remove from Comparison' : 'Add to Comparison'}
                      >
                        <Zap size={14} fill={isSelected ? 'currentColor' : 'none'} />
                        <span className="text-[8px] text-linear-text-muted group-hover:opacity-100 opacity-0 transition-opacity">
                          {isSelected ? '−' : '+'}
                        </span>
                      </button>
                      {/* UX-041: Single context-aware pipeline advance button */}
                      <button
                        onClick={() => {
                          if (!onStatusChange) return;
                          const next = status === 'discovered' ? 'shortlisted'
                            : status === 'shortlisted' ? 'vetted'
                            : status === 'vetted' ? 'watchlist'
                            : status === 'watchlist' ? 'archived'
                            : 'discovered';
                          onStatusChange(property.id, next);
                        }}
                        className={`p-1.5 rounded transition-all ${
                          status === 'shortlisted' ? 'text-blue-400 hover:text-white' :
                          status === 'vetted' ? 'text-emerald-400 hover:text-white' :
                          status === 'watchlist' ? 'text-amber-400 hover:text-white' :
                          status === 'archived' ? 'text-rose-400 hover:text-white' :
                          'text-linear-accent hover:text-white'
                        }`}
                        title={`Advance: ${status} → ${status === 'discovered' ? 'shortlisted' : status === 'shortlisted' ? 'vetted' : status === 'vetted' ? 'watchlist' : status === 'watchlist' ? 'archived' : 'discovered'}`}
                      >
                        {status === 'discovered' ? <Bookmark size={14} /> :
                         status === 'shortlisted' ? <ShieldCheck size={14} /> :
                         status === 'vetted' ? <ShieldCheck size={14} /> :
                         status === 'archived' ? <RotateCcw size={14} /> :
                         <Archive size={14} />}
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
