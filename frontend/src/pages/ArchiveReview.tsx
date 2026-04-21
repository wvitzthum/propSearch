import React, { useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Archive,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  Search,
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import { usePipeline } from '../hooks/usePipeline';
import AlphaBadge from '../components/AlphaBadge';
import PropertyImage from '../components/PropertyImage';
import type { PropertyWithCoords } from '../types/property';

// FE-185: Archive Review page — surfaces market_status + last_checked throughout the UI
// Deps: DE-165 (market_status schema) — gracefully degrades if fields are absent

type MarketStatus = 'active' | 'under_offer' | 'sold_stc' | 'sold_completed' | 'withdrawn' | 'unknown';

const MARKET_STATUS_CONFIG: Record<MarketStatus, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  active: {
    label: 'Active — Recheck Needed',
    icon: <AlertCircle size={12} />,
    color: 'text-retro-amber',
    bg: 'bg-retro-amber/10',
    border: 'border-retro-amber/30',
  },
  under_offer: {
    label: 'Under Offer',
    icon: <HelpCircle size={12} />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  sold_stc: {
    label: 'Sold STC',
    icon: <CheckCircle2 size={12} />,
    color: 'text-linear-text-muted',
    bg: 'bg-linear-bg',
    border: 'border-linear-border',
  },
  sold_completed: {
    label: 'Sold Completed',
    icon: <CheckCircle2 size={12} />,
    color: 'text-linear-text-muted',
    bg: 'bg-linear-bg',
    border: 'border-linear-border',
  },
  withdrawn: {
    label: 'Withdrawn',
    icon: <XCircle size={12} />,
    color: 'text-linear-text-muted',
    bg: 'bg-linear-bg',
    border: 'border-linear-border',
  },
  unknown: {
    label: 'Unknown',
    icon: <HelpCircle size={12} />,
    color: 'text-linear-text-muted',
    bg: 'bg-linear-bg',
    border: 'border-linear-border',
  },
};

const STATUS_GROUPS: Array<{ key: MarketStatus; label: string }> = [
  { key: 'active', label: 'Active — Recheck Needed' },
  { key: 'under_offer', label: 'Under Offer' },
  { key: 'sold_stc', label: 'Sold STC' },
  { key: 'sold_completed', label: 'Sold Completed' },
  { key: 'withdrawn', label: 'Withdrawn' },
  { key: 'unknown', label: 'Unknown' },
];

const getMarketStatus = (property: PropertyWithCoords): MarketStatus => {
  return property.market_status as MarketStatus || 'unknown';
};

const getLastChecked = (property: PropertyWithCoords): string | null => {
  return property.last_checked as string | null || null;
};

const isStaleCheck = (lastChecked: string | null, days = 30): boolean => {
  if (!lastChecked) return true;
  const diff = Date.now() - new Date(lastChecked).getTime();
  return diff > days * 24 * 60 * 60 * 1000;
};

const ArchiveReview: React.FC = () => {
  const { properties } = usePropertyContext();
  const { setStatus, getStatus } = usePipeline();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [statusFilter, setStatusFilter] = useState<MarketStatus | 'all'>(
    (searchParams.get('market_status') as MarketStatus) || 'all'
  );
  const [staleOnly, setStaleOnly] = useState(false);
  const [reasonSearch, setReasonSearch] = useState('');
  const [isRechecking, setIsRechecking] = useState<string | null>(null);
  const [recheckMsg, setRecheckMsg] = useState<Record<string, 'success' | 'error' | undefined>>({});

  // Get archived properties
  const archivedProperties = useMemo(() => {
    if (!properties) return [];
    return properties.filter(p => getStatus(p.id) === 'archived');
  }, [properties, getStatus]);

  // Filtered archived properties
  const filteredProperties = useMemo(() => {
    let result = [...archivedProperties];
    if (statusFilter !== 'all') {
      result = result.filter(p => getMarketStatus(p) === statusFilter);
    }
    if (staleOnly) {
      result = result.filter(p => isStaleCheck(getLastChecked(p)));
    }
    if (reasonSearch.trim()) {
      const q = reasonSearch.toLowerCase();
      result = result.filter(p => p.archive_reason?.toLowerCase().includes(q));
    }
    return result;
  }, [archivedProperties, statusFilter, staleOnly, reasonSearch]);

  // Group by market_status
  const grouped = useMemo(() => {
    const groups: Record<MarketStatus, typeof filteredProperties> = {
      active: [],
      under_offer: [],
      sold_stc: [],
      sold_completed: [],
      withdrawn: [],
      unknown: [],
    };
    filteredProperties.forEach(p => {
      const ms = getMarketStatus(p);
      if (groups[ms]) groups[ms].push(p);
    });
    return groups;
  }, [filteredProperties]);

  // Handle recheck
  const handleRecheck = useCallback(async (property: PropertyWithCoords) => {
    setIsRechecking(property.id);
    try {
      const res = await fetch(`/api/properties/${property.id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_checked: new Date().toISOString() })
      });
      if (res.ok) {
        setRecheckMsg(prev => ({ ...prev, [property.id]: 'success' }));
        setTimeout(() => setRecheckMsg(prev => ({ ...prev, [property.id]: undefined })), 3000);
      } else {
        setRecheckMsg(prev => ({ ...prev, [property.id]: 'error' }));
      }
    } catch {
      setRecheckMsg(prev => ({ ...prev, [property.id]: 'error' }));
    } finally {
      setIsRechecking(null);
    }
  }, []);

  // Handle reactivate
  const handleReactivate = useCallback((property: PropertyWithCoords) => {
    setStatus(property.id, 'discovered');
    // Also clear market_status in localStorage
    const saved = JSON.parse(localStorage.getItem('propsearch_archive_meta') || '{}');
    delete saved[property.id];
    localStorage.setItem('propsearch_archive_meta', JSON.stringify(saved));
  }, [setStatus]);

  const handleStatusFilter = (status: MarketStatus | 'all') => {
    setStatusFilter(status);
    const next = new URLSearchParams(searchParams);
    if (status === 'all') next.delete('market_status');
    else next.set('market_status', status);
    setSearchParams(next, { replace: true });
  };

  const totalGrouped = filteredProperties.length;
  const activeCount = grouped.active.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Archive size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Archive Review</h1>
            <p className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">
              {archivedProperties.length} archived · {activeCount} active-recheck-needed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/properties?status=archived"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
          >
            View All Archived
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Active Recheck Queue Alert */}
      {activeCount > 0 && (
        <div className="p-4 bg-retro-amber/5 border border-retro-amber/20 rounded-xl flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-retro-amber/10 flex items-center justify-center text-retro-amber shrink-0 mt-0.5">
            <AlertCircle size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-retro-amber uppercase tracking-widest">
              {activeCount} Properties Still Listed — Recheck Required
            </h3>
            <p className="text-[10px] text-linear-text-muted mt-1 leading-relaxed">
              These properties were flagged as still active on Rightmove/Zoopla but have incomplete data. Verify current listing status before re-activating.
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-linear-card border border-linear-border rounded-xl p-4 flex flex-wrap items-center gap-4">
        {/* Market Status Filter */}
        <div>
          <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">Market Status</div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => handleStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-black'
                  : 'bg-linear-bg text-linear-text-muted border border-linear-border hover:text-white'
              }`}
            >
              All ({archivedProperties.length})
            </button>
            {STATUS_GROUPS.map(({ key }) => {
              const count = grouped[key].length;
              if (count === 0 && statusFilter !== key) return null;
              const cfg = MARKET_STATUS_CONFIG[key];
              return (
                <button
                  key={key}
                  onClick={() => handleStatusFilter(key)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
                    statusFilter === key
                      ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                      : 'bg-linear-bg text-linear-text-muted border border-linear-border hover:text-white'
                  }`}
                >
                  {cfg.icon}
                  {count}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stale Check Toggle */}
        <div>
          <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">Freshness</div>
          <button
            onClick={() => setStaleOnly(v => !v)}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              staleOnly
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-linear-bg text-linear-text-muted border border-linear-border hover:text-white'
            }`}
          >
            <RefreshCw size={10} />
            Not checked 30+ days
          </button>
        </div>

        {/* Reason Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">Archive Reason</div>
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-linear-text-muted" />
            <input
              type="text"
              value={reasonSearch}
              onChange={e => setReasonSearch(e.target.value)}
              placeholder="Search archive reason..."
              className="w-full pl-8 pr-3 py-1.5 bg-linear-bg border border-linear-border rounded-lg text-[10px] text-white placeholder-linear-text-muted focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-[10px] text-linear-text-muted font-bold uppercase tracking-widest">
        Showing {totalGrouped} of {archivedProperties.length} archived properties
        {statusFilter !== 'all' && ` · Filtered by ${MARKET_STATUS_CONFIG[statusFilter as MarketStatus]?.label || statusFilter}`}
      </div>

      {/* Market Status Groups */}
      {totalGrouped === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="h-16 w-16 bg-linear-card text-linear-text-muted/30 rounded-2xl flex items-center justify-center mb-6 border border-linear-border">
            <Archive size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No archived properties match</h3>
          <p className="text-xs text-linear-text-muted">Try adjusting your filters or clear them to see all archived properties.</p>
          <button
            onClick={() => { setStatusFilter('all'); setStaleOnly(false); setReasonSearch(''); }}
            className="mt-4 px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-500/30 transition-all"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {STATUS_GROUPS.map(({ key, label }) => {
            const props = grouped[key];
            if (props.length === 0 && statusFilter !== 'all' && statusFilter !== key) return null;
            const cfg = MARKET_STATUS_CONFIG[key];
            return (
              <div key={key}>
                {/* Group Header */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-t-xl border-b-0 ${cfg.bg} ${cfg.border} border`}>
                  <span className={cfg.color}>{cfg.icon}</span>
                  <h2 className={`text-[11px] font-black uppercase tracking-widest ${cfg.color}`}>{label}</h2>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-linear-bg border border-linear-border ${cfg.color}`}>
                    {props.length}
                  </span>
                </div>

                {/* Property Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 border border-linear-border rounded-b-xl overflow-hidden">
                  {props.map(property => {
                    const marketStatus = getMarketStatus(property);
                    const lastChecked = getLastChecked(property);
                    const stale = isStaleCheck(lastChecked);
                    const msg = recheckMsg[property.id];
                    return (
                      <div
                        key={property.id}
                        className="bg-linear-card border border-linear-border rounded-b-xl overflow-hidden hover:border-blue-500/30 transition-all"
                      >
                        {/* Image + market status badge */}
                        <div className="relative h-32 bg-linear-bg overflow-hidden">
                          <PropertyImage src={property.image_url} alt={property.address} className="w-full h-full object-cover opacity-70" />
                          <div className="absolute inset-0 bg-gradient-to-t from-linear-card via-transparent to-transparent" />
                          {/* Market Status Badge */}
                          <div className="absolute top-2 left-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                              {cfg.icon}
                              {cfg.label}
                            </span>
                          </div>
                          {/* Alpha Badge */}
                          <div className="absolute top-2 right-2">
                            <AlphaBadge score={property.alpha_score} />
                          </div>
                          {/* Stale indicator */}
                          {stale && (
                            <div className="absolute bottom-2 left-2">
                              <span className="px-1.5 py-0.5 bg-retro-amber/90 text-black text-[8px] font-black uppercase rounded flex items-center gap-1">
                                <RefreshCw size={8} />
                                Needs Recheck
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="p-3 space-y-2">
                          <div>
                            <p className="text-xs font-bold text-white truncate">{property.address}</p>
                            <p className="text-[9px] text-linear-text-muted">{property.area}</p>
                          </div>

                          {/* Last Checked */}
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-linear-text-muted font-bold uppercase tracking-widest">Last Checked</span>
                            <span className={`text-[9px] font-bold ${stale ? 'text-retro-amber' : 'text-linear-text-muted'}`}>
                              {lastChecked
                                ? new Date(lastChecked).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                                : 'Never verified'}
                            </span>
                          </div>

                          {/* Archive Reason */}
                          {property.archive_reason && (
                            <div className="text-[9px] text-linear-text-muted/70 italic">
                              {property.archive_reason}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleRecheck(property)}
                              disabled={isRechecking === property.id}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                msg === 'success'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : msg === 'error'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-linear-bg text-linear-text-muted border border-linear-border hover:border-blue-500/30 hover:text-white'
                              }`}
                            >
                              {isRechecking === property.id ? (
                                <RefreshCw size={10} className="animate-spin" />
                              ) : msg === 'success' ? (
                                <CheckCircle2 size={10} />
                              ) : (
                                <RefreshCw size={10} />
                              )}
                              {msg === 'success' ? 'Rechecked' : msg === 'error' ? 'Failed' : 'Recheck'}
                            </button>
                            {marketStatus === 'active' && (
                              <button
                                onClick={() => handleReactivate(property)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-all"
                              >
                                <RotateCcw size={10} />
                                Reactivate
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ArchiveReview;
