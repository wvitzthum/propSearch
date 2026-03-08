import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ExternalLink, 
  ArrowUp, 
  ArrowDown, 
  ChevronRight,
  ArrowUpDown,
  Bookmark,
  Archive,
  RotateCcw,
  Zap,
  ShieldCheck
} from 'lucide-react';
import type { PropertyWithCoords } from '../types/property';
import type { PropertyStatus } from '../hooks/usePipeline';
import AlphaBadge from './AlphaBadge';
import Tooltip from './Tooltip';
import { useComparison } from '../hooks/useComparison';

interface PropertyTableProps {
  properties: PropertyWithCoords[];
  onSortChange?: (key: string) => void;
  currentSort?: string;
  onPreview?: (property: PropertyWithCoords) => void;
  onStatusChange?: (id: string, status: PropertyStatus) => void;
  getStatus?: (id: string) => PropertyStatus;
}

const PropertyTable: React.FC<PropertyTableProps> = ({ 
  properties, 
  onSortChange, 
  currentSort,
  onPreview,
  onStatusChange,
  getStatus
}) => {
  const { toggleComparison, isInComparison } = useComparison();
  const [localSort, setLocalSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ 
    key: currentSort || 'alpha_score', 
    direction: 'desc' 
  });

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
      aValue = a.list_price - a.realistic_price;
      bValue = b.list_price - b.realistic_price;
    } else if (key === 'commute_utility') {
      aValue = a.commute_paternoster + a.commute_canada_square;
      bValue = b.commute_paternoster + b.commute_canada_square;
    } else if (key.includes('.')) {
      const parts = key.split('.');
      aValue = (a as any)[parts[0]][parts[1]];
      bValue = (b as any)[parts[0]][parts[1]];
    } else {
      aValue = (a as any)[key];
      bValue = (b as any)[key];
    }

    if (aValue < bValue) return localSort.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return localSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (localSort.key !== columnKey) return <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-40" />;
    return localSort.direction === 'asc' ? <ArrowUp size={10} className="text-blue-400" /> : <ArrowDown size={10} className="text-blue-400" />;
  };

  const TableHeader = ({ label, columnKey, tooltip, methodology, className = "" }: { label: string, columnKey: string, tooltip?: string, methodology?: string, className?: string }) => (
    <th 
      className={`px-4 py-3 text-left text-[10px] font-bold text-linear-text-muted uppercase tracking-widest cursor-pointer group hover:bg-linear-card transition-colors relative ${className}`}
      onClick={() => handleSort(columnKey)}
    >
      <Tooltip content={tooltip} methodology={methodology} className="w-full">
        <div className="flex items-center gap-1.5">
          {label}
          <SortIcon columnKey={columnKey} />
        </div>
      </Tooltip>
    </th>
  );

  return (
    <div className="bg-linear-bg border border-linear-border rounded-xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-linear-card/50 border-b border-linear-border">
              <TableHeader label="Asset / Area" columnKey="address" tooltip="Full address and acquisition area zone." className="sticky left-0 bg-linear-bg/80 backdrop-blur-md z-10" />
              <TableHeader 
                label="Alpha" 
                columnKey="alpha_score" 
                tooltip="A proprietary 0-10 composite rating representing the overall acquisition quality of an asset." 
                methodology="Weighted: Tenure (40%), Spatial Alpha (30%), Price Efficiency (30%)."
                className="px-2"
              />
              <TableHeader 
                label="Target" 
                columnKey="realistic_price" 
                tooltip="Calculated bid target based on market conditions, DoM, and area liquidity." 
                methodology="Derived from Area Average SQFT adjusted by Asset Grade and Days on Market."
                className="px-2"
              />
              <TableHeader 
                label="Gap" 
                columnKey="value_gap" 
                tooltip="Delta between list price and realistic acquisition target." 
                methodology="(Realistic Price - List Price) / List Price. Negative indicates discount capture."
                className="px-2"
              />
              <TableHeader 
                label="Eff." 
                columnKey="price_per_sqm" 
                tooltip="Pricing efficiency in GBP per square meter relative to micro-location benchmarks." 
                methodology="Total List Price / Internal Area (SQM). Benchmarked against £9,500/m²."
                className="px-2"
              />
              <TableHeader 
                label="App." 
                columnKey="appreciation_potential" 
                tooltip="Institutional forecast for 5-year capital appreciation." 
                methodology="Historical area CAGR + infrastructure investment (Crossrail) + supply constraints."
                className="px-2"
              />
              <TableHeader 
                label="Com." 
                columnKey="commute_utility" 
                tooltip="Aggregated commute utility score to City/Wharf hubs (lower is better)." 
                methodology="Door-to-desk travel time (TfL API) during morning peak (08:30)."
                className="px-2"
              />
              <TableHeader label="SQFT" columnKey="sqft" tooltip="Internal floor area in square feet." className="px-2" />
              <TableHeader label="Floor" columnKey="floor_level" tooltip="Asset floor level elevation." className="px-2" />
              <TableHeader label="EPC" columnKey="epc" tooltip="Energy Performance Certificate efficiency rating." className="px-2" />
              <TableHeader label="DoM" columnKey="dom" tooltip="Total days on market across all portal versions." className="px-2" />
              <TableHeader label="Protocol" columnKey="neg_strategy" tooltip="Recommended negotiation posture." className="px-2" />
              <th className="px-2 py-3 text-right text-[10px] font-bold text-linear-text-muted uppercase tracking-widest whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linear-border/50">
            {sortedProperties.map((property) => {
              const status = getStatus ? getStatus(property.id) : 'discovered';
              const isSelected = isInComparison(property.id);
              
              return (
                <tr 
                  key={property.id} 
                  className={`hover:bg-linear-card/40 transition-colors group cursor-pointer ${
                    status === 'shortlisted' ? 'bg-blue-500/5' : 
                    status === 'vetted' ? 'bg-emerald-500/10' : ''
                  } ${isSelected ? 'bg-blue-500/10' : ''}`}
                  onClick={() => onPreview && onPreview(property)}
                >
                  <td className="px-4 py-4 sticky left-0 bg-linear-bg/80 backdrop-blur-md group-hover:bg-linear-card/40 z-10 min-w-[280px] border-r border-linear-border/30">
                    <div className="flex flex-col">
                      <div className="text-xs font-bold text-white group-hover:text-blue-400 truncate tracking-tight transition-colors">
                        {property.address}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">{(property.area || 'Unknown').split(' (')[0]}</span>
                        {status === 'vetted' && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black text-emerald-400 bg-emerald-400/10 px-1 rounded border border-emerald-400/20">
                            <ShieldCheck size={8} /> VETTED
                          </span>
                        )}
                        {property.metadata.is_new && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black text-blue-400 bg-blue-400/10 px-1 rounded border border-blue-400/20">
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
                    <AlphaBadge score={property.alpha_score} />
                  </td>
                  <td className="px-2 py-4">
                    <div className="text-xs font-bold text-white tracking-tight">
                      £{property.realistic_price.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <div className="text-[10px] font-bold text-rose-400">
                      -£{(property.list_price - property.realistic_price).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <div className={`text-xs font-bold ${property.is_value_buy ? 'text-retro-green' : 'text-zinc-400'}`}>
                      £{property.price_per_sqm.toLocaleString()}/m²
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{property.appreciation_potential}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${property.commute_paternoster + property.commute_canada_square <= 50 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {property.commute_paternoster + property.commute_canada_square}m
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-4 text-[11px] text-linear-text-muted font-bold">
                    {property.sqft}
                  </td>
                  <td className="px-2 py-4 text-[10px] text-white font-bold uppercase tracking-widest">
                    {property.floor_level || '—'}
                  </td>
                  <td className="px-2 py-4">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
                      ['A', 'B'].includes(property.epc) ? 'text-retro-green border-retro-green/20 bg-retro-green/10' :
                      ['C', 'D'].includes(property.epc) ? 'text-retro-amber border-retro-amber/20 bg-retro-amber/10' :
                      'text-rose-400 border-rose-400/20 bg-rose-400/10'
                    }`}>
                      {property.epc}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-[11px] text-zinc-500 font-bold italic">
                    {property.dom}d
                  </td>
                  <td className="px-2 py-4">
                    <span className="px-2 py-0.5 bg-blue-400/5 text-blue-400 rounded text-[9px] font-bold border border-blue-400/10 uppercase tracking-widest whitespace-nowrap">
                      {(property.neg_strategy || 'Default').split(':')[0]}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => toggleComparison(property.id)}
                        className={`p-1 rounded transition-all ${
                          isSelected ? 'text-blue-400 bg-blue-400/10' : 'text-linear-accent hover:text-white'
                        }`}
                        title="Add to Comparison"
                      >
                        <Zap size={14} fill={isSelected ? 'currentColor' : 'none'} />
                      </button>
                      <div className="w-px h-4 bg-linear-border mx-0.5"></div>
                      <button 
                        onClick={() => onStatusChange && onStatusChange(property.id, status === 'shortlisted' ? 'discovered' : 'shortlisted')}
                        className={`p-1 rounded transition-all hover:scale-110 ${
                          status === 'shortlisted' ? 'text-blue-400' : 'text-linear-accent hover:text-white'
                        }`}
                        title="Shortlist"
                      >
                        <Bookmark size={14} fill={status === 'shortlisted' ? 'currentColor' : 'none'} />
                      </button>
                      <button 
                        onClick={() => onStatusChange && onStatusChange(property.id, status === 'vetted' ? 'shortlisted' : 'vetted')}
                        className={`p-1 rounded transition-all hover:scale-110 ${
                          status === 'vetted' ? 'text-emerald-400' : 'text-linear-accent hover:text-white'
                        }`}
                        title="Mark as Vetted"
                      >
                        <ShieldCheck size={14} fill={status === 'vetted' ? 'currentColor' : 'none'} />
                      </button>
                      <button 
                        onClick={() => onStatusChange && onStatusChange(property.id, status === 'archived' ? 'discovered' : 'archived')}
                        className={`p-1 rounded transition-all hover:scale-110 ${
                          status === 'archived' ? 'text-rose-400' : 'text-linear-accent hover:text-rose-400'
                        }`}
                        title="Archive"
                      >
                        {status === 'archived' ? <RotateCcw size={14} /> : <Archive size={14} />}
                      </button>
                      <div className="w-px h-4 bg-linear-border mx-1"></div>
                      <a 
                        href={property.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 text-linear-text-muted hover:text-white hover:bg-linear-accent rounded transition-all"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <Link 
                        to={`/property/${property.id}`}
                        className="p-1.5 text-linear-text-muted hover:text-white hover:bg-linear-accent rounded transition-all"
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
    </div>
  );
};

export default PropertyTable;
