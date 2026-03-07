import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ExternalLink, 
  ArrowUp, 
  ArrowDown, 
  MoreHorizontal,
  ChevronRight,
  TrendingUp,
  Gem
} from 'lucide-react';
import type { PropertyWithCoords } from '../hooks/useProperties';

interface PropertyTableProps {
  properties: PropertyWithCoords[];
}

type SortConfig = {
  key: keyof PropertyWithCoords | string;
  direction: 'asc' | 'desc';
};

const PropertyTable: React.FC<PropertyTableProps> = ({ properties }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'alpha_score', direction: 'desc' });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProperties = [...properties].sort((a, b) => {
    const key = sortConfig.key;
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

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <MoreHorizontal size={10} className="opacity-0 group-hover:opacity-40" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />;
  };

  const TableHeader = ({ label, columnKey, className = "" }: { label: string, columnKey: string, className?: string }) => (
    <th 
      className={`px-4 py-2.5 text-left text-[10px] font-bold text-linear-text-muted uppercase tracking-widest cursor-pointer group hover:bg-linear-card transition-colors ${className}`}
      onClick={() => handleSort(columnKey)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <SortIcon columnKey={columnKey} />
      </div>
    </th>
  );

  return (
    <div className="bg-linear-bg border border-linear-border rounded-xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-linear-card/50 border-b border-linear-border">
              <TableHeader label="Asset / Area" columnKey="address" className="sticky left-0 bg-linear-bg/80 backdrop-blur-md z-10" />
              <TableHeader label="Alpha" columnKey="alpha_score" />
              <TableHeader label="Target" columnKey="realistic_price" />
              <TableHeader label="Efficiency" columnKey="price_per_sqm" />
              <TableHeader label="SQFT" columnKey="sqft" />
              <TableHeader label="EPC" columnKey="epc" />
              <TableHeader label="DoM" columnKey="dom" />
              <TableHeader label="Strategy" columnKey="neg_strategy" />
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linear-border/50">
            {sortedProperties.map((property) => (
              <tr key={property.id} className="hover:bg-linear-card/40 transition-colors group">
                <td className="px-4 py-3 sticky left-0 bg-linear-bg/80 backdrop-blur-md group-hover:bg-linear-card/40 z-10 min-w-[280px] border-r border-linear-border/30">
                  <div className="flex flex-col">
                    <Link to={`/property/${property.id}`} className="text-xs font-semibold text-white group-hover:text-blue-400 truncate tracking-tight transition-colors">
                      {property.address}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">{property.area.split(' (')[0]}</span>
                      {property.metadata.is_new && (
                        <span className="flex items-center gap-0.5 text-[8px] font-black text-blue-400 bg-blue-400/10 px-1 rounded border border-blue-400/20">
                          NEW
                        </span>
                      )}
                      {property.is_value_buy && (
                        <span className="flex items-center gap-0.5 text-[8px] font-black text-emerald-400 bg-emerald-400/10 px-1 rounded border border-emerald-400/20">
                          VALUE
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${
                    property.alpha_score >= 8 ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' :
                    property.alpha_score >= 5 ? 'text-amber-400 border-amber-400/20 bg-amber-400/10' :
                    'text-rose-400 border-rose-400/20 bg-rose-400/10'
                  }`}>
                    {property.alpha_score.toFixed(1)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs font-bold text-white tracking-tight">
                    £{property.realistic_price.toLocaleString()}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className={`text-xs font-semibold ${property.is_value_buy ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    £{property.price_per_sqm.toLocaleString()}/m²
                  </div>
                </td>
                <td className="px-4 py-3 text-[11px] text-linear-text-muted font-medium">
                  {property.sqft}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
                    ['A', 'B'].includes(property.epc) ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' :
                    ['C', 'D'].includes(property.epc) ? 'text-amber-400 border-amber-400/20 bg-amber-400/10' :
                    'text-rose-400 border-rose-400/20 bg-rose-400/10'
                  }`}>
                    {property.epc}
                  </span>
                </td>
                <td className="px-4 py-3 text-[11px] text-zinc-500 font-bold italic">
                  {property.dom}d
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-blue-400/5 text-blue-400 rounded text-[9px] font-bold border border-blue-400/10 uppercase tracking-widest">
                    {property.neg_strategy.split(':')[0]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <a 
                      href={property.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1 text-linear-text-muted hover:text-white hover:bg-linear-accent rounded transition-all"
                    >
                      <ExternalLink size={12} />
                    </a>
                    <Link 
                      to={`/property/${property.id}`}
                      className="p-1 text-linear-text-muted hover:text-white hover:bg-linear-accent rounded transition-all"
                    >
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PropertyTable;
