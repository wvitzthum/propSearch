import React, { useMemo, useState, useEffect } from 'react';
import { X, ExternalLink, Zap, TrendingUp, Maximize2, Scale, Bookmark, Clock, CreditCard, Plus, Search, Edit3, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePropertyContext } from '../hooks/PropertyContext';
import { useComparison } from '../hooks/useComparison';
import type { PropertyWithCoords } from '../types/property';
import AlphaBadge from '../components/AlphaBadge';
import PropertyImage from '../components/PropertyImage';
import LoadingNode from '../components/LoadingNode';
import { fmtPrice, fmtNum } from '../utils/format';

// FE-179: Analyst notes storage (per property, localStorage)
const NOTES_KEY = 'propsearch_analyst_notes';
const loadNotes = (): Record<string, string> => JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
const saveNote = (id: string, note: string) => {
  const notes = loadNotes();
  if (note.trim()) notes[id] = note;
  else delete notes[id];
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
};

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
    render: (p) => <div className="text-sm font-bold tracking-tight">{fmtPrice(p.realistic_price)}</div>
  },
  {
    id: 'price_per_sqm',
    label: 'Efficiency',
    icon: <Scale size={12} />,
    mode: 'min',
    isCurrency: true,
    getValue: (p) => p.price_per_sqm,
    render: (p) => <div className="text-sm font-bold tracking-tight">{fmtNum(p.price_per_sqm)}/m²</div>
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
        <div className="text-xs font-bold text-white">{fmtNum((p.service_charge ?? 0) + (p.ground_rent ?? 0))}/yr</div>
        <span className="text-[8px] text-white/40 uppercase font-black tracking-tighter">S:{fmtNum(p.service_charge)} G:{fmtNum(p.ground_rent)}</span>
      </div>
    )
  }
];

const ComparisonPage: React.FC = () => {
  const { properties, loading } = usePropertyContext();
  const { selectedIds, toggleComparison, clearComparison, count } = useComparison();
  // FE-179: Image sync — track hovered column index
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  // FE-179: Sidebar panel for adding/removing properties
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  // FE-179: Analyst notes state (loaded from localStorage)
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  useEffect(() => { setNotes(loadNotes()); }, []);

  const handleSaveNote = (id: string) => {
    saveNote(id, noteDraft);
    setNotes(loadNotes());
    setEditingNote(null);
  };

  const selectedProperties = useMemo(() =>
    properties.filter(p => selectedIds.includes(p.id)),
    [properties, selectedIds]
  );

  const availableForAdd = useMemo(() => {
    const ids = new Set(selectedIds);
    return properties.filter(p => !ids.has(p.id));
  }, [properties, selectedIds]);

  const sidebarFiltered = useMemo(() => {
    if (!sidebarSearch.trim()) return availableForAdd.slice(0, 10);
    const q = sidebarSearch.toLowerCase();
    return availableForAdd.filter(p =>
      p.address.toLowerCase().includes(q) ||
      (p.area || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [availableForAdd, sidebarSearch]);

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
      if (row.mode === 'min' && val < bestVal) { bestVal = val; winnerId = p.id; }
      else if (row.mode === 'max' && val > bestVal) { bestVal = val; winnerId = p.id; }
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Comparative Intelligence</h1>
          <p className="text-linear-text-muted text-sm font-medium italic">Side-by-side analytics for definitive acquisition decisions.</p>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`px-4 py-2 bg-linear-card border rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                isSidebarOpen ? 'border-blue-500/30 text-blue-400' : 'border-linear-border text-linear-text-muted hover:text-white'
              }`}
            >
              <Plus size={12} className="inline mr-1" />Add Properties
            </button>
          )}
          {count > 0 && (
            <button
              onClick={clearComparison}
              className="px-4 py-2 bg-linear-card border border-linear-border rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:text-rose-400 hover:border-rose-500/30 transition-all"
            >
              Reset Matrix
            </button>
          )}
        </div>
      </div>

      {count === 0 ? (
        <div className="p-32 bg-linear-card border border-linear-border rounded-3xl text-center shadow-2xl">
          <div className="h-20 w-20 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
            <Zap size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Assets in Basket</h2>
          <p className="text-linear-text-muted text-sm mb-10 max-w-sm mx-auto font-medium">Select properties from the dashboard to execute high-density comparative analysis.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="px-6 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-500/20 hover:border-blue-500/40 transition-all"
            >
              Browse Properties
            </button>
            <Link to="/dashboard" className="px-8 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/10">
              Return to Terminal
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {/* FE-179: Header Row with image-sync on hover */}
          <div className="grid gap-px bg-linear-border border border-linear-border rounded-t-3xl overflow-hidden shadow-2xl" style={{ gridTemplateColumns: `200px repeat(${selectedProperties.length}, minmax(0, 1fr))` }}>
            <div className="bg-linear-card/80 p-6 flex flex-col justify-end">
              <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-[0.3em]">Institutional</span>
              <span className="text-xs font-bold text-white uppercase">Analytics Matrix</span>
            </div>
            {selectedProperties.map((p, idx) => (
              <div
                key={p.id}
                className={`bg-linear-card/80 p-6 relative group transition-all duration-200 ${
                  hoveredIdx === idx ? 'ring-2 ring-blue-500/40 bg-blue-500/5' : ''
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
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
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{(p.area ?? '').split(' (')[0]}</span>
                  </div>
                </div>
                {/* FE-179: Analyst Notes Editor */}
                {editingNote === p.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={noteDraft}
                      onChange={e => setNoteDraft(e.target.value)}
                      placeholder="Analyst notes..."
                      className="w-full bg-linear-bg border border-blue-500/30 rounded-lg p-2 text-[9px] text-white placeholder-linear-text-muted resize-none focus:outline-none focus:border-blue-500/60"
                      rows={3}
                    />
                    <div className="flex gap-1">
                      <button onClick={() => handleSaveNote(p.id)} className="flex-1 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[8px] font-bold text-blue-400 hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-1">
                        <Save size={8} /> Save
                      </button>
                      <button onClick={() => setEditingNote(null)} className="px-3 py-1 bg-linear-bg border border-linear-border rounded text-[8px] font-bold text-linear-text-muted hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : notes[p.id] ? (
                  <button
                    onClick={() => { setEditingNote(p.id); setNoteDraft(notes[p.id] || ''); }}
                    className="mt-2 w-full text-left px-2 py-1.5 bg-blue-500/5 border border-blue-500/20 rounded text-[8px] text-blue-400/70 hover:text-blue-400 hover:border-blue-500/30 transition-colors truncate"
                    title={notes[p.id]}
                  >
                    <Edit3 size={8} className="inline mr-1" />
                    {notes[p.id]}
                  </button>
                ) : (
                  <button
                    onClick={() => { setEditingNote(p.id); setNoteDraft(''); }}
                    className="mt-2 flex items-center gap-1 text-[8px] text-linear-text-muted/40 hover:text-blue-400/60 transition-colors"
                  >
                    <Edit3 size={8} /> Add note
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Matrix Rows */}
          {MATRIX_ROWS.map(row => (
            <div
              key={row.id}
              className="grid gap-px bg-linear-border border-x border-linear-border"
              style={{ gridTemplateColumns: `200px repeat(${selectedProperties.length}, minmax(0, 1fr))` }}
              onMouseEnter={() => {/* Could highlight column */}}
            >
              <div className="bg-linear-bg/40 p-6 flex items-center gap-3 group/label">
                <div className="text-linear-accent group-hover/label:text-blue-400 transition-colors">{row.icon}</div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">{row.label}</span>
                  {stats[row.id] !== undefined && row.mode !== 'none' && (
                    <span className="text-[8px] text-linear-text-muted font-bold uppercase mt-1">
                      AVG: {row.isCurrency ? '£' : ''}{stats[row.id].toLocaleString(undefined, { maximumFractionDigits: 0 })}{!row.isCurrency && row.label.includes('Appreciation') ? '%' : ''}
                    </span>
                  )}
                </div>
              </div>
              {selectedProperties.map((p, idx) => {
                const isWinner = p.id === getWinnerId(row);
                let delta = 0;
                let deltaPct = 0;
                const val = row.getValue(p);
                if (stats[row.id] !== undefined && row.mode !== 'none') {
                  delta = val - stats[row.id];
                  deltaPct = (delta / (stats[row.id] || 1)) * 100;
                }
                return (
                  <div
                    key={p.id}
                    className={`bg-linear-card p-6 flex flex-col justify-center relative transition-all duration-150 cursor-pointer ${
                      isWinner ? 'bg-blue-500/[0.03]' : ''
                    } ${hoveredIdx === idx ? 'ring-1 ring-inset ring-blue-500/20' : ''}`}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {isWinner && (
                      <div className="absolute top-3 right-4">
                        <div className="flex items-center gap-1 text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">
                          <Bookmark size={8} fill="currentColor" /> Winner
                        </div>
                      </div>
                    )}
                    {row.render(p)}
                    {stats[row.id] !== undefined && row.mode !== 'none' && (
                      <div className={`text-[9px] font-black mt-2 uppercase tracking-tighter ${
                        row.mode === 'max'
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
          ))}

          {/* Action Row */}
          <div className="grid gap-px bg-linear-border border border-linear-border rounded-b-3xl overflow-hidden shadow-xl" style={{ gridTemplateColumns: `200px repeat(${selectedProperties.length}, minmax(0, 1fr))` }}>
            <div className="bg-linear-card p-6 flex items-center">
              <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-[0.2em]">Acquisition Link</span>
            </div>
            {selectedProperties.map((p) => (
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

      {/* FE-179: Add/Remove Properties Sidebar Panel */}
      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed top-12 right-0 bottom-0 w-80 z-50 bg-linear-card/95 backdrop-blur-xl border-l border-linear-border shadow-2xl overflow-y-auto custom-scrollbar flex flex-col">
            <div className="sticky top-0 z-10 bg-linear-card/95 backdrop-blur-md border-b border-linear-border px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Properties Basket</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-linear-text-muted hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="p-4 space-y-3 flex-1">
              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-linear-text-muted" />
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  placeholder="Search properties..."
                  className="w-full pl-9 pr-3 py-2 bg-linear-bg border border-linear-border rounded-lg text-[10px] text-white placeholder-linear-text-muted focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {/* In-basket section */}
              {count > 0 && (
                <div>
                  <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-2 flex items-center justify-between">
                    In Basket ({count})
                    <button onClick={clearComparison} className="text-rose-400 hover:text-rose-300 font-black uppercase">Clear all</button>
                  </div>
                  <div className="space-y-1">
                    {selectedProperties.map(p => (
                      <div key={p.id} className="flex items-center gap-2 p-2 bg-linear-bg rounded-lg border border-blue-500/20">
                        <div className="h-8 w-8 rounded overflow-hidden flex-shrink-0">
                          <PropertyImage src={p.image_url} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-white truncate">{p.address.split(',')[0]}</p>
                          <p className="text-[8px] text-linear-text-muted truncate">£{(p.realistic_price / 1000).toFixed(0)}K · {(p.area || '').split(' (')[0]}</p>
                        </div>
                        <button onClick={() => toggleComparison(p.id)} className="text-rose-400 hover:text-rose-300">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available properties */}
              <div>
                <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">
                  {sidebarSearch ? `Results (${sidebarFiltered.length})` : `Available (${availableForAdd.length})`}
                </div>
                <div className="space-y-1">
                  {sidebarFiltered.length === 0 && (
                    <p className="text-[9px] text-linear-text-muted text-center py-4">
                      {count >= 4 ? 'Matrix full (max 4).' : 'No matches found.'}
                    </p>
                  )}
                  {sidebarFiltered.map(p => (
                    <button
                      key={p.id}
                      onClick={() => toggleComparison(p.id)}
                      className="w-full flex items-center gap-2 p-2 bg-linear-bg rounded-lg border border-linear-border hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group text-left"
                    >
                      <div className="h-8 w-8 rounded overflow-hidden flex-shrink-0">
                        <PropertyImage src={p.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-white truncate">{p.address.split(',')[0]}</p>
                        <p className="text-[8px] text-linear-text-muted truncate">£{(p.realistic_price / 1000).toFixed(0)}K · {(p.area || '').split(' (')[0]}</p>
                      </div>
                      <Plus size={12} className="text-blue-400/50 group-hover:text-blue-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ComparisonPage;
