import React, { useState, useEffect, useCallback } from 'react';
import PropertyImage from '../components/PropertyImage';
import LoadingNode from '../components/LoadingNode';
import { Inbox as InboxIcon, Check, X, ArrowRight, Keyboard, Zap, ShieldAlert, Split, Layout, Maximize2 } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleAction = async (action: 'approve' | 'reject') => {
    if (listings.length === 0) return;
    
    const listing = listings[currentIndex];
    
    try {
      // In a production app, we'd send the actual action to the API
      // For this prototype, we simulate the handshake
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

      console.log(`${action.toUpperCase()}: ${listing.filename} - Synced to buffer.`);
      
      // Move to next
      if (currentIndex < listings.length - 1) {
        setCurrentListIndex(prev => prev + 1);
      } else {
        setListings([]); // Finished
      }
    } catch (err) {
      console.error('Triage sync error:', err);
      // Fallback: move to next even if API fails for UX fluidity in demo
      if (currentIndex < listings.length - 1) {
        setCurrentListIndex(prev => prev + 1);
      } else {
        setListings([]);
      }
    }
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'a') handleAction('approve');
      if (e.key.toLowerCase() === 'r') handleAction('reject');
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [listings, currentIndex]);

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
    <div className="bg-linear-bg text-white">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Lead Inbox</h1>
          <p className="text-linear-text-muted text-sm">Rapid triage of unfiltered property leads from automated scrapers.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1.5 bg-linear-card border border-linear-border rounded-lg flex items-center gap-2">
            <InboxIcon size={14} className="text-linear-accent" />
            <span className="text-xs font-bold text-white">{listings.length} Pending</span>
          </div>
        </div>
      </div>

      {!currentListing ? (
        <div className="p-20 bg-linear-card border border-linear-border rounded-3xl text-center">
          <div className="h-16 w-16 bg-retro-green/10 text-retro-green rounded-full flex items-center justify-center mx-auto mb-6 border border-retro-green/20">
            <Check size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Inbox Zero</h2>
          <p className="text-linear-text-muted text-sm">All raw leads have been triaged. Waiting for next scrape cycle.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <div className="aspect-video w-full bg-linear-card rounded-3xl overflow-hidden border border-linear-border relative group shadow-2xl">
              <PropertyImage src={currentListing.image_url || ''} alt="Raw Lead" className="h-full w-full opacity-40 grayscale" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  {currentListing.image_url ? null : <Zap size={48} className="text-linear-accent animate-pulse" />}
                  <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-[0.3em]">
                    {currentListing.image_url ? 'Visual Captured' : 'Awaiting Full Scrape'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8 bg-linear-card border border-linear-border rounded-3xl space-y-6">
              <div>
                <span className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-2 block">Source: {currentListing.source}</span>
                <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">{currentListing.address}</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-linear-border">
                <div className="space-y-1">
                  <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">Filename</span>
                  <div className="text-xs font-mono text-white truncate">{currentListing.filename}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">Metadata</span>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Unverified Area</div>
                </div>
              </div>

              <div className="pt-6 border-t border-linear-border">
                <a href={currentListing.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[10px] font-black text-linear-accent hover:text-white uppercase tracking-widest transition-colors">
                  Open Portal Reference <ArrowRight size={12} />
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            <div className="p-8 bg-linear-card border border-linear-border rounded-3xl space-y-8 shadow-2xl">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <Keyboard size={16} className="text-linear-accent" />
                Rapid Triage Protocol
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleAction('approve')}
                  className="group flex flex-col items-center gap-4 p-8 bg-retro-green/5 border border-retro-green/20 rounded-2xl hover:bg-retro-green/10 hover:border-retro-green/40 transition-all active:scale-95"
                >
                  <div className="h-12 w-12 bg-retro-green/20 text-retro-green rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Check size={24} />
                  </div>
                  <div className="text-center">
                    <span className="block text-sm font-black text-white uppercase tracking-widest">Approve</span>
                    <span className="text-[10px] text-retro-green/60 font-bold uppercase tracking-widest">[Press A]</span>
                  </div>
                </button>

                <button 
                  onClick={() => handleAction('reject')}
                  className="group flex flex-col items-center gap-4 p-8 bg-rose-500/5 border border-rose-500/20 rounded-2xl hover:bg-rose-500/10 hover:border-rose-500/40 transition-all active:scale-95"
                >
                  <div className="h-12 w-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <X size={24} />
                  </div>
                  <div className="text-center">
                    <span className="block text-sm font-black text-white uppercase tracking-widest">Reject</span>
                    <span className="text-[10px] text-rose-500/60 font-bold uppercase tracking-widest">[Press R]</span>
                  </div>
                </button>
              </div>

              <div className="p-6 bg-linear-bg border border-linear-border rounded-2xl">
                <p className="text-xs text-linear-text-muted leading-relaxed italic">
                  Approval will promote the lead to the Deep Scraper pipeline for Alpha Scoring and spatial analysis. Rejection will permanently archive the raw listing.
                </p>
              </div>
            </div>

            <div className="px-8 flex items-center justify-between text-[10px] font-black text-linear-text-muted uppercase tracking-[0.3em]">
              <span>Step {currentIndex + 1} of {listings.length}</span>
              <div className="flex gap-1">
                {listings.map((_, i) => (
                  <div key={i} className={`h-1 w-4 rounded-full ${i === currentIndex ? 'bg-linear-accent' : i < currentIndex ? 'bg-retro-green/40' : 'bg-linear-border'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
