import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Command, Check, Zap } from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import type { PropertyWithCoords } from '../types/property';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PropertyWithCoords[]>([]);
  const [injectionStatus, setInjectionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { properties } = usePropertyContext();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDirectInjection = async () => {
    if (!query.startsWith('http')) return;
    
    try {
      setInjectionStatus('loading');
      const res = await fetch('/api/manual-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: query, source: 'MANUAL_INJECTION' })
      });
      
      if (!res.ok) throw new Error('Injection failed');
      
      setInjectionStatus('success');
      setTimeout(() => {
        setInjectionStatus('idle');
        setQuery('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Injection error:', err);
      setInjectionStatus('error');
      setTimeout(() => setInjectionStatus('idle'), 3000);
    }
  };

  const isUrl = query.startsWith('http');

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      setQuery('');
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    if (query.trim() === '') {
      setResults(properties.slice(0, 5)); // Show recent/featured if empty
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = properties.filter(p => 
      p.address.toLowerCase().includes(lowerQuery) || 
      p.area.toLowerCase().includes(lowerQuery) ||
      p.id.toLowerCase().includes(lowerQuery)
    ).slice(0, 8);
    
    setResults(filtered);
  }, [query, properties]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-linear-card border border-linear-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 border-b border-linear-border bg-linear-bg/50">
          <Search size={18} className="text-linear-accent" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search assets or paste property URL..."
            className="w-full py-4 px-3 bg-transparent text-white placeholder-linear-text-muted focus:outline-none text-sm font-medium"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isUrl) {
                handleDirectInjection();
              }
            }}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-linear-border text-[10px] font-mono text-linear-text-muted">
            <span className="text-[8px]">ESC</span>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
          {isUrl ? (
            <div className="p-4 space-y-4">
              <div className="px-3 py-2 text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">
                Direct Asset Injection Detected
              </div>
              <button
                onClick={handleDirectInjection}
                disabled={injectionStatus === 'loading'}
                className={`w-full flex items-center justify-between p-6 rounded-2xl border transition-all ${
                  injectionStatus === 'success' ? 'bg-retro-green/10 border-retro-green/40' :
                  injectionStatus === 'error' ? 'bg-rose-500/10 border-rose-500/40' :
                  'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40 group'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                    injectionStatus === 'success' ? 'bg-retro-green/20 text-retro-green' :
                    injectionStatus === 'error' ? 'bg-rose-500/20 text-rose-500' :
                    'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30'
                  }`}>
                    {injectionStatus === 'loading' ? <div className="h-5 w-5 border-2 border-t-transparent border-white animate-spin rounded-full" /> :
                     injectionStatus === 'success' ? <Check size={24} /> :
                     <Zap size={24} />}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-white uppercase tracking-widest">
                      {injectionStatus === 'loading' ? 'Analyzing Endpoint...' :
                       injectionStatus === 'success' ? 'Added to Manual Queue' :
                       injectionStatus === 'error' ? 'Handshake Failed' :
                       'Inject URL to Scraper'}
                    </div>
                    <div className="text-[10px] text-linear-text-muted font-mono truncate max-w-[300px] mt-1">{query}</div>
                  </div>
                </div>
                <ArrowRight size={20} className="text-linear-accent" />
              </button>
              <div className="px-4 text-[10px] text-linear-text-muted leading-relaxed italic text-center">
                Manual injection prioritizes this URL in the next scrape cycle. Institutional metrics (Alpha Score, Commute) will be calculated upon ingestion.
              </div>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">
                {query ? 'Search Results' : 'Institutional Assets'}
              </div>
              
              <div className="space-y-1 mt-1">
                {results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      navigate(`/property/${p.id}`);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-linear-bg border border-transparent hover:border-linear-border transition-all group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-linear-bg border border-linear-border flex items-center justify-center text-linear-accent group-hover:text-blue-400 transition-colors">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{p.address}</div>
                        <div className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest">{p.area}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-white">£{p.realistic_price.toLocaleString()}</div>
                        <div className="text-[9px] text-linear-text-muted uppercase font-bold">Target Price</div>
                      </div>
                      <ArrowRight size={14} className="text-linear-accent opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
                
                {results.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-sm text-linear-text-muted">No assets matching "{query}" found.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-3 bg-linear-bg/50 border-t border-linear-border flex items-center justify-between text-[10px] font-medium text-linear-text-muted uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-linear-card border border-linear-border text-white">↑↓</span>
              Navigate
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-linear-card border border-linear-border text-white">ENTER</span>
              {isUrl ? 'Inject URL' : 'Open Asset'}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Command size={10} />
            {isUrl ? 'Injection Mode' : 'Search'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
