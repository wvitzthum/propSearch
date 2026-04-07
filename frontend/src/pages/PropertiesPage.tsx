import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2, Search, Table as TableIcon, LayoutGrid, Filter,
  X, Check, Eye, ChevronRight, Star, TrendingUp
} from 'lucide-react';
import PropertyTable from '../components/PropertyTable';
import LoadingNode from '../components/LoadingNode';
import AlphaBadge from '../components/AlphaBadge';
import PropertyImage from '../components/PropertyImage';
import ThesisTagBadge from '../components/ThesisTagBadge';
import PreviewDrawer from '../components/PreviewDrawer';
import { usePropertyContext } from '../hooks/PropertyContext';
import { usePipeline } from '../hooks/usePipeline';
import { useThesisTags } from '../hooks/useThesisTags';
import { useComparison } from '../hooks/useComparison';
import type { PropertyWithCoords } from '../types/property';
import type { PropertyStatus } from '../hooks/usePipeline';
import type { MarketStatus } from '../types/property';
import MarketStatusBadge from '../components/MarketStatusBadge';

/** UX-007: URL-persisted filters. UX-008: vim-style keyboard navigation. */
const PropertiesPage: React.FC = () => {
  const { properties, loading, updateFilters, filters, registerPipeline } = usePropertyContext();
  const { setStatus, getStatus } = usePipeline();
  const { getTags } = useThesisTags();
  const comparison = useComparison();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filteredPropsRef = useRef<PropertyWithCoords[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  // UX-008: Preview drawer state
  const [previewProperty, setPreviewProperty] = useState<PropertyWithCoords | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // FE-181: Register pipeline getter
  useEffect(() => { registerPipeline(getStatus); }, [registerPipeline, getStatus]);

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter panel state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // FE-204.1: Default hides archived to reduce noise — user sees active pipeline only
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false); // FE-204.1: toggle for archived visibility
  // ADR-017: market_status filter — analyst-owned axis
  const [marketStatusFilter, setMarketStatusFilter] = useState<MarketStatus | 'all'>('all');
  const [alphaThreshold, setAlphaThreshold] = useState(0);
  const [maxPrice, setMaxPrice] = useState(3000000);
  const [minSqft, setMinSqft] = useState(0);
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [searchQuery, setSearchQuery] = useState('');

  // UX-008: Selected row index for keyboard navigation
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);

  // Column visibility
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);

  // UX-018: Smart filter state
  const [isValueBuyFilter, setIsValueBuyFilter] = useState(false);

  // UX-018: Pipeline counts for Status Pipeline Strip
  const pipelineCounts = useMemo(() => {
    const c = { discovered: 0, shortlisted: 0, vetted: 0, archived: 0 };
    properties.forEach(p => {
      const s = getStatus(p.id);
      if (s in c) c[s as keyof typeof c]++;
    });
    return c;
  }, [properties, getStatus]);

  const allColumns = [
    { key: 'alpha', label: 'Alpha Score' },
    { key: 'price', label: 'Price' },
    { key: 'pricePerSqm', label: 'Price/SQM' },
    { key: 'appreciation', label: 'Appreciation' },
    { key: 'dom', label: 'Days on Market' },
    { key: 'sqft', label: 'SQFT' },
    { key: 'epc', label: 'EPC' },
    { key: 'tenure', label: 'Tenure' },
    { key: 'commute', label: 'Commute' },
    { key: 'ltv', label: 'LTV Match' },
  ];

  // --- Computed values (declared before useEffects that depend on them) ---

  const hasActiveFilters = statusFilter !== 'all' || marketStatusFilter !== 'all' || areaFilter !== 'All Areas' || alphaThreshold > 0 || maxPrice < 3000000 || minSqft > 0 || isValueBuyFilter;

  const availableAreas = useMemo(() => {
    if (!properties) return [];
    return Array.from(new Set(properties.map(p => (p.area ?? '').split(' (')[0]))).sort();
  }, [properties]);

  // Filtered + sorted properties — MUST be before keyboard nav useEffect
  // FE-204.1: If showArchived is false, filter out archived pipeline_status by default
  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    let result = [...properties];
    // FE-204.1: Always exclude archived unless showArchived is true or statusFilter === 'archived'
    if (!showArchived && statusFilter !== 'archived') {
      result = result.filter(p => getStatus(p.id) !== 'archived');
    }
    if (statusFilter !== 'all') result = result.filter(p => getStatus(p.id) === statusFilter);
    // ADR-017: market_status filter — analyst-owned axis
    if (marketStatusFilter !== 'all') result = result.filter(p => p.market_status === marketStatusFilter);
    if (areaFilter !== 'All Areas') result = result.filter(p => (p.area ?? '').includes(areaFilter));
    if (alphaThreshold > 0) result = result.filter(p => p.alpha_score >= alphaThreshold);
    result = result.filter(p => p.realistic_price <= maxPrice);
    if (minSqft > 0) result = result.filter(p => (p.sqft ?? 0) >= minSqft);
    if (isValueBuyFilter) result = result.filter(p => p.is_value_buy);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.address?.toLowerCase().includes(q) || p.area?.toLowerCase().includes(q) || String(p.realistic_price).includes(q));
    }
    const sortBy = filters.sortBy ?? 'alpha_score';
    const dir = filters.sortOrder === 'ASC' ? 1 : -1;
    result.sort((a, b) => {
      switch (sortBy) {
        case 'alpha_score': return (b.alpha_score - a.alpha_score) * dir;
        case 'realistic_price': return (a.realistic_price - b.realistic_price) * dir;
        case 'price_per_sqm': return (a.price_per_sqm - b.price_per_sqm) * dir;
        case 'appreciation_potential': return (((b as any).appreciation_potential ?? 0) - ((a as any).appreciation_potential ?? 0)) * dir;
        case 'dom': return (((a as any).dom ?? 999) - ((b as any).dom ?? 999)) * dir;
        case 'sqft': return ((a.sqft ?? 0) - (b.sqft ?? 0)) * dir;
        // FE-216: Date Added sort — uses metadata.first_seen ISO string, lex compare works for dates
        case 'date_added': {
          const aDate = (a.metadata?.first_seen ?? '');
          const bDate = (b.metadata?.first_seen ?? '');
          return (aDate < bDate ? -1 : aDate > bDate ? 1 : 0) * dir;
        }
        default: return 0;
      }
    });
    return result;
  }, [properties, statusFilter, marketStatusFilter, areaFilter, alphaThreshold, maxPrice, minSqft, isValueBuyFilter, searchQuery, filters, getStatus, showArchived]);

  // Keep ref in sync with filteredProperties (for use inside keyboard handler)
  useEffect(() => { filteredPropsRef.current = filteredProperties; }, [filteredProperties]);

  // --- Callbacks ---

  const syncAllFiltersToUrl = useCallback(() => {
    const next = new URLSearchParams();
    if (statusFilter !== 'all') next.set('status', statusFilter);
    if (marketStatusFilter !== 'all') next.set('marketStatus', marketStatusFilter);
    if (areaFilter !== 'All Areas') next.set('area', encodeURIComponent(areaFilter));
    if (alphaThreshold > 0) next.set('alpha', String(alphaThreshold));
    if (maxPrice < 3000000) next.set('maxPrice', String(maxPrice));
    if (minSqft > 0) next.set('minSqft', String(minSqft));
    if (searchQuery.trim()) next.set('q', encodeURIComponent(searchQuery.trim()));
    if (showArchived) next.set('showArchived', 'true');
    setSearchParams(next, { replace: true });
  }, [statusFilter, marketStatusFilter, areaFilter, alphaThreshold, maxPrice, minSqft, searchQuery, showArchived, setSearchParams]);

  const handleStatusFilter = useCallback((status: PropertyStatus | 'all') => {
    setStatusFilter(status);
    updateFilters({ archived: status === 'archived' });
    syncAllFiltersToUrl();
  }, [updateFilters, syncAllFiltersToUrl]);

  const syncFilterTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleFilterChange = useCallback((updater: () => void) => {
    updater();
    clearTimeout(syncFilterTimeout.current);
    syncFilterTimeout.current = setTimeout(syncAllFiltersToUrl, 300);
  }, [syncAllFiltersToUrl]);

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setShowArchived(false); // FE-204.1: reset to hiding archived
    setMarketStatusFilter('all'); // ADR-017: reset market status filter
    setAreaFilter('All Areas');
    setAlphaThreshold(0);
    setMaxPrice(3000000);
    setMinSqft(0);
    setSearchQuery('');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // --- Effects ---

  // UX-007: Initialize all filters from URL params on mount
  useEffect(() => {
    const urlStatus = searchParams.get('status') as PropertyStatus | null;
    if (urlStatus && ['discovered', 'shortlisted', 'vetted', 'archived'].includes(urlStatus)) {
      setStatusFilter(urlStatus);
      updateFilters({ archived: urlStatus === 'archived' });
    }
    const urlArea = searchParams.get('area');
    if (urlArea) setAreaFilter(decodeURIComponent(urlArea));
    const urlAlpha = searchParams.get('alpha');
    if (urlAlpha) setAlphaThreshold(Number(urlAlpha));
    const urlPrice = searchParams.get('maxPrice');
    if (urlPrice) setMaxPrice(Number(urlPrice));
    const urlSqft = searchParams.get('minSqft');
    if (urlSqft) setMinSqft(Number(urlSqft));
    const urlQ = searchParams.get('q');
    if (urlQ) setSearchQuery(decodeURIComponent(urlQ));
    // FE-204.1: Allow URL override of archived visibility
    const urlShowArchived = searchParams.get('showArchived');
    if (urlShowArchived === 'true') setShowArchived(true);
    // ADR-017: Initialize market_status filter from URL
    const urlMarketStatus = searchParams.get('marketStatus') as MarketStatus | null;
    if (urlMarketStatus && ['active', 'under_offer', 'sold_stc', 'sold_completed', 'withdrawn', 'unknown'].includes(urlMarketStatus)) {
      setMarketStatusFilter(urlMarketStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // T/G: view mode shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 't' || e.key === 'T') setViewMode('table');
      if (e.key === 'g' || e.key === 'G') setViewMode('grid');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // UX-008: vim-style keyboard shortcuts (uses ref to avoid needing filteredProperties in deps)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      const fp = filteredPropsRef.current;

      if (key === '/') { e.preventDefault(); searchInputRef.current?.focus(); return; }
      if (key === 'j') { e.preventDefault(); setSelectedRowIndex(prev => Math.min(prev + 1, fp.length - 1)); return; }
      if (key === 'k') { e.preventDefault(); setSelectedRowIndex(prev => Math.max(prev - 1, 0)); return; }
      if (key === 'o' && selectedRowIndex >= 0 && fp[selectedRowIndex]) {
        e.preventDefault();
        setPreviewProperty(fp[selectedRowIndex]);
        setIsPreviewOpen(true);
        return;
      }
      if (key === 's' && selectedRowIndex >= 0 && fp[selectedRowIndex]) {
        e.preventDefault();
        const prop = fp[selectedRowIndex];
        setStatus(prop.id, getStatus(prop.id) === 'shortlisted' ? 'discovered' : 'shortlisted');
        return;
      }
      if (key === 'a' && selectedRowIndex >= 0 && fp[selectedRowIndex]) {
        e.preventDefault();
        comparison.toggleComparison(fp[selectedRowIndex].id);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedRowIndex, getStatus, setStatus, comparison]);

  // --- Render ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingNode label="Loading property database..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-linear-card border border-linear-border flex items-center justify-center text-linear-accent">
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-white">Properties</h1>
            <p className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">Asset Database</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-linear-card border border-linear-border rounded-lg text-xs">
            <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Showing</span>
            <span className="ml-2 font-bold text-white">{filteredProperties.length}</span>
            <span className="ml-1 text-linear-text-muted">/ {properties.length}</span>
          </div>
        </div>
      </div>

      {/* UX-018: Smart Command Bar — FE-220: mobile-responsive with wrapping */}
      <div className="flex flex-wrap md:flex-nowrap items-start md:items-center gap-2 md:gap-3">
        {/* Smart filter buttons — wraps on mobile, single row on desktop */}
        <div className="flex bg-linear-card border border-linear-border rounded-lg p-0.5 gap-0.5 flex-wrap sm:flex-nowrap">
          {/* Top Alpha */}
          <button
            onClick={() => {
              if (alphaThreshold >= 7.5) {
                handleFilterChange(() => setAlphaThreshold(0));
              } else {
                handleFilterChange(() => { setAlphaThreshold(7.5); setStatusFilter('all'); setIsValueBuyFilter(false); });
              }
            }}
            title="Top Alpha: Show properties with alpha ≥ 7.5"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-all ${alphaThreshold >= 7.5 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-linear-text-muted hover:text-white hover:bg-linear-bg'}`}
          >
            <Star size={10} className={alphaThreshold >= 7.5 ? 'text-emerald-400 fill-current' : ''} />
            <span className="hidden sm:inline">Top Alpha</span>
            <span className="sm:hidden">Alpha+</span>
          </button>

          {/* Value Buys */}
          <button
            onClick={() => {
              handleFilterChange(() => {
                setIsValueBuyFilter(v => !v);
                setStatusFilter('all');
                setAlphaThreshold(0);
              });
            }}
            title="Value Buys: Show only value buy properties"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-all ${isValueBuyFilter ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-linear-text-muted hover:text-white hover:bg-linear-bg'}`}
          >
            <TrendingUp size={10} className={isValueBuyFilter ? 'text-emerald-400' : ''} />
            <span className="hidden sm:inline">Value Buys</span>
            <span className="sm:hidden">Value</span>
          </button>

          {/* Shortlisted */}
          <button
            onClick={() => {
              handleFilterChange(() => {
                setStatusFilter('shortlisted');
                setIsValueBuyFilter(false);
                setAlphaThreshold(0);
              });
            }}
            title="Shortlisted: Show shortlisted properties"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-all ${statusFilter === 'shortlisted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-linear-text-muted hover:text-white hover:bg-linear-bg'}`}
          >
            <span className="hidden sm:inline">Shortlisted</span>
            <span className="sm:hidden">Short</span>
          </button>

          {/* All */}
          <button
            onClick={() => {
              clearFilters();
              setIsValueBuyFilter(false);
            }}
            title="All: Show all properties"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-all ${hasActiveFilters ? 'text-linear-text-muted hover:text-white hover:bg-linear-bg' : 'text-white bg-linear-bg border border-linear-border'}`}
          >
            All
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex bg-linear-card border border-linear-border rounded-lg p-0.5 gap-0.5">
          <button onClick={() => setViewMode('table')} title="Table view (T)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-all ${viewMode === 'table' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-linear-text-muted hover:text-white'}`}>
            <TableIcon size={12} /><span className="hidden sm:inline">Table</span>
          </button>
          <button onClick={() => setViewMode('grid')} title="Grid view (G)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-all ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-linear-text-muted hover:text-white'}`}>
            <LayoutGrid size={12} /><span className="hidden sm:inline">Grid</span>
          </button>
        </div>

        {/* Search — full width on mobile, fixed width on desktop */}
        <div className="relative flex-1 w-full min-w-0">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-linear-text-muted" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => handleFilterChange(() => setSearchQuery(e.target.value))}
            placeholder="Search address, area... (/)"
            className="w-full pl-8 pr-3 py-1.5 bg-linear-card border border-linear-border rounded-lg text-xs text-white placeholder-linear-text-muted focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Desktop-only right controls */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {/* Column visibility (table only, desktop) */}
          {viewMode === 'table' && (
            <div className="relative">
              <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-linear-card border border-linear-border rounded-lg text-[10px] font-bold text-linear-text-muted hover:text-white transition-colors">
                <Eye size={12} />Columns
              </button>
            {isColumnMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsColumnMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 bg-linear-card border border-linear-border rounded-xl shadow-2xl w-52 overflow-hidden">
                  <div className="px-3 py-2 border-b border-linear-border flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Visible Columns</span>
                    <button onClick={() => setHiddenColumns(new Set())} className="text-[9px] text-blue-400 hover:text-blue-300">Show all</button>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {allColumns.map(col => (
                      <button key={col.key} onClick={() => {
                        const next = new Set(hiddenColumns);
                        if (next.has(col.key)) next.delete(col.key); else next.add(col.key);
                        setHiddenColumns(next);
                      }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-linear-bg transition-colors text-left">
                        <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${hiddenColumns.has(col.key) ? 'border-linear-border bg-transparent' : 'bg-blue-500 border-blue-500'}`}>
                          {!hiddenColumns.has(col.key) && <Check size={10} className="text-white" />}
                        </div>
                        <span className={`text-[10px] ${hiddenColumns.has(col.key) ? 'text-linear-text-muted line-through' : 'text-white'}`}>{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          )}
        </div>

        {/* Filter button + clear — always visible on mobile */}
        <button onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex-shrink-0 ${isFilterOpen || hasActiveFilters ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-white'}`}>
          <Filter size={12} />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && <span className="h-4 w-4 bg-blue-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center">{[statusFilter !== 'all', areaFilter !== 'All Areas', alphaThreshold > 0, maxPrice < 3000000, minSqft > 0].filter(Boolean).length}</span>}
        </button>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold text-linear-text-muted hover:text-white transition-colors flex-shrink-0">
            <X size={10} />Clear
          </button>
        )}
      </div>

      {/* UX-018: Status Pipeline Strip — FE-220: scrollable on mobile */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 -mx-1 px-1">
        <span className="text-[9px] font-black text-linear-text-muted/60 uppercase tracking-widest mr-1">Status:</span>
        {[
          { key: 'discovered' as PropertyStatus, label: 'Discovered', color: 'blue' },
          { key: 'shortlisted' as PropertyStatus, label: 'Shortlisted', color: 'amber' },
          { key: 'vetted' as PropertyStatus, label: 'Vetted', color: 'emerald' },
          // FE-204.3: Label clarifies this is user's archived pipeline, not market withdrawal
          { key: 'archived' as PropertyStatus, label: 'Archived', shortLabel: 'Arch.', color: 'rose' },
        ].map(({ key, label, shortLabel, color }) => (
          <button
            key={key}
            onClick={() => handleStatusFilter(statusFilter === key ? 'all' : key)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border flex-shrink-0 ${
              statusFilter === key
                ? color === 'blue' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  color === 'amber' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-white hover:border-linear-accent/30'
            }`}
          >
            <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
              color === 'blue' ? 'bg-blue-400' :
              color === 'amber' ? 'bg-amber-400' :
              color === 'emerald' ? 'bg-emerald-400' :
              'bg-rose-400'
            }`} />
            <span className="font-black">{pipelineCounts[key]}</span>
            <span className="hidden sm:inline text-[9px] opacity-70">{label}</span>
            <span className="sm:hidden text-[8px] opacity-70">{shortLabel}</span>
          </button>
        ))}
        {/* FE-204.1: Show/hide archived toggle — compact on mobile */}
        <button
          onClick={() => setShowArchived(v => !v)}
          title={showArchived ? 'Hiding archived properties' : `Show ${pipelineCounts.archived} archived properties`}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border flex-shrink-0 ${
            showArchived
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-white hover:border-linear-accent/30'
          }`}
        >
          <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${showArchived ? 'bg-rose-400' : 'bg-linear-text-muted/30'}`} />
          <span className="hidden sm:inline">{showArchived ? 'Hide Arch.' : `Arch. (${pipelineCounts.archived})`}</span>
          <span className="sm:hidden">{showArchived ? 'Hide' : pipelineCounts.archived}</span>
        </button>
        {/* ADR-017: Market status filter — analyst-owned axis, compact on mobile */}
        <div className="flex items-center gap-1 border-l border-linear-border/50 pl-2 md:pl-3 flex-shrink-0">
          <span className="hidden md:inline text-[9px] font-black text-linear-text-muted/50 uppercase tracking-widest mr-1">Market:</span>
          {([
            { key: 'all' as MarketStatus | 'all', label: 'All', shortLabel: 'All' },
            { key: 'active' as MarketStatus, label: 'Active', shortLabel: 'Act.' },
            { key: 'under_offer' as MarketStatus, label: 'Under Offer', shortLabel: 'U/O' },
            { key: 'withdrawn' as MarketStatus, label: 'Withdrawn', shortLabel: 'W/d' },
          ]).map(({ key, label, shortLabel }) => (
            <button
              key={key}
              onClick={() => { setMarketStatusFilter(key); syncAllFiltersToUrl(); }}
              className={`px-1.5 md:px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-bold transition-all border flex-shrink-0 ${
                marketStatusFilter === key
                  ? key === 'active' ? 'bg-retro-green/10 text-retro-green border-retro-green/30' :
                    key === 'under_offer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                    key === 'withdrawn' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                    'bg-linear-bg text-white border-linear-border'
                  : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-white hover:border-linear-accent/30'
              }`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="bg-linear-card border border-linear-border rounded-xl p-4 grid grid-cols-2 md:grid-cols-6 gap-4">
          <div>
            <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">Status</div>
            <div className="flex flex-wrap gap-1">
              {(['all', 'discovered', 'shortlisted', 'vetted', 'archived'] as const).map(s => (
                <button key={s} onClick={() => handleStatusFilter(s)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${statusFilter === s
                    ? s === 'archived' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      s === 'vetted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      s === 'shortlisted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-linear-bg text-white border border-linear-border'
                    : 'bg-linear-bg text-linear-text-muted border border-linear-border hover:text-white'
                  }`}>
                  {s === 'archived' ? 'Archived (User)' : s}
                </button>
              ))}
            </div>
          </div>
          {/* ADR-017: Market status filter — analyst-owned axis */}
          <div>
            <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">Market</div>
            <div className="flex flex-wrap gap-1">
              {([
                { key: 'all' as MarketStatus | 'all', label: 'All' },
                { key: 'active' as MarketStatus, label: 'Active' },
                { key: 'under_offer' as MarketStatus, label: 'Under Offer' },
                { key: 'sold_stc' as MarketStatus, label: 'Sold STC' },
                { key: 'withdrawn' as MarketStatus, label: 'Withdrawn' },
              ]).map(({ key, label }) => (
                <button key={key} onClick={() => { setMarketStatusFilter(key); syncAllFiltersToUrl(); }}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${marketStatusFilter === key
                    ? key === 'active' ? 'bg-retro-green/20 text-retro-green border border-retro-green/30' :
                      key === 'under_offer' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      key === 'sold_stc' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      key === 'withdrawn' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-linear-bg text-white border border-linear-border'
                    : 'bg-linear-bg text-linear-text-muted border border-linear-border hover:text-white'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">Area</div>
            <select value={areaFilter} onChange={e => handleFilterChange(() => setAreaFilter(e.target.value))}
              className="w-full bg-linear-bg border border-linear-border rounded-lg px-2 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-blue-500/50">
              <option value="All Areas">All Areas</option>
              {availableAreas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Alpha Min</span>
              <span className="text-[10px] font-bold text-blue-400">{alphaThreshold}+</span>
            </div>
            <input type="range" min="0" max="10" step="0.5" value={alphaThreshold}
              onChange={e => handleFilterChange(() => setAlphaThreshold(Number(e.target.value)))}
              className="w-full h-1 bg-linear-bg rounded-full appearance-none cursor-pointer accent-blue-500" />
            <div className="flex justify-between text-[8px] text-linear-text-muted mt-0.5"><span>0</span><span>10</span></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Max Price</span>
              <span className="text-[10px] font-bold text-blue-400">£{(maxPrice / 1000000).toFixed(1)}M</span>
            </div>
            <input type="range" min="250000" max="5000000" step="50000" value={maxPrice}
              onChange={e => handleFilterChange(() => setMaxPrice(Number(e.target.value)))}
              className="w-full h-1 bg-linear-bg rounded-full appearance-none cursor-pointer accent-blue-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Min SQFT</span>
              <span className="text-[10px] font-bold text-blue-400">{minSqft.toLocaleString()} ft²</span>
            </div>
            <input type="range" min="0" max="3000" step="50" value={minSqft}
              onChange={e => handleFilterChange(() => setMinSqft(Number(e.target.value)))}
              className="w-full h-1 bg-linear-bg rounded-full appearance-none cursor-pointer accent-blue-500" />
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <PropertyTable
          properties={filteredProperties}
          onSortChange={key => updateFilters({ sortBy: key as string })}
          currentSort={filters.sortBy}
          showThesisTags
          onPreview={p => { setPreviewProperty(p); setIsPreviewOpen(true); }}
          onStatusChange={(id, s) => setStatus(id, s)}
          getStatus={getStatus}
        />
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <Building2 size={40} className="text-linear-text-muted/20 mb-4" />
              <h3 className="text-base font-bold text-white mb-2">No properties match your filters</h3>
              <p className="text-xs text-linear-text-muted mb-4 max-w-sm">
                {properties.length === 0 ? 'Your property database is empty. Add your first property to get started.' : 'Try adjusting your filter criteria or clearing all filters.'}
              </p>
              <button onClick={clearFilters} className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-500/30 transition-all">
                Clear All Filters
              </button>
              {properties.length === 0 && (
                <a href="/inbox" className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                  Go to Inbox to import leads →
                </a>
              )}
            </div>
          )}
          {filteredProperties.map(property => (
            <PropertyCard
              key={property.id}
              property={property}
              status={getStatus(property.id)}
              onStatusChange={(id, s) => setStatus(id, s)}
              tags={getTags(property.id)}
              onPreview={() => { setPreviewProperty(property); setIsPreviewOpen(true); }}
            />
          ))}
        </div>
      )}

      {/* Keyboard nav hint — desktop only (keyboard nav irrelevant on mobile) */}
      {filteredProperties.length > 0 && (
        <div className="hidden md:block text-[9px] text-linear-text-muted/40 font-mono text-center py-2 tracking-widest">
          J/K NAVIGATE · O OPEN · S SHORTLIST · A COMPARE · / SEARCH
        </div>
      )}

      {/* UX-008: Preview Drawer */}
      <PreviewDrawer
        property={previewProperty}
        isOpen={isPreviewOpen}
        onClose={() => { setIsPreviewOpen(false); setPreviewProperty(null); }}
        status={previewProperty ? getStatus(previewProperty.id) : 'discovered'}
        onStatusChange={(id, s) => setStatus(id, s)}
      />

      {/* UX-009: Empty state — no properties at all */}
      {properties.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="h-20 w-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
            <Building2 size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Asset Database Empty</h2>
          <p className="text-sm text-linear-text-muted max-w-sm text-center mb-6">
            No properties in your database yet. Import leads from the Inbox to begin research.
          </p>
          <a href="/inbox" className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-emerald-500/10">
            Open Inbox <ChevronRight size={14} />
          </a>
        </div>
      )}
    </div>
  );
};

// --- Property Card (Grid View) ---
interface PropertyCardProps {
  property: PropertyWithCoords;
  status: PropertyStatus;
  onStatusChange: (id: string, status: PropertyStatus) => void;
  tags: string[];
  onPreview?: (property: PropertyWithCoords) => void;
}

const STATUS_COLORS: Record<PropertyStatus, string> = {
  discovered: 'text-linear-text-muted',
  shortlisted: 'text-blue-400',
  vetted: 'text-emerald-400',
  archived: 'text-rose-400',
};

const PropertyCard: React.FC<PropertyCardProps> = ({ property, status, onStatusChange, tags, onPreview }) => {
  const statusCycles: PropertyStatus[] = ['discovered', 'shortlisted', 'vetted', 'archived'];
  const nextStatus = (s: PropertyStatus) => {
    const idx = statusCycles.indexOf(s);
    return statusCycles[(idx + 1) % statusCycles.length];
  };

  return (
    <div
      className="bg-linear-card border border-linear-border rounded-xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer"
      onClick={() => onPreview?.(property)}
    >
      <div className="relative h-40 bg-linear-bg overflow-hidden">
        <PropertyImage src={property.image_url} alt={property.address} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-2 left-2"><AlphaBadge score={property.alpha_score} className="text-[8px]" /></div>
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange(property.id, nextStatus(status)); }}
            className={`h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-[8px] font-black uppercase transition-all hover:scale-110 ${STATUS_COLORS[status]}`}
            title={`Status: ${status} — click to advance`}
          >
            {status[0].toUpperCase()}
          </button>
        </div>
        {/* FE-204.2: VALUE badge — shown in bottom-left only when no dual badge overlaps */}
        {property.is_value_buy && !(status === 'archived' && property.market_status === 'active') && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-emerald-500/90 rounded text-[8px] font-black text-white uppercase">VALUE</div>
        )}
        {/* ADR-017: market_status badge — covers all market states */}
        {property.market_status && (
          <div className="absolute bottom-2 right-2">
            <MarketStatusBadge status={property.market_status} />
          </div>
        )}
        {/* ADR-017: Dual badge — archived + active means user deprioritised but still listed */}
        {status === 'archived' && property.market_status === 'active' && (
          <div className="absolute bottom-2 left-2 right-16 px-1.5 py-0.5 bg-blue-500/90 backdrop-blur-sm rounded text-[8px] font-black text-white uppercase flex items-center gap-1">
            <span className="opacity-70">⚠</span>Archived — Still Listed
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{property.address}</p>
            <p className="text-[9px] text-linear-text-muted mt-0.5">{property.area}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-black text-white">£{(property.realistic_price / 1000).toFixed(0)}K</p>
            {property.list_price && property.list_price !== property.realistic_price && (
              <p className="text-[9px] text-rose-400 line-through">£{(property.list_price / 1000).toFixed(0)}K</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[9px] text-linear-text-muted">
          <span>{property.sqft?.toLocaleString()} ft²</span>
          <span>·</span>
          <span>£{property.price_per_sqm?.toLocaleString()}/m²</span>
          <span>·</span>
          <span className={STATUS_COLORS[status]}>{status}</span>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map(tag => (
              <ThesisTagBadge key={tag} tag={tag as any} size="sm" />
            ))}
            {tags.length > 3 && <span className="text-[8px] text-linear-text-muted">+{tags.length - 3}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPage;
