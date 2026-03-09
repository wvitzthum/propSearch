import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2, AlertCircle, Loader2, RefreshCw, X } from 'lucide-react';

interface QueuedItem {
  url: string;
  source: string;
  queued_at: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  completed_at?: string;
}

const SubmissionHistory: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<QueuedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/manual-queue');
      if (!res.ok) throw new Error('History buffer unavailable');
      const data = await res.json();
      setItems(data); // DuckDB query already handles ordering
      setError(null);
    } catch (err: any) {

      console.error('Failed to fetch submission history:', err);
      setError('System trace unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      const interval = setInterval(fetchHistory, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-end p-4 pointer-events-none">
      <div className="w-full max-w-sm bg-linear-card border border-linear-border rounded-2xl shadow-2xl pointer-events-auto animate-in slide-in-from-right-4 duration-300 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-linear-border flex items-center justify-between bg-linear-card/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-linear-accent" />
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Lead Submission Trace</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchHistory}
              disabled={loading}
              className="p-1 hover:text-white text-linear-text-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={onClose}
              className="p-1 hover:text-white text-linear-text-muted transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-3">
          {error ? (
            <div className="py-12 text-center">
              <AlertCircle size={24} className="text-rose-500/40 mx-auto mb-2" />
              <p className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-linear-text-muted">
              <p className="text-xs italic">No active research cycles in trace.</p>
            </div>
          ) : (
            items.map((item, i) => (
              <div key={i} className="p-3 bg-linear-bg border border-linear-border rounded-xl space-y-2 group">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-grow truncate">
                    <div className="text-[9px] font-mono text-linear-text-muted truncate mb-1">{item.url}</div>
                    <div className="text-[10px] font-bold text-white uppercase tracking-wider">{item.source}</div>
                  </div>
                  <StatusBadge status={item.status || 'queued'} />
                </div>
                <div className="flex justify-between items-center text-[8px] font-mono text-linear-text-muted">
                  <span>QUEUED: {new Date(item.queued_at).toLocaleTimeString()}</span>
                  {item.completed_at && (
                    <span className="text-retro-green">DONE: {new Date(item.completed_at).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 bg-linear-bg/50 border-t border-linear-border text-[8px] font-mono text-linear-text-muted uppercase tracking-widest text-center">
          Real-time Scraper Handshake: {loading ? 'ACTIVE' : 'IDLE'}
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return (
        <div className="flex items-center gap-1 text-[8px] font-black text-retro-green uppercase bg-retro-green/10 px-1.5 py-0.5 rounded border border-retro-green/20">
          <CheckCircle2 size={10} />
          Synced
        </div>
      );
    case 'processing':
      return (
        <div className="flex items-center gap-1 text-[8px] font-black text-blue-400 uppercase bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">
          <Loader2 size={10} className="animate-spin" />
          Analyzing
        </div>
      );
    case 'failed':
      return (
        <div className="flex items-center gap-1 text-[8px] font-black text-rose-400 uppercase bg-rose-400/10 px-1.5 py-0.5 rounded border border-rose-400/20">
          <AlertCircle size={10} />
          Error
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1 text-[8px] font-black text-zinc-500 uppercase bg-zinc-500/10 px-1.5 py-0.5 rounded border border-zinc-500/20">
          <Clock size={10} />
          Waiting
        </div>
      );
  }
};

export default SubmissionHistory;
