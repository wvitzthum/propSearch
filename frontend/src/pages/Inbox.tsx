import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropertyImage from '../components/PropertyImage';
import LoadingNode from '../components/LoadingNode';
import { 
  Check, 
  ArrowRight, 
  Keyboard, 
  ShieldAlert, 
  ExternalLink,
  Trash2,
  CheckCircle2,
  Layers,
  Maximize2
} from 'lucide-react';

const API_BASE = '/api';

interface RawListing {
  address: string;
  price: number;
  area: string;
  url: string;
  source: string;
  image_url?: string;
  filename: string;
}

const Inbox: React.FC = () => {
  const [listings, setListings] = useState<RawListing[]>([]);
  const [currentIndex, setCurrentListIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'metrics' | 'portal'>('metrics');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchInbox = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/inbox`);
      if (!res.ok) throw new Error('Failed to fetch inbox manifest');
      const data: RawListing[] = await res.json();
      setListings(data);
    } catch (err: any) {
      console.error('Inbox error:', err);
      setError('Local API Server (port 3001) is required for Inbox management.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const handleAction = useCallback(async (action: 'approve' | 'reject', indexToTriage?: number) => {
    const idx = indexToTriage !== undefined ? indexToTriage : currentIndex;
    if (listings.length === 0 || idx >= listings.length) return;
    
    const listing = listings[idx];
    setIsProcessing(true);
    
    try {
      const res = await fetch(`${API_BASE}/inbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...listing, 
          action,
          triaged_at: new Date().toISOString()
        })
      });

      if (!res.ok) throw new Error('API Rejection');
      
      setListings(prev => prev.filter((_, i) => i !== idx));
      if (currentIndex >= listings.length - 1 && currentIndex > 0) {
        setCurrentListIndex(prev => prev - 1);
      }
    } catch (err) {
      console.error('Triage sync error:', err);
      // Fallback for demo
      setListings(prev => prev.filter((_, i) => i !== idx));
    } finally {
      setIsProcessing(false);
    }
  }, [listings, currentIndex]);

  const handlePeek = (url: string) => {
    // Open a focused, smaller window to simulate an "embedded" feel without header pollution
    window.open(url, 'PortalPeek', 'width=1200,height=900,menubar=no,toolbar=no,location=no,status=no');
  };

  const handleBatchAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    
    const toProcess = listings.filter(l => selectedIds.has(l.filename));
    
    try {
      // Parallel processing for prototype
      await Promise.all(toProcess.map(listing => 
        fetch(`${API_BASE}/inbox`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...listing, action, triaged_at: new Date().toISOString() })
        })
      ));
      
      setListings(prev => prev.filter(l => !selectedIds.has(l.filename)));
      setSelectedIds(new Set());
      setCurrentListIndex(0);
    } catch (err) {
      console.error('Batch error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelect = useCallback((filename: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (isProcessing) return;
      
      const key = e.key.toLowerCase();
      if (key === 'a') handleAction('approve');
      if (key === 'r') handleAction('reject');
      if (key === 'v') setViewMode(prev => prev === 'metrics' ? 'portal' : 'metrics');
      if (key === 'arrowdown' || key === 'j') {
        e.preventDefault();
        setCurrentListIndex(prev => Math.min(prev + 1, listings.length - 1));
      }
      if (key === 'arrowup' || key === 'k') {
        e.preventDefault();
        setCurrentListIndex(prev => Math.max(prev - 1, 0));
      }
      if (key === 'l' && listings[currentIndex]) {
        handlePeek(listings[currentIndex].url);
      }
      if (key === ' ' && listings[currentIndex]) {
        e.preventDefault();
        toggleSelect(listings[currentIndex].filename);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [listings, currentIndex, isProcessing, handleAction, toggleSelect]);

  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.children[currentIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentIndex]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <LoadingNode label="Scanning raw lead buffers..." />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="h-16 w-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20">
        <ShieldAlert size={32} />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Institutional API Offline</h2>
      <p className="text-linear-text-muted mb-8 max-w-sm text-sm">{error}</p>
      <button onClick={fetchInbox} className="px-6 py-2 bg-white text-black rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all">
        Retry Handshake
      </button>
    </div>
  );

  const currentListing = listings[currentIndex];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center gap-3">
            Inbox 2.0 <span className="text-[10px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded">BETA</span>
          </h1>
          <p className="text-linear-text-muted text-xs uppercase tracking-widest font-bold opacity-70">
            {listings.length} Pending Leads • {selectedIds.size} Selected
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mr-4 animate-in fade-in slide-in-from-right-4">
              <button 
                onClick={() => handleBatchAction('approve')}
                className="px-3 py-1.5 bg-retro-green/10 text-retro-green border border-retro-green/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-retro-green/20 transition-all"
              >
                Approve {selectedIds.size}
              </button>
              <button 
                onClick={() => handleBatchAction('reject')}
                className="px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
              >
                Reject {selectedIds.size}
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-linear-card border border-linear-border rounded-lg text-[9px] font-bold text-linear-text-muted">
            <Keyboard size={12} />
            <span>J/K NAV • A/R ACTION • V TOGGLE • L PEEK</span>
          </div>
        </div>
      </div>

      {!listings.length ? (
        <div className="flex-grow flex flex-col items-center justify-center bg-linear-card/20 border border-dashed border-linear-border rounded-3xl">
          <div className="h-16 w-16 bg-retro-green/10 text-retro-green rounded-full flex items-center justify-center mb-6 border border-retro-green/20">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Lead Buffer Depleted</h2>
          <p className="text-linear-text-muted text-sm uppercase tracking-widest font-bold">Waiting for next automated scrape cycle</p>
        </div>
      ) : (
        <div className="flex-grow flex gap-6 overflow-hidden">
          {/* List Pane */}
          <div className="w-1/4 flex flex-col bg-linear-card/30 border border-linear-border rounded-2xl overflow-hidden">
            <div className="p-3 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
              <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Lead Stream</span>
              <button 
                onClick={() => setSelectedIds(selectedIds.size === listings.length ? new Set() : new Set(listings.map(l => l.filename)))}
                className="text-[9px] font-bold text-blue-400 hover:text-white transition-colors uppercase tracking-widest"
              >
                {selectedIds.size === listings.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div ref={scrollRef} className="flex-grow overflow-y-auto custom-scrollbar">
              {listings.map((listing, i) => (
                <div 
                  key={listing.filename}
                  onClick={() => setCurrentListIndex(i)}
                  className={`p-4 border-b border-linear-border/50 cursor-pointer transition-all flex items-start gap-3 group relative ${
                    i === currentIndex ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-linear-card/40'
                  }`}
                >
                  <input 
                    type="checkbox"
                    checked={selectedIds.has(listing.filename)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(listing.filename); }}
                    className="mt-1 h-3.5 w-3.5 rounded border-linear-border bg-linear-bg text-blue-500 focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer"
                  />
                  <div className="flex-grow min-w-0">
                    <div className={`text-xs font-bold truncate tracking-tight transition-colors ${i === currentIndex ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                      {listing.address}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-tighter">{listing.source}</span>
                      <span className="text-[9px] font-bold text-blue-400/80">£{listing.price.toLocaleString()}</span>
                    </div>
                  </div>
                  {i === currentIndex && <ArrowRight size={14} className="text-blue-500 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Detail Pane */}
          <div className="flex-grow flex flex-col bg-linear-card border border-linear-border rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="p-3 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex bg-linear-bg p-1 rounded-lg border border-linear-border">
                  <button 
                    onClick={() => setViewMode('metrics')}
                    className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'metrics' ? 'bg-linear-accent text-white shadow-lg' : 'text-linear-text-muted hover:text-white'}`}
                  >
                    Metrics [M]
                  </button>
                  <button 
                    onClick={() => setViewMode('portal')}
                    className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'portal' ? 'bg-linear-accent text-white shadow-lg' : 'text-linear-text-muted hover:text-white'}`}
                  >
                    Live Portal [V]
                  </button>
                </div>
              </div>
              <button 
                onClick={() => handlePeek(currentListing.url)}
                className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
              >
                <ExternalLink size={12} />
                Focused Peek [L]
              </button>
            </div>

            {isProcessing && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center">
                <LoadingNode label="Syncing Triage Status..." />
              </div>
            )}
            
            {viewMode === 'metrics' ? (
              <div className="flex-grow overflow-y-auto custom-scrollbar">
                <div className="h-64 relative overflow-hidden bg-linear-bg">
                  <PropertyImage 
                    src={currentListing.image_url || ''} 
                    alt="Raw Lead" 
                    className="h-full w-full object-cover opacity-60 grayscale" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-linear-card via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-8 right-8">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase rounded tracking-widest">
                        {currentListing.source}
                      </span>
                      <span className="px-2 py-0.5 bg-linear-card/80 backdrop-blur-md text-linear-text-muted text-[9px] font-bold uppercase rounded border border-linear-border">
                        Lead ID: {currentListing.filename.split('_')[0]}
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">{currentListing.address}</h2>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest flex items-center gap-2">
                        <Layers size={12} className="text-linear-accent" /> Asset Metrics
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-linear-bg border border-linear-border rounded-xl">
                          <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest block mb-1">List Price</span>
                          <span className="text-lg font-bold text-white">£{currentListing.price.toLocaleString()}</span>
                        </div>
                        <div className="p-4 bg-linear-bg border border-linear-border rounded-xl">
                          <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest block mb-1">Discovery</span>
                          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Automated Scrape</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest flex items-center gap-2">
                        <ExternalLink size={12} className="text-linear-accent" /> Portal Intelligence
                      </h3>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handlePeek(currentListing.url)}
                          className="p-4 bg-linear-bg border border-linear-border rounded-xl hover:border-blue-400 transition-all group flex items-center justify-between w-full text-left"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">Launch Focused Peek</span>
                            <span className="text-[9px] text-linear-text-muted uppercase tracking-widest">Isolated Environment</span>
                          </div>
                          <Maximize2 size={16} className="text-linear-text-muted group-hover:text-blue-400 transition-colors" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                    <p className="text-xs text-linear-text-muted leading-relaxed italic">
                      <span className="font-black text-blue-400 uppercase tracking-widest mr-2">Triage Protocol:</span>
                      Approved leads move to the Deep Scraper pipeline for Alpha Scoring, spatial normalization, and institutional vetting. Rejected leads are removed from the buffer and archived.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow relative bg-white">
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-bg z-0">
                  <LoadingNode label="Connecting to Portal..." />
                  <p className="mt-4 text-[10px] text-linear-text-muted uppercase font-black tracking-[0.2em]">Note: Portals may block internal embedding</p>
                  <button 
                    onClick={() => handlePeek(currentListing.url)}
                    className="mt-6 px-6 py-2 bg-white text-black rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all"
                  >
                    Use Focused Peek Instead
                  </button>
                </div>
                <iframe 
                  src={currentListing.url} 
                  className="absolute inset-0 w-full h-full border-none z-10"
                  title="Portal View"
                />
              </div>
            )}

            {/* Sticky Actions Footer */}
            <div className="p-6 bg-linear-card border-t border-linear-border grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleAction('approve')}
                className="flex items-center justify-center gap-3 py-4 bg-retro-green/10 text-retro-green border border-retro-green/20 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-retro-green/20 hover:border-retro-green/40 transition-all active:scale-95 group shadow-xl shadow-retro-green/5"
              >
                <Check size={18} className="group-hover:scale-125 transition-transform" />
                Approve Lead [A]
              </button>
              <button 
                onClick={() => handleAction('reject')}
                className="flex items-center justify-center gap-3 py-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-500/20 hover:border-rose-500/40 transition-all active:scale-95 group shadow-xl shadow-rose-500/5"
              >
                <Trash2 size={18} className="group-hover:scale-125 transition-transform" />
                Reject Lead [R]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
