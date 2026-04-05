import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Scale,
  LayoutGrid,
  CheckCircle2,
  Bookmark,
  Star,
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import { usePipeline } from '../hooks/usePipeline';
import { useAffordability } from '../hooks/useAffordability';
import { useComparison } from '../hooks/useComparison';
import KPICard from '../components/KPICard';
import LoadingNode from '../components/LoadingNode';
import MarketPulse from '../components/MarketPulse';
import MarketConditionsBar from '../components/MarketConditionsBar';
import PropertyImage from '../components/PropertyImage';

// UX-016: Command center Dashboard redesign
// SECTION 1 — URGENT ACTIONS (always at top)
// SECTION 2 — PIPELINE FUNNEL (visual)
// SECTION 3 — TOP OPPORTUNITIES (highest-alpha cards)
// SECTION 4 — MARKET CONTEXT (condensed pulse)
// REMOVED: Quick-Add (→ Command Palette), Recent Inbox (→ /inbox), Micro-Market Pills (→ /market)
// KEPT: KPI cards

const Dashboard: React.FC = () => {
  const { properties, loading, error } = usePropertyContext();
  const { getStatus, setStatus } = usePipeline();
  const { getAffordablePrice } = useAffordability();
  const comparison = useComparison();

  // FE-215: Track viewport width to trigger MarketConditionsBar compact mode < 1024px
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Recent inbox leads count
  const [inboxCount, setInboxCount] = useState(0);
  useEffect(() => {
    fetch('/api/inbox')
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        const leads = Array.isArray(d) ? d : d?.leads ?? [];
        setInboxCount(Array.isArray(leads) ? leads.length : 0);
      })
      .catch(() => setInboxCount(0));
  }, []);

  // UX-016: Pipeline stats
  const pipelineStats = useMemo(() => {
    const stats = { discovered: 0, shortlisted: 0, vetted: 0 };
    properties.forEach(p => {
      const s = getStatus(p.id);
      if (s === 'discovered') stats.discovered++;
      else if (s === 'shortlisted') stats.shortlisted++;
      else if (s === 'vetted') stats.vetted++;
    });
    return stats;
  }, [properties, getStatus]);

  // UX-016: Properties needing advancement (discovered > 7 days, alpha > 7)
  const staleProperties = useMemo(() => {
    return properties
      .filter(p => getStatus(p.id) === 'discovered' && (p.dom ?? 0) > 7 && (p.alpha_score ?? 0) > 7)
      .sort((a, b) => (b.alpha_score ?? 0) - (a.alpha_score ?? 0))
      .slice(0, 3);
  }, [properties, getStatus]);

  // UX-016: Affordability warnings — shortlisted properties over budget
  const affordablePrice = getAffordablePrice();
  const budgetWarnings = useMemo(() => {
    return properties
      .filter(p => {
        const s = getStatus(p.id);
        return (s === 'shortlisted' || s === 'vetted') && (p.realistic_price ?? 0) > affordablePrice;
      })
      .slice(0, 3);
  }, [properties, getStatus, affordablePrice]);

  // UX-016: Top opportunities — 5 highest-alpha non-archived
  const topOpportunities = useMemo(() => {
    return properties
      .filter(p => getStatus(p.id) !== 'archived')
      .sort((a, b) => (b.alpha_score ?? 0) - (a.alpha_score ?? 0))
      .slice(0, 5);
  }, [properties, getStatus]);

  // KPI stats
  const stats = useMemo(() => {
    if (!properties.length) return { total: 0, avgAlpha: '0.0', shortlisted: 0, vetted: 0 };
    return {
      total: properties.length,
      shortlisted: pipelineStats.shortlisted,
      vetted: pipelineStats.vetted,
      avgAlpha: (properties.reduce((acc, p) => acc + (p.alpha_score ?? 0), 0) / properties.length).toFixed(1),
    };
  }, [properties, pipelineStats]);

  // Pipeline funnel percentages (for funnel width visualization)
  const funnelTotal = pipelineStats.discovered + pipelineStats.shortlisted + pipelineStats.vetted || 1;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <LoadingNode />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="flex flex-col items-center gap-4 max-w-md">
        <div className="h-12 w-12 bg-linear-accent-rose/10 text-linear-accent-rose rounded-full flex items-center justify-center border border-linear-accent-rose/20">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">Sync Failure</h2>
        <p className="text-xs text-linear-text-muted leading-relaxed">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white text-black rounded-lg font-bold text-xs hover:bg-zinc-200 transition-all shadow-xl"
        >
          Re-establish Connection
        </button>
      </div>
    </div>
  );

  const alphaColor = (score?: number) => {
    if (!score) return 'text-linear-text-muted';
    if (score >= 8) return 'text-emerald-400';
    if (score >= 5) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="space-y-6 pb-20">

      {/* ============================================================
          SECTION 1 — URGENT ACTIONS
          ============================================================ */}
      {(inboxCount > 0 || staleProperties.length > 0 || budgetWarnings.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-linear-border" />
            <span className="text-[9px] font-black text-retro-amber uppercase tracking-[0.2em]">Urgent Actions</span>
            <div className="h-px flex-1 bg-linear-border" />
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Inbox leads badge */}
            {inboxCount > 0 && (
              <Link
                to="/inbox"
                className="flex items-center gap-2 px-3 py-2 bg-retro-amber/10 border border-retro-amber/20 rounded-xl hover:bg-retro-amber/20 transition-colors group"
              >
                <div className="h-5 w-5 rounded-full bg-retro-amber/20 flex items-center justify-center">
                  <span className="text-[9px] font-black text-retro-amber">{inboxCount}</span>
                </div>
                <span className="text-[10px] font-bold text-retro-amber">new leads awaiting triage</span>
                <ChevronRight size={10} className="text-retro-amber/50 group-hover:text-retro-amber transition-colors" />
              </Link>
            )}

            {/* Stale properties needing advancement */}
            {staleProperties.length > 0 && (
              <Link
                to="/properties"
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors group"
              >
                <div className="flex -space-x-1">
                  {staleProperties.slice(0, 3).map(p => (
                    <div key={p.id} className="h-5 w-5 rounded-full bg-linear-card border border-blue-500/30 overflow-hidden">
                      {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-blue-400">
                  {staleProperties.length} property {staleProperties.length === 1 ? 'needs' : 'need'} advancement
                </span>
                <ChevronRight size={10} className="text-blue-400/50 group-hover:text-blue-400 transition-colors" />
              </Link>
            )}

            {/* Budget warnings */}
            {budgetWarnings.length > 0 && (
              <Link
                to="/affordability"
                className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-colors group"
              >
                <AlertTriangle size={12} className="text-rose-400" />
                <span className="text-[10px] font-bold text-rose-400">
                  {budgetWarnings.length} shortlisted {budgetWarnings.length === 1 ? 'property exceeds' : 'properties exceed'} budget
                </span>
                <ChevronRight size={10} className="text-rose-400/50 group-hover:text-rose-400 transition-colors" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 2 — PIPELINE FUNNEL
          ============================================================ */}
      <div className="bg-linear-card border border-linear-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-black text-linear-text-muted/60 uppercase tracking-widest">Pipeline Funnel</span>
          <Link to="/properties" className="text-[9px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest">
            View All →
          </Link>
        </div>

        {/* Horizontal funnel */}
        <div className="flex items-center gap-0 h-10 rounded-lg overflow-hidden">
          {/* Discovered */}
          <div
            className="flex flex-col items-center justify-center bg-blue-500/20 border-r border-linear-border transition-all hover:bg-blue-500/30"
            style={{ width: `${Math.max(10, (pipelineStats.discovered / funnelTotal) * 100)}%` }}
          >
            <Link to="/properties" className="flex flex-col items-center justify-center w-full h-full px-1">
              <span className="text-[11px] font-black text-blue-400">{pipelineStats.discovered}</span>
              <span className="text-[8px] text-blue-400/60 hidden sm:block">discovered</span>
            </Link>
          </div>
          {/* Shortlisted */}
          <div
            className="flex flex-col items-center justify-center bg-amber-500/20 border-r border-linear-border transition-all hover:bg-amber-500/30"
            style={{ width: `${Math.max(10, (pipelineStats.shortlisted / funnelTotal) * 100)}%` }}
          >
            <Link to="/properties?status=shortlisted" className="flex flex-col items-center justify-center w-full h-full px-1">
              <span className="text-[11px] font-black text-amber-400">{pipelineStats.shortlisted}</span>
              <span className="text-[8px] text-amber-400/60 hidden sm:block">shortlisted</span>
            </Link>
          </div>
          {/* Vetted */}
          <div
            className="flex flex-col items-center justify-center bg-emerald-500/20 transition-all hover:bg-emerald-500/30"
            style={{ width: `${Math.max(5, (pipelineStats.vetted / funnelTotal) * 100)}%` }}
          >
            <Link to="/properties?status=vetted" className="flex flex-col items-center justify-center w-full h-full px-1">
              <span className="text-[11px] font-black text-emerald-400">{pipelineStats.vetted}</span>
              <span className="text-[8px] text-emerald-400/60 hidden sm:block">vetted</span>
            </Link>
          </div>
        </div>

        {/* Funnel labels */}
        <div className="flex mt-1.5 text-[8px] text-linear-text-muted">
          <div className="flex-1 text-center" style={{ maxWidth: '33%' }}>
            <div className="h-0.5 bg-blue-500/30 rounded-full mb-1" />
            {((pipelineStats.discovered / funnelTotal) * 100).toFixed(0)}% discovered
          </div>
          <div className="flex-1 text-center" style={{ maxWidth: '33%' }}>
            <div className="h-0.5 bg-amber-500/30 rounded-full mb-1" />
            {((pipelineStats.shortlisted / funnelTotal) * 100).toFixed(0)}% shortlisted
          </div>
          <div className="flex-1 text-center" style={{ maxWidth: '33%' }}>
            <div className="h-0.5 bg-emerald-500/30 rounded-full mb-1" />
            {((pipelineStats.vetted / funnelTotal) * 100).toFixed(0)}% vetted
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 3 — KPI CARDS (retained)
          ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Institutional Inventory"
          value={stats.total}
          icon={LayoutGrid}
          tooltip="Total count of investment-grade properties in the active acquisition pipeline."
          methodology="Aggregated from Master DB after normalization and quality gate filtering."
        />
        <KPICard
          label="Alpha Performance"
          value={stats.avgAlpha}
          icon={TrendingUp}
          className="text-linear-accent-blue"
          tooltip="The proprietary 0-10 composite rating representing the overall acquisition quality of all filtered assets."
          methodology="Weighted average of Tenure Quality (40%), Spatial Alpha (30%), and Price Efficiency (30%)."
        />
        <KPICard
          label="Active Pipeline"
          value={stats.shortlisted}
          icon={Scale}
          className="text-retro-green"
          tooltip="Current volume of assets successfully moved from 'Discovered' to 'Shortlisted' or 'Vetted' status."
          methodology="User-defined filter status for assets marked for secondary vetting or final approval."
        />
        <KPICard
          label="Vetted Assets"
          value={stats.vetted}
          icon={ShieldCheck}
          className="text-linear-accent-emerald"
          tooltip="Assets that have passed rigorous structural, financial, and spatial vetting."
          methodology="Third-stage lifecycle status for assets ready for final acquisition protocols."
        />
      </div>

      {/* ============================================================
          SECTION 4 — TOP OPPORTUNITIES
          ============================================================ */}
      {topOpportunities.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-linear-border" />
              <span className="text-[9px] font-black text-linear-text-muted/60 uppercase tracking-[0.2em]">Top Opportunities</span>
              <div className="h-px flex-1 bg-linear-border" />
            </div>
            <Link to="/properties" className="text-[9px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest">
              View All Properties →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {topOpportunities.map(prop => {
              const status = getStatus(prop.id);
              return (
                <div key={prop.id} className="bg-linear-card border border-linear-border rounded-xl overflow-hidden hover:border-blue-500/30 transition-all group">
                  {/* Hero image */}
                  <div className="relative h-24 bg-linear-bg overflow-hidden">
                    <PropertyImage
                      src={prop.image_url}
                      alt={prop.address}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Alpha badge overlay */}
                    <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black border ${alphaColor(prop.alpha_score).replace('text-', 'bg-').replace('400', '-500/20')} ${alphaColor(prop.alpha_score).replace('text-', 'text-')} border-current/20 backdrop-blur-sm`}>
                      {prop.alpha_score?.toFixed(1) ?? '—'}
                    </div>
                    {/* #1 badge */}
                    {topOpportunities.indexOf(prop) === 0 && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[8px] font-black text-blue-400 flex items-center gap-0.5">
                        <Star size={7} className="fill-current" /> TOP
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-2.5">
                    <p className="text-[10px] font-bold text-white truncate">{prop.address}</p>
                    <p className="text-[8px] text-linear-text-muted truncate mt-0.5">{(prop.area || '').split(' (')[0]}</p>
                    <p className="text-[11px] font-black text-blue-400 mt-1">£{((prop.realistic_price ?? 0) / 1000).toFixed(0)}K</p>
                    <p className="text-[8px] text-linear-text-muted">
                      {prop.sqft ? `${prop.sqft.toLocaleString()} sqft · ` : ''}{prop.dom ?? 0}d on market
                    </p>

                    {/* Inline actions */}
                    <div className="flex gap-1 mt-2">
                      {status !== 'shortlisted' && (
                        <button
                          onClick={() => setStatus(prop.id, 'shortlisted')}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[8px] font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
                        >
                          <Bookmark size={8} />
                          Shortlist
                        </button>
                      )}
                      {status === 'shortlisted' && (
                        <button
                          onClick={() => setStatus(prop.id, 'vetted')}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[8px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <CheckCircle2 size={8} />
                          Vet
                        </button>
                      )}
                      {status === 'vetted' && (
                        <div className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[8px] font-bold text-emerald-400">
                          <ShieldCheck size={8} />
                          Vetted
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 5 — MARKET CONTEXT
          ============================================================ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-linear-border" />
          <span className="text-[9px] font-black text-linear-text-muted/60 uppercase tracking-[0.2em]">Market Context</span>
          <div className="h-px flex-1 bg-linear-border" />
        </div>
        <div className="space-y-3">
          <MarketPulse />
          {/* FE-215: compact mode < 1024px to prevent horizontal overflow on tablet/mobile */}
          <MarketConditionsBar compact={viewportWidth < 1024} />
        </div>
      </div>

      {/* ============================================================
          COMPARISON BASKET (remainder — kept)
          ============================================================ */}
      {comparison.count > 0 && (
        <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale size={11} className="text-linear-accent-blue" />
              <h3 className="text-[9px] font-bold text-white uppercase tracking-widest">Comparison Basket</h3>
              <span className="text-[8px] text-linear-text-muted">({comparison.count} selected)</span>
            </div>
            <Link to="/comparison" className="text-[8px] font-bold text-linear-accent-blue hover:text-blue-300 uppercase tracking-widest transition-colors">
              Full Matrix →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto p-3 custom-scrollbar">
            {comparison.selectedIds.slice(0, 5).map(id => {
              const prop = properties.find(p => p.id === id);
              if (!prop) return null;
              return (
                <div key={id} className="flex-shrink-0 w-40 bg-linear-bg rounded-lg border border-linear-border p-2 flex flex-col gap-2 hover:border-blue-500/30 transition-colors">
                  <div className="relative h-14 bg-linear-card rounded overflow-hidden">
                    <PropertyImage src={prop.image_url} alt={prop.address} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-white truncate">{prop.address}</p>
                    <p className="text-[8px] text-linear-text-muted truncate">{(prop.area || '').split(' (')[0]}</p>
                    <p className="text-[9px] font-bold text-blue-400 mt-0.5">£{((prop.realistic_price ?? 0) / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
