import React, { useMemo } from 'react';
import { X, ExternalLink, Zap, TrendingUp, Maximize2, Scale, Info, Bookmark, LayoutGrid, Clock, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePropertyContext } from '../hooks/PropertyContext';
import { useComparison } from '../hooks/useComparison';
import type { PropertyWithCoords } from '../types/property';
import AlphaBadge from '../components/AlphaBadge';
import PropertyImage from '../components/PropertyImage';

interface MatrixRowConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  mode: 'min' | 'max' | 'none';
  isCurrency?: boolean;
  suffix?: string;
  getValue: (p: PropertyWithCoords) => number;
  render: (p: PropertyWithCoords) => React.ReactNode;
}

const MATRIX_ROWS: MatrixRowConfig[] = [
  {
    id: 'alpha_score',
    label: 'Alpha Score',
    icon: <TrendingUp size={12} />,
    mode: 'max',
    getValue: (p) => p.alpha_score,
    render: (p) => <AlphaBadge score={p.alpha_score} />
  },
  {
    id: 'realistic_price',
    label: 'Target Price',
    icon: <Zap size={12} />,
    mode: 'min',
    isCurrency: true,
    getValue: (p) => p.realistic_price,
    render: (p) => <div className="text-sm font-bold tracking-tight">£{p.realistic_price.toLocaleString()}</div>
  },
  {
    id: 'price_per_sqm',
    label: 'Efficiency',
    icon: <Scale size={12} />,
    mode: 'min',
    isCurrency: true,
    getValue: (p) => p.price_per_sqm,
    render: (p) => <div className="text-sm font-bold tracking-tight">£{p.price_per_sqm.toLocaleString()}/m²</div>
  },
  {
    id: 'sqft',
    label: 'Internal Area',
    icon: <Maximize2 size={12} />,
    mode: 'max',
    getValue: (p) => p.sqft,
    render: (p) => <div className="text-sm font-bold tracking-tight">{p.sqft} SQFT</div>
  },
  {
    id: 'appreciation',
    label: 'Appreciation',
    icon: <TrendingUp size={12} />,
    mode: 'max',
    suffix: '%',
    getValue: (p) => p.appreciation_potential,
    render: (p) => <div className="text-sm font-bold tracking-tight">{p.appreciation_potential}%</div>
  },
  {
    id: 'commute',
    label: 'Commute',
    icon: <Clock size={12} />,
    mode: 'min',
    suffix: ' MIN',
    getValue: (p) => p.commute_paternoster + p.commute_canada_square,
    render: (p) => <div className="text-sm font-bold tracking-tight">{p.commute_paternoster + p.commute_canada_square} MIN</div>
  },
  {
    id: 'running_costs',
    label: 'Running Costs',
    icon: <CreditCard size={12} />,
    mode: 'none',
    getValue: (p) => p.service_charge + p.ground_rent,
    render: (p) => (
      <div className="flex flex-col gap-0.5">
        <div className="text-xs font-bold text-white">£{(p.service_charge + p.ground_rent).toLocaleString()}/yr</div>
        <span className="text-[8px] text-white/40 uppercase font-black tracking-tighter">S:{p.service_charge} G:{p.ground_rent}</span>
      </div>
    )
  }
];

const ComparisonPage: React.FC = () => {
  const { properties, loading } = usePropertyContext();
  const { selectedIds, toggleComparison, clearComparison, count } = useComparison();

  const selectedProperties = useMemo(() => 
    properties.filter(p => selectedIds.includes(p.id)),
    [properties, selectedIds]
  );

  const stats = useMemo(() => {
    if (selectedProperties.length === 0) return {};
    
    const res: Record<string, number> = {};
    MATRIX_ROWS.forEach(row => {
      res[row.id] = selectedProperties.reduce((acc, p) => acc + row.getValue(p), 0) / selectedProperties.length;
    });
    return res;
  }, [selectedProperties]);

  const getWinnerId = (row: MatrixRowConfig) => {
    if (selectedProperties.length < 2 || row.mode === 'none') return null;
    
    let bestVal = row.mode === 'min' ? Infinity : -Infinity;
    let winnerId = '';

    selectedProperties.forEach(p => {
      const val = row.getValue(p);
      if (row.mode === 'min' && val < bestVal) {
        bestVal = val;
        winnerId = p.id;
      } else if (row.mode === 'max' && val > bestVal) {
        bestVal = val;
        winnerId = p.id;
      }
    });

    return winnerId;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingNode />
    </div>
  );

  return (
    <div className="bg-linear-bg text-white pb-20">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Comparative Intelligence</h1>
          <p className="text-linear-text-muted text-sm font-medium italic">Side-by-side analytics for definitive acquisition decisions.</p>
        </div>
        {count > 0 && (
          <button 
            onClick={clearComparison}
            className="px-4 py-2 bg-linear-card border border-linear-border rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:text-rose-400 hover:border-rose-500/30 transition-all"
          >
            Reset Matrix
          </button>
        )}
      </div>

      {count === 0 ? (
        <div className="p-32 bg-linear-card border border-linear-border rounded-3xl text-center shadow-2xl">
          <div className="h-20 w-20 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
            <Zap size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Assets in Basket</h2>
          <p className="text-linear-text-muted text-sm mb-10 max-w-sm mx-auto font-medium">Select properties from the dashboard to execute high-density comparative analysis.</p>
          <Link to="/dashboard" className="px-8 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/10">
            Return to Terminal
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Header Row */}
          <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(0,1fr))] gap-px bg-linear-border border border-linear-border rounded-t-3xl overflow-hidden shadow-2xl">
            <div className="bg-linear-card/80 p-6 flex flex-col justify-end">
              <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-[0.3em]">Institutional</span>
              <span className="text-xs font-bold text-white uppercase">Analytics Matrix</span>
            </div>
            {selectedProperties.map(p => (
              <div key={p.id} className="bg-linear-card/80 p-6 relative group">
                <button 
                  onClick={() => toggleComparison(p.id)}
                  className="absolute top-4 right-4 h-6 w-6 bg-white/5 hover:bg-rose-500/20 text-white/20 hover:text-rose-400 rounded-lg flex items-center justify-center transition-all"
                >
                  <X size={14} />
                </button>
                <div className="flex flex-col gap-4">
                  <div className="h-24 w-full rounded-xl overflow-hidden border border-white/5 shadow-lg">
                    <PropertyImage src={p.image_url} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white truncate tracking-tight mb-1">{p.address.split(',')[0]}</h3>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{p.area.split(' (')[0]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Matrix Rows */}
          {MATRIX_ROWS.map(row => (
            <MatrixRow 
              key={row.id}
              config={row}
              properties={selectedProperties}
              winnerId={getWinnerId(row)}
              avg={stats[row.id]}
            />
          ))}

          {/* Action Row */}
          <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(0,1fr))] gap-px bg-linear-border border border-linear-border rounded-b-3xl overflow-hidden shadow-xl">
            <div className="bg-linear-card p-6 flex items-center">
              <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-[0.2em]">Acquisition Link</span>
            </div>
            {selectedProperties.map(p => (
              <div key={p.id} className="bg-linear-card p-6 flex flex-col gap-3">
                <Link 
                  to={`/property/${p.id}`}
                  className="w-full py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-center text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 hover:border-blue-500/40 transition-all"
                >
                  Full Asset Scan
                </Link>
                <a 
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-white/5 border border-white/10 text-white/60 rounded-lg text-center text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  Source Portal <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface MatrixRowProps {
  config: MatrixRowConfig;
  properties: PropertyWithCoords[];
  winnerId: string | null;
  avg?: number;
}

const MatrixRow: React.FC<MatrixRowProps> = ({ config, properties, winnerId, avg }) => {
  return (
    <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(0,1fr))] gap-px bg-linear-border border-x border-linear-border">
      <div className="bg-linear-bg/40 p-6 flex items-center gap-3 group/label">
        <div className="text-linear-accent group-hover/label:text-blue-400 transition-colors">{config.icon}</div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">{config.label}</span>
          {avg !== undefined && config.mode !== 'none' && (
            <span className="text-[8px] text-linear-text-muted font-bold uppercase mt-1">
              AVG: {config.isCurrency ? '£' : ''}{avg.toLocaleString()}{!config.isCurrency && config.label.includes('Appreciation') ? '%' : ''}
            </span>
          )}
        </div>
      </div>
      {properties.map(p => {
        const isWinner = p.id === winnerId;
        let delta = 0;
        let deltaPct = 0;
        
        const val = config.getValue(p);
        if (avg !== undefined && config.mode !== 'none') {
          delta = val - avg;
          deltaPct = (delta / (avg || 1)) * 100;
        }

        return (
          <div key={p.id} className={`bg-linear-card p-6 flex flex-col justify-center relative ${isWinner ? 'bg-blue-500/[0.03]' : ''}`}>
            {isWinner && (
              <div className="absolute top-3 right-4">
                <div className="flex items-center gap-1 text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">
                  <Bookmark size={8} fill="currentColor" /> Winner
                </div>
              </div>
            )}
            {config.render(p)}
            {avg !== undefined && config.mode !== 'none' && (
              <div className={`text-[9px] font-black mt-2 uppercase tracking-tighter ${
                config.mode === 'max'
                  ? (delta >= 0 ? 'text-retro-green' : 'text-rose-400')
                  : (delta <= 0 ? 'text-retro-green' : 'text-rose-400')
              }`}>
                {delta >= 0 ? '+' : ''}{deltaPct.toFixed(1)}% <span className="opacity-40 ml-0.5">vs Avg</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ComparisonPage;
