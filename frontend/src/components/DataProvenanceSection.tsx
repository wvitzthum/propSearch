import React, { useState } from 'react';
import { ExternalLink, ChevronDown, Globe } from 'lucide-react';

interface SourceEntry {
  name: string;
  url?: string;
  data_used?: string[];
  freshness?: 'current' | 'stale' | 'outdated';
  last_refreshed?: string;
}

const SOURCE_CONFIG: Record<string, { color: string; label: string }> = {
  boe: { color: '#3b82f6', label: 'Bank of England' },
  land_registry: { color: '#22c55e', label: 'HM Land Registry' },
  hmrc: { color: '#f59e0b', label: 'HM Revenue & Customs' },
  rightmove: { color: '#ef4444', label: 'Rightmove' },
  oxford_economics: { color: '#a855f7', label: 'Oxford Economics' },
};

function computeFreshness(lastRefreshed?: string): { color: string; bg: string; label: string } {
  if (!lastRefreshed) return { color: '#a1a1aa', bg: 'bg-zinc-600', label: 'UNKNOWN' };
  const refreshed = new Date(lastRefreshed);
  const now = new Date();
  const daysDiff = (now.getTime() - refreshed.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff <= 7) return { color: '#22c55e', bg: 'bg-emerald-500/20', label: 'CURRENT' };
  if (daysDiff <= 14) return { color: '#f59e0b', bg: 'bg-amber-500/20', label: 'STALE' };
  return { color: '#ef4444', bg: 'bg-red-500/20', label: 'OUTDATED' };
}

interface DataProvenanceSectionProps {
  sources?: Record<string, SourceEntry>;
  lastRefreshed?: string;
}

const DataProvenanceSection: React.FC<DataProvenanceSectionProps> = ({
  sources = {},
  lastRefreshed,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const freshness = computeFreshness(lastRefreshed);

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(v => !v); } }}
        aria-expanded={isOpen}
        aria-controls="data-provenance-body"
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-linear-bg/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-retro-green" />
          <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Data Provenance</h3>
          <span className="text-[9px] text-linear-text-muted">— source attribution &amp; freshness</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${freshness.bg}`} style={{ color: freshness.color }}>
            {freshness.label}
          </div>
          <ChevronDown
            size={14}
            className={`text-linear-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div id="data-provenance-body" className="px-4 pb-4 border-t border-linear-border/50 space-y-4 pt-4">
          <p className="text-[10px] text-linear-text-muted leading-relaxed">
            All metrics on this page are sourced from authoritative public datasets. Provenance data is
            refreshed weekly (Mondays 09:00 UTC) from primary sources.
          </p>

          {/* Sources grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(sources).map(([key, source]) => {
              const config = SOURCE_CONFIG[key] || { color: '#a1a1aa', label: source.name };
              return (
                <div
                  key={key}
                  className="p-3 rounded-xl border border-linear-border bg-linear-bg/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-black text-white hover:text-blue-400 transition-colors uppercase tracking-wider flex items-center gap-1"
                      >
                        {config.label} <ExternalLink size={7} />
                      </a>
                    ) : (
                      <span className="text-[9px] font-black text-white uppercase tracking-wider">
                        {config.label}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {(source.data_used || []).map((item: string, i: number) => (
                      <div key={i} className="text-[8px] text-linear-text-muted/80 pl-3.5">
                        · {item}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Refresh metadata */}
          {lastRefreshed && (
            <div className="flex items-center gap-2 text-[9px] text-linear-text-muted/60">
              <Globe size={9} />
              <span>Full data refresh: <span className="font-mono text-white/60">{lastRefreshed}</span></span>
              <span>·</span>
              <span>Next expected: Monday 09:00 UTC</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataProvenanceSection;
