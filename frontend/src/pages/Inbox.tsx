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
  Maximize2,
  History,
  X,
  Scale,
  ArrowUpRight,
  Focus,
  Info,
} from 'lucide-react';
import { usePipeline } from '../hooks/usePipeline';
import { useComparison } from '../hooks/useComparison';
import FloorplanViewer from '../components/FloorplanViewer';

const API_BASE = '/api';

interface RawListing {
  address: string;
  price?: number;
  area: string;
  url: string;
  source: string;
  image_url?: string;
  floorplan_url?: string;
  filename: string;
}

type TriageStatus = 'pending' | 'approved' | 'rejected' | 'processing';

const SUBMISSION_KEY = 'propsearch_inbox_submissions';
const STATUS_KEY = 'propsearch_inbox_status';

interface Submission {
  url: string;
  address: string;
  source: string;
  date: string;
}

const loadSubmissions = (): Submission[] => JSON.parse(localStorage.getItem(SUBMISSION_KEY) || '[]');
const saveSubmission = (s: Submission) => {
  const prev = loadSubmissions();
  localStorage.setItem(SUBMISSION_KEY, JSON.stringify([s, ...prev].slice(0, 20)));
};

const Inbox: React.FC = () => {
  const { setStatus: setPipelineStatus } = usePipeline();
  const comparison = useComparison();
  const [listings, setListings] = useState<RawListing[]>([]);
  const [currentIndex, setCurrentListIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'metrics' | 'portal' | 'floorplan'>('metrics');
  const [triageStatus, setTriageStatus] = useState<Record<string, TriageStatus>>(() =>
    JSON.parse(localStorage.getItem(STATUS_KEY) || '{}')
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [quickAddUrl, setQuickAddUrl] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddMsg, setQuickAddMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // UX-021: Focus Mode — hides lead stream, shows current property only
  const [isFocusMode, setIsFocusMode] = useState(false);

  // UX-021: First-visit tooltip — shown once per localStorage flag
  const [hasSeenTip, setHasSeenTip] = useState(() =>
    localStorage.getItem('propsearch_inbox_tip_seen') === '1'
  );

  useEffect(() => { setSubmissions(loadSubmissions()); }, []);

  // UX-021: Dismiss first-visit tooltip
  const dismissTip = useCallback(() => {
    setHasSeenTip(true);
    localStorage.setItem('propsearch_inbox_tip_seen', '1');
  }, []);

  const saveStatus = (id: string, status: TriageStatus) => {
    const next = { ...triageStatus, [id]: status };
    setTriageStatus(next);
    localStorage.setItem(STATUS_KEY, JSON.stringify(next));
  };

  const handleQuickAdd = async () => {
    if (!quickAddUrl.trim()) return;
    setQuickAddLoading(true);
    setQuickAddMsg(null);
    const entry: Submission = { url: quickAddUrl.trim(), address: '', source: 'Manual', date: new Date().toISOString() };

    try {
      // POST to /api/inbox — writes to data/inbox/{timestamp}_RAW.json for sync pipeline to pick up
      const res = await fetch(`${API_BASE}/inbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: entry.url, source: entry.source, date: entry.date })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      saveSubmission(entry);
      setSubmissions(loadSubmissions());
      setQuickAddMsg('URL saved — refresh buffer to triage');
      setQuickAddUrl('');
    } catch (err: any) {
      console.error('Quick-add failed:', err);
      // Still save to localStorage so the submission is not lost
      saveSubmission(entry);
      setSubmissions(loadSubmissions());
      setQuickAddMsg(`Saved locally — sync error: ${err.message}. Will retry on refresh.`);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const fetchInbox = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/inbox`);
      if (!res.ok) throw new Error('Failed to fetch inbox manifest');
      const rawData = await res.json();

      // Normalize mixed file formats from the inbox:
      // - File format A: flat array [{}, {}, ...]       (new_leads_*.json)
      // - File format B: wrapper object { batch_id, leads: [{}, ...] }  (batch exports)
      // Each file entry has a `filename` key added by the server.
      const normalized: RawListing[] = rawData.flatMap((entry: any) => {
        // Skip non-object entries (e.g. error strings)
        if (!entry || typeof entry !== 'object') return [];

        // Extract filename from whatever shape the entry has
        const filename = entry.filename as string || 'unknown';

        // Format B: wrapper object with nested leads array
        if (Array.isArray(entry.leads)) {
          return entry.leads.map((lead: any) => ({
            filename,
            address: lead.address || 'Unknown Address',
            price: lead.price,
            area: lead.area || '',
            url: lead.url || '',
            source: lead.source || '',
            image_url: lead.image_url,
            floorplan_url: lead.floorplan_url,
          }));
        }

        // Format A: entry is an array of listings (the server spread an array + added filename)
        if (Array.isArray(entry)) {
          return entry.map((item: any) => ({
            filename,
            address: item.address || 'Unknown Address',
            price: item.price,
            area: item.area || '',
            url: item.url || '',
            source: item.source || '',
            image_url: item.image_url,
            floorplan_url: item.floorplan_url,
          }));
        }

        // Single record (fallback): has address/price fields directly on the object
        if (entry.address !== undefined || entry.price !== undefined) {
          return [{
            filename,
            address: entry.address || 'Unknown Address',
            price: entry.price,
            area: entry.area || '',
            url: entry.url || '',
            source: entry.source || '',
            image_url: entry.image_url,
            floorplan_url: entry.floorplan_url,
          }];
        }

        return [];
      });

      // QA-171: deduplicate by filename to prevent React duplicate-key warnings
      const deduped = Array.from(
        normalized.reduce((acc: Map<string, RawListing>, item) => {
          if (!acc.has(item.filename)) acc.set(item.filename, item);
          return acc;
        }, new Map()),
        ([, v]) => v
      );

      setListings(deduped);
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
    const newStatus: TriageStatus = action === 'approve' ? 'approved' : 'rejected';
    saveStatus(listing.filename, newStatus);

    // UX-010: Approve → set pipeline status to 'discovered' so it surfaces in Properties
    if (action === 'approve') {
      try {
        // Try to set pipeline status. Use address as a lookup key in localStorage.
        // The Data Engineer would assign a real ID on ingest; we use filename as a proxy.
        setPipelineStatus(listing.filename, 'discovered');
      } catch {
        // Pipeline not available — non-fatal
      }
    }

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
  }, [listings, currentIndex, setPipelineStatus]);

  const handlePeek = (url: string) => {
    // Open a focused, smaller window to simulate an "embedded" feel without header pollution
    window.open(url, 'PortalPeek', 'width=1200,height=900,menubar=no,toolbar=no,location=no,status=no');
  };

  const handleBatchAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    const newStatus: TriageStatus = action === 'approve' ? 'approved' : 'rejected';
    selectedIds.forEach(id => saveStatus(id, newStatus));
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
      if (key === 'm') setViewMode('metrics');
      if (key === 'f') setViewMode('floorplan');
      if (key === 'v') setViewMode('portal');
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

        <div className="flex items-center gap-3 flex-wrap">
          {/* FE-180: Quick-add URL submission */}
          <div className="flex items-center gap-2 bg-linear-card border border-linear-border rounded-xl overflow-hidden">
            <input
              type="url"
              value={quickAddUrl}
              onChange={e => setQuickAddUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
              placeholder="Paste URL..."
              className="pl-3 pr-2 py-1.5 bg-transparent text-[10px] text-white placeholder-linear-text-muted focus:outline-none w-44 font-mono"
            />
            <button
              onClick={handleQuickAdd}
              disabled={quickAddLoading}
              className="px-3 py-1.5 bg-blue-500/20 border-l border-linear-border text-blue-400 text-[9px] font-black uppercase hover:bg-blue-500/30 disabled:opacity-50 transition-all"
            >
              {quickAddLoading ? '...' : '+'}
            </button>
          </div>
          {quickAddMsg && (
            <span className="text-[9px] font-bold text-emerald-400 animate-in fade-in">{quickAddMsg}</span>
          )}

          {/* FE-180: Submission history toggle */}
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
              isHistoryOpen ? 'bg-retro-amber/20 border-retro-amber/30 text-retro-amber' : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-white'
            }`}
          >
            <History size={12} /> Submissions ({submissions.length})
          </button>

          {/* UX-021: Focus Mode toggle */}
          <button
            onClick={() => setIsFocusMode(v => !v)}
            title={isFocusMode ? 'Exit Focus Mode' : 'Focus Mode — hide lead stream'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
              isFocusMode ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-white'
            }`}
          >
            <Focus size={12} className={isFocusMode ? 'text-purple-400' : ''} />
            {isFocusMode ? 'Exit Focus' : 'Focus Mode'}
          </button>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
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

          {/* UX-021: Keyboard hint label */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-linear-card border border-linear-border rounded-lg text-[9px] font-bold text-linear-text-muted">
            <Keyboard size={12} />
            <span>J/K NAV • A/R ACTION • M/F/V TOGGLE • L PEEK</span>
          </div>

          {/* UX-021: First-visit dismissible tooltip */}
          {!hasSeenTip && (
            <div className="relative flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-300 animate-in fade-in">
              <Info size={12} className="text-blue-400 shrink-0" />
              <span>Tip: Use <kbd className="font-mono bg-blue-500/20 px-1 rounded">A</kbd>/<kbd className="font-mono bg-blue-500/20 px-1 rounded">R</kbd> to triage, <kbd className="font-mono bg-blue-500/20 px-1 rounded">J</kbd>/<kbd className="font-mono bg-blue-500/20 px-1 rounded">K</kbd> to navigate. Press <kbd className="font-mono bg-blue-500/20 px-1 rounded">?</kbd> for all shortcuts.</span>
              <button onClick={dismissTip} className="shrink-0 text-blue-400/50 hover:text-blue-400 transition-colors ml-1">
                <X size={10} />
              </button>
            </div>
          )}
        </div>
      </div>

      {!listings.length ? (
        <div className="flex-grow flex flex-col items-center justify-center bg-linear-card/20 border border-dashed border-linear-border rounded-3xl">
          <div className="h-16 w-16 bg-retro-green/10 text-retro-green rounded-full flex items-center justify-center mb-6 border border-retro-green/20">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Lead Buffer Depleted</h2>
          <p className="text-linear-text-muted text-sm uppercase tracking-widest font-bold mb-4">Waiting for next automated scrape cycle</p>
          {/* UX-009: CTA in empty state */}
          <div className="flex items-center gap-3">
            <a
              href="/properties"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
            >
              View Properties
              <ArrowUpRight size={12} />
            </a>
            <button
              onClick={fetchInbox}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-500/30 transition-all"
            >
              Refresh Buffer
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex gap-6 overflow-hidden">
          {/* UX-021: Lead Stream — hidden in Focus Mode */}
          {!isFocusMode && (
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
              {listings.map((listing, i) => {
                const status = triageStatus[listing.filename] || 'pending';
                const statusColor = status === 'approved' ? 'text-retro-green' : status === 'rejected' ? 'text-rose-400' : status === 'processing' ? 'text-amber-400' : 'text-linear-text-muted';
                const statusBg = status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20' : status === 'rejected' ? 'bg-rose-500/10 border-rose-500/20' : status === 'processing' ? 'bg-amber-500/10 border-amber-500/20' : '';
                return (
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
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {/* FE-180: Source attribution badge */}
                        <span className="text-[8px] font-black px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded uppercase tracking-tighter">{listing.source || 'Unknown'}</span>
                        {/* FE-180: Status badge */}
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border ${statusBg} ${statusColor}`}>
                          {status}
                        </span>
                        <span className="text-[9px] font-bold text-blue-400/80">£{listing.price?.toLocaleString() ?? '—'}</span>
                      </div>
                    </div>
                    {i === currentIndex && <ArrowRight size={14} className="text-blue-500 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* Detail Pane */}
          <div className="flex-grow flex flex-col bg-linear-card border border-linear-border rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="p-3 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex bg-linear-bg p-1 rounded-lg border border-linear-border">
                  <button
                    onClick={() => setViewMode('metrics')}
                    className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${viewMode === 'metrics' ? 'bg-linear-accent text-white shadow-lg' : 'text-linear-text-muted hover:text-white'}`}
                  >
                    Metrics <kbd className="font-mono text-[8px] opacity-60">[M]</kbd>
                  </button>
                  <button
                    onClick={() => setViewMode('floorplan')}
                    className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${viewMode === 'floorplan' ? 'bg-linear-accent text-white shadow-lg' : 'text-linear-text-muted hover:text-white'}`}
                  >
                    Floorplan <kbd className="font-mono text-[8px] opacity-60">[F]</kbd>
                  </button>
                  <button
                    onClick={() => setViewMode('portal')}
                    className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${viewMode === 'portal' ? 'bg-linear-accent text-white shadow-lg' : 'text-linear-text-muted hover:text-white'}`}
                  >
                    Portal Intel <kbd className="font-mono text-[8px] opacity-60">[V]</kbd>
                  </button>
                </div>
              </div>
              <button
                onClick={() => handlePeek(currentListing.url)}
                className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
              >
                <ExternalLink size={12} />
                Open Portal <kbd className="font-mono text-[8px] opacity-60">[L]</kbd>
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
                          <span className="text-lg font-bold text-white">£{currentListing.price?.toLocaleString() ?? '—'}</span>
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
            ) : viewMode === 'floorplan' ? (
              <div className="flex-grow overflow-hidden p-6 bg-linear-bg">
                {currentListing.floorplan_url ? (
                  <FloorplanViewer 
                    url={currentListing.floorplan_url} 
                    address={currentListing.address} 
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center px-8 bg-linear-card/20 rounded-2xl border border-dashed border-linear-border">
                    <div className="h-16 w-16 bg-linear-card text-linear-text-muted rounded-2xl flex items-center justify-center mb-6 border border-linear-border">
                      <Layers size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Floorplan Unavailable</h2>
                    <p className="text-linear-text-muted text-xs uppercase tracking-widest font-bold opacity-70 max-w-xs">
                      The automated scraper was unable to isolate a spatial blueprint for this lead. Review manually in the live portal.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // UX-025: Portal Intelligence — replaces CSP-blocked iframe with scraped metadata
              <div className="flex-grow overflow-y-auto custom-scrollbar">
                <div className="p-8 space-y-6">
                  {/* Source + URL */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase rounded tracking-wider">
                          {currentListing.source || 'Unknown Portal'}
                        </span>
                        <span className="text-[9px] text-linear-text-muted font-mono truncate max-w-xs">
                          {(() => { try { return new URL(currentListing.url).hostname; } catch { return currentListing.url; } })()}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{currentListing.address}</h3>
                      {currentListing.area && (
                        <p className="text-[10px] text-linear-text-muted mt-0.5">{currentListing.area}</p>
                      )}
                    </div>
                    {/* Primary CTA: Open Portal */}
                    <button
                      onClick={() => handlePeek(currentListing.url)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/10 shrink-0"
                    >
                      <ExternalLink size={14} />
                      Open on {currentListing.source || 'Portal'} <kbd className="font-mono text-[8px] opacity-70 ml-1">[L]</kbd>
                    </button>
                  </div>

                  {/* Scraped metadata */}
                  <div className="grid grid-cols-2 gap-3">
                    {currentListing.price && (
                      <div className="p-4 bg-linear-bg border border-linear-border rounded-xl">
                        <div className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest mb-1">Listed Price</div>
                        <div className="text-lg font-black text-white">£{currentListing.price.toLocaleString()}</div>
                      </div>
                    )}
                    {currentListing.area && (
                      <div className="p-4 bg-linear-bg border border-linear-border rounded-xl">
                        <div className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest mb-1">Area</div>
                        <div className="text-sm font-bold text-white">{currentListing.area}</div>
                      </div>
                    )}
                  </div>

                  {/* URL */}
                  <div className="p-3 bg-linear-bg border border-linear-border rounded-xl">
                    <div className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest mb-1">Listing URL</div>
                    <a
                      href={currentListing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handlePeek(currentListing.url)}
                      className="text-[10px] font-mono text-blue-400 hover:text-blue-300 underline underline-offset-2 truncate block transition-colors"
                    >
                      {currentListing.url}
                    </a>
                  </div>

                  {/* No scraped data placeholder */}
                  {!currentListing.price && !currentListing.area && (
                    <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl text-center">
                      <p className="text-[10px] text-linear-text-muted italic leading-relaxed">
                        No structured metadata scraped for this listing. All available data is shown above. Open the portal directly for full details.
                      </p>
                    </div>
                  )}

                  {/* Note */}
                  <div className="p-4 bg-linear-card/50 border border-linear-border rounded-xl">
                    <div className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest mb-1">Portal Embed Note</div>
                    <p className="text-[10px] text-linear-text-muted leading-relaxed">
                      Rightmove, Zoopla, and most agent portals block internal framing via CSP headers. Use the <strong className="text-white">Open on Portal</strong> button above to launch in a focused window, or press <kbd className="font-mono text-[8px] bg-blue-500/20 px-1 rounded">L</kbd> to open directly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sticky Actions Footer */}
            <div className="p-6 bg-linear-card border-t border-linear-border grid grid-cols-3 gap-4">
              {/* UX-021: Add to Comparison */}
              <button
                onClick={() => comparison.toggleComparison(currentListing.filename)}
                className="flex items-center justify-center gap-2 py-3.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-500/20 hover:border-blue-500/40 transition-all active:scale-95"
                title="Add to comparison basket"
              >
                <Scale size={14} />
                {comparison.isInComparison(currentListing.filename) ? 'In Basket' : 'Compare'}
              </button>
              {/* UX-021: Approve with inline shortcut */}
              <button
                onClick={() => handleAction('approve')}
                className="flex items-center justify-center gap-2 py-3.5 bg-retro-green/10 text-retro-green border border-retro-green/20 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-retro-green/20 hover:border-retro-green/40 transition-all active:scale-95 shadow-xl shadow-retro-green/5"
              >
                <Check size={14} />
                Approve <kbd className="font-mono text-[8px] opacity-60 ml-1">[A]</kbd>
              </button>
              {/* UX-021: Reject with inline shortcut */}
              <button
                onClick={() => handleAction('reject')}
                className="flex items-center justify-center gap-2 py-3.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-500/20 hover:border-rose-500/40 transition-all active:scale-95 shadow-xl shadow-rose-500/5"
              >
                <Trash2 size={14} />
                Reject <kbd className="font-mono text-[8px] opacity-60 ml-1">[R]</kbd>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FE-180: Submission History Panel */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)} />
      )}
      {isHistoryOpen && (
        <div className="absolute bottom-0 left-64 right-0 z-50 bg-linear-card/95 backdrop-blur-xl border-t border-linear-border shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
          <div className="px-6 py-3 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
            <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <History size={12} className="text-retro-amber" /> Manual Submissions
            </span>
            <button onClick={() => setIsHistoryOpen(false)} className="text-linear-text-muted hover:text-white">
              <X size={14} />
            </button>
          </div>
          {submissions.length === 0 ? (
            <div className="p-6 text-center text-[10px] text-linear-text-muted">
              No manually submitted URLs yet. Paste a Rightmove/Zoopla link above.
            </div>
          ) : (
            <div className="divide-y divide-linear-border/50">
              {submissions.map((s, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-linear-bg/50 transition-colors">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-[10px] font-mono text-blue-400 hover:text-blue-300 truncate transition-colors">
                    {s.url}
                  </a>
                  <span className="text-[9px] text-linear-text-muted font-bold px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400">{s.source}</span>
                  <span className="text-[9px] text-linear-text-muted shrink-0">{new Date(s.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Inbox;
