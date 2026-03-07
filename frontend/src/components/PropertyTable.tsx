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
  RotateCcw
} from 'lucide-react';
import type { PropertyWithCoords } from '../hooks/useProperties';
import type { PropertyStatus } from '../hooks/usePipeline';
import AlphaBadge from './AlphaBadge';

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

    if (key.includes('.')) {
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

  const TableHeader = ({ label, columnKey, tooltip, className = "" }: { label: string, columnKey: string, tooltip?: string, className?: string }) => (
    <th 
      className={`px-4 py-3 text-left text-[10px] font-bold text-linear-text-muted uppercase tracking-widest cursor-pointer group hover:bg-linear-card transition-colors relative ${className}`}
      onClick={() => handleSort(columnKey)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <SortIcon columnKey={columnKey} />
      </div>
      {tooltip && (
        <div className="absolute top-0 left-0 w-full h-full group-hover:block hidden pointer-events-none">
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-linear-card border border-linear-border rounded shadow-xl text-[9px] normal-case tracking-normal text-linear-text-muted z-20 pointer-events-auto backdrop-blur-md">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-linear-border" />
          </div>
        </div>
      )}
    </th>
  );

  return (
    <div className="bg-linear-bg border border-linear-border rounded-xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-linear-card/50 border-b border-linear-border">
              <TableHeader label="Asset / Area" columnKey="address" tooltip="Full address and acquisition area zone." className="sticky left-0 bg-linear-bg/80 backdrop-blur-md z-10" />
              <TableHeader label="Alpha" columnKey="alpha_score" tooltip="Investment grade score (0-10) based on location, efficiency, and appreciation potential." />
              <TableHeader label="Target" columnKey="realistic_price" tooltip="Calculated bid target based on market conditions." />
              <TableHeader label="Efficiency" columnKey="price_per_sqm" tooltip="Pricing efficiency in GBP per square meter." />
              <TableHeader label="SQFT" columnKey="sqft" tooltip="Internal floor area in square feet." />
              <TableHeader label="Paternoster" columnKey="commute_paternoster" tooltip="Travel time to St Paul's via public transport (mins)." />
              <TableHeader label="Canada Sq" columnKey="commute_canada_square" tooltip="Travel time to Canary Wharf via public transport (mins)." />
              <TableHeader label="EPC" columnKey="epc" tooltip="Energy Performance Certificate rating." />
              <TableHeader label="DoM" columnKey="dom" tooltip="Total days on market." />
              <TableHeader label="Protocol" columnKey="neg_strategy" tooltip="Recommended negotiation and acquisition protocol." />
              <th className="px-4 py-3 text-right text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linear-border/50">
            {sortedProperties.map((property) => {
              const status = getStatus ? getStatus(property.id) : 'discovered';
              return (
                <tr 
                  key={property.id} 
                  className={`hover:bg-linear-card/40 transition-colors group cursor-pointer ${
                    status === 'shortlisted' ? 'bg-blue-500/5' : ''
                  }`}
                  onClick={() => onPreview && onPreview(property)}
                >
                  <td className="px-4 py-4 sticky left-0 bg-linear-bg/80 backdrop-blur-md group-hover:bg-linear-card/40 z-10 min-w-[280px] border-r border-linear-border/30">
                    <div className="flex flex-col">
                      <div className="text-xs font-bold text-white group-hover:text-blue-400 truncate tracking-tight transition-colors">
                        {property.address}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">{property.area.split(' (')[0]}</span>
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
                  <td className="px-4 py-4">
                    <AlphaBadge score={property.alpha_score} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs font-bold text-white tracking-tight">
                      £{property.realistic_price.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={`text-xs font-bold ${property.is_value_buy ? 'text-retro-green' : 'text-zinc-400'}`}>
                      £{property.price_per_sqm.toLocaleString()}/m²
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[11px] text-linear-text-muted font-bold">
                    {property.sqft}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${property.commute_paternoster <= 20 ? 'text-emerald-400' : property.commute_paternoster <= 30 ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {property.commute_paternoster}m
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${property.commute_canada_square <= 30 ? 'text-emerald-400' : property.commute_canada_square <= 45 ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {property.commute_canada_square}m
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
                      ['A', 'B'].includes(property.epc) ? 'text-retro-green border-retro-green/20 bg-retro-green/10' :
                      ['C', 'D'].includes(property.epc) ? 'text-retro-amber border-retro-amber/20 bg-retro-amber/10' :
                      'text-rose-400 border-rose-400/20 bg-rose-400/10'
                    }`}>
                      {property.epc}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[11px] text-zinc-500 font-bold italic">
                    {property.dom}d
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-0.5 bg-blue-400/5 text-blue-400 rounded text-[9px] font-bold border border-blue-400/10 uppercase tracking-widest">
                      {property.neg_strategy.split(':')[0]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onStatusChange && onStatusChange(property.id, status === 'shortlisted' ? 'discovered' : 'shortlisted')}
                        className={`p-1 rounded transition-all ${
                          status === 'shortlisted' ? 'text-blue-400' : 'text-linear-accent hover:text-white'
                        }`}
                      >
                        <Bookmark size={14} fill={status === 'shortlisted' ? 'currentColor' : 'none'} />
                      </button>
                      <button 
                        onClick={() => onStatusChange && onStatusChange(property.id, status === 'archived' ? 'discovered' : 'archived')}
                        className={`p-1 rounded transition-all ${
                          status === 'archived' ? 'text-rose-400' : 'text-linear-accent hover:text-rose-400'
                        }`}
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
