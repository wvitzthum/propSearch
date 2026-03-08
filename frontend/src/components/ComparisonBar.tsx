import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, ArrowRight, LayoutGrid } from 'lucide-react';
import { useComparison } from '../hooks/useComparison';
import { usePropertyContext } from '../hooks/PropertyContext';

const ComparisonBar: React.FC = () => {
  const location = useLocation();
  const { selectedIds, toggleComparison, clearComparison, count } = useComparison();
  const { properties } = usePropertyContext();

  if (count === 0 || location.pathname === '/compare') return null;

  const selectedProperties = properties.filter(p => selectedIds.includes(p.id));

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-black/80 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] p-2 pr-6 flex items-center gap-6 ring-1 ring-white/10">
        <div className="flex items-center gap-2 pl-2">
          {selectedProperties.map(p => (
            <div key={p.id} className="relative group/item">
              <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                <img src={p.image_url} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <button 
                onClick={() => toggleComparison(p.id)}
                className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white rounded-full flex items-center justify-center border border-black shadow-xl opacity-0 group-hover/item:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          
          {/* Placeholder slots to show limit */}
          {Array.from({ length: 4 - count }).map((_, i) => (
            <div key={i} className="h-12 w-12 rounded-xl border border-dashed border-white/10 bg-white/5 flex items-center justify-center text-white/10">
              <LayoutGrid size={14} />
            </div>
          ))}
        </div>

        <div className="h-8 w-px bg-white/10" />

        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Comparison Matrix</span>
            <span className="text-[9px] text-white/40 font-bold uppercase">{count} Assets Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={clearComparison}
              className="px-4 py-2 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-colors"
            >
              Reset
            </button>
            <Link 
              to="/compare"
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all active:scale-95"
            >
              Execute Analytics <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonBar;
