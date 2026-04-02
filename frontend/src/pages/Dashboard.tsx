import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Plus,
  ExternalLink,
  Inbox,
  Scale,
  Loader2,
  AlertCircle,
  LayoutGrid,
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import { usePipeline } from '../hooks/usePipeline';
import KPICard from '../components/KPICard';
import LoadingNode from '../components/LoadingNode';
import MarketPulse from '../components/MarketPulse';
import MarketConditionsBar from '../components/MarketConditionsBar';
import MicroMarketVelocityPills from '../components/MicroMarketVelocityPills';
import PropertyImage from '../components/PropertyImage';
import { useComparison } from '../hooks/useComparison';

// UX-DASH redesign: compact strategic overview
// - KPI header + Market Pulse + Conditions = immediate signal
// - Portfolio snapshot = pipeline status
// - Quick-Add = tool widget
// - Micro-Market Heat = compact pills (full map on /rates)

const Dashboard: React.FC = () => {
  const { properties, loading, error } = usePropertyContext();
  const { pipeline } = usePipeline();
  const comparison = useComparison();

  // Quick-Add Property
  const [quickAddUrl, setQuickAddUrl] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddMsg, setQuickAddMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleQuickAdd = async () => {
    if (!quickAddUrl.trim()) return;
    setQuickAddLoading(true);
    setQuickAddMsg(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: quickAddUrl.trim(), source: 'quick-add' })
      });
      if (res.ok) {
        setQuickAddMsg({ text: 'Property added to inbox', type: 'success' });
        setQuickAddUrl('');
      } else {
        const err = await res.json().catch(() => ({}));
        setQuickAddMsg({ text: err.error || 'Failed to add property', type: 'error' });
      }
    } catch {
      const saved = JSON.parse(localStorage.getItem('propsearch_quickadd') || '[]');
      saved.unshift({ url: quickAddUrl.trim(), date: new Date().toISOString() });
      localStorage.setItem('propsearch_quickadd', JSON.stringify(saved.slice(0, 20)));
      setQuickAddMsg({ text: 'Property queued for processing', type: 'success' });
      setQuickAddUrl('');
    } finally {
      setQuickAddLoading(false);
    }
  };

  // Portfolio stats
  const stats = React.useMemo(() => {
    const safeProperties = properties ?? [];
    if (safeProperties.length === 0) return { total: 0, avgAlpha: '0.0', shortlisted: 0, vetted: 0 };
    return {
      total: safeProperties.length,
      shortlisted: Object.values(pipeline ?? {}).filter((s: any) => s === 'shortlisted' || s === 'vetted').length,
      vetted: Object.values(pipeline ?? {}).filter((s: any) => s === 'vetted').length,
      avgAlpha: (safeProperties.reduce((acc: number, p: any) => acc + p.alpha_score, 0) / (safeProperties.length || 1)).toFixed(1)
    };
  }, [properties, pipeline]);

  // Recent Inbox Activity
  const [inboxList, setInboxList] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        setInboxLoading(true);
        const res = await fetch('/api/inbox');
        if (!res.ok) throw new Error('Inbox unavailable');
        const data = await res.json();
        const leads = Array.isArray(data) ? data : [];
        const normalized = leads.flatMap((entry: any) => {
          if (!entry || typeof entry !== 'object') return [];
          const filename = entry.filename || 'unknown';
          if (Array.isArray(entry.leads)) return entry.leads.slice(0, 3).map((lead: any) => ({ ...lead, filename }));
          if (Array.isArray(entry)) return entry.slice(0, 3).map((item: any) => ({ ...item, filename }));
          return [{ ...entry, filename }];
        });
        setInboxList(normalized.slice(0, 5));
      } catch {
        setInboxError('No recent leads');
      } finally {
        setInboxLoading(false);
      }
    };
    fetchInbox();
  }, []);

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
          className="px-4 py-2 bg-white text-black rounded-lg font-bold text-xs hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
        >
          Re-establish Connection
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">

      {/* 1. KPI Header */}
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

      {/* 2. Market Pulse + Market Conditions — single row */}
      <div className="space-y-3">
        <MarketPulse />
        <MarketConditionsBar />
      </div>

      {/* 3. Portfolio Snapshot — Comparison Basket + Recent Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Comparison Basket */}
        <div className="lg:col-span-3 bg-linear-card border border-linear-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale size={11} className="text-linear-accent-blue" />
              <h3 className="text-[9px] font-bold text-white uppercase tracking-widest">Comparison Basket</h3>
              <span className="text-[8px] text-linear-text-muted">({comparison.count} selected)</span>
            </div>
            <div className="flex items-center gap-3">
              {comparison.count > 0 && (
                <Link to="/properties" className="text-[8px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors">
                  Browse →
                </Link>
              )}
              <Link to="/comparison" className="text-[8px] font-bold text-linear-accent-blue hover:text-blue-300 uppercase tracking-widest transition-colors">
                Full Matrix →
              </Link>
            </div>
          </div>
          <div className="p-3">
            {comparison.count === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Scale size={18} className="text-linear-text-muted/30 mb-2" />
                <p className="text-[9px] text-linear-text-muted">No properties in basket</p>
                <Link to="/properties" className="mt-1.5 text-[9px] text-blue-400 hover:text-blue-300 font-bold">
                  Browse properties →
                </Link>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {comparison.selectedIds.slice(0, 5).map(id => {
                  const prop = properties.find((p: any) => p.id === id);
                  if (!prop) return null;
                  return (
                    <div key={id} className="flex-shrink-0 w-40 bg-linear-bg rounded-lg border border-linear-border p-2 flex flex-col gap-2 hover:border-blue-500/30 transition-colors">
                      <div className="relative h-14 bg-linear-card rounded overflow-hidden">
                        <PropertyImage src={prop.image_url} alt={prop.address} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-white truncate">{prop.address}</p>
                        <p className="text-[8px] text-linear-text-muted truncate">{(prop.area || '').split(' (')[0]}</p>
                        <p className="text-[9px] font-bold text-blue-400 mt-0.5">£{(prop.realistic_price / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Inbox */}
        <div className="lg:col-span-2 bg-linear-card border border-linear-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox size={11} className="text-retro-amber" />
              <h3 className="text-[9px] font-bold text-white uppercase tracking-widest">Recent Leads</h3>
              {inboxLoading && <Loader2 size={9} className="animate-spin text-linear-text-muted" />}
            </div>
            <Link to="/inbox" className="text-[8px] font-bold text-retro-amber hover:text-retro-amber/80 uppercase tracking-widest transition-colors">
              Full Inbox →
            </Link>
          </div>
          <div className="p-2.5 space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
            {inboxError ? (
              <div className="flex items-center gap-2 py-3 text-center text-[9px] text-linear-text-muted">
                <AlertCircle size={9} /> {inboxError}
              </div>
            ) : inboxList.length === 0 && !inboxLoading ? (
              <div className="flex flex-col items-center justify-center py-5 text-center">
                <Inbox size={14} className="text-linear-text-muted/30 mb-1" />
                <p className="text-[9px] text-linear-text-muted">No recent leads</p>
              </div>
            ) : (
              inboxList.map((lead, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-linear-bg/50 transition-colors">
                  <div className="flex-shrink-0 h-7 w-7 bg-linear-bg rounded overflow-hidden">
                    {lead.image_url ? (
                      <img src={lead.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[7px] text-linear-text-muted">—</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-white truncate">{lead.address}</p>
                    <p className="text-[8px] text-linear-text-muted">
                      {lead.price ? `£${(lead.price / 1000).toFixed(0)}K · ` : ''}{(lead.area || '').split(' (')[0]}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Quick-Add + Micro-Market Heat — compact two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Quick-Add Property */}
        <div className="lg:col-span-2 bg-linear-card border border-linear-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-linear-border bg-linear-card/50 flex items-center gap-2">
            <Plus size={10} className="text-linear-accent-emerald" />
            <h3 className="text-[9px] font-bold text-white uppercase tracking-widest">Quick-Add</h3>
            <span className="text-[8px] text-linear-text-muted">Rightmove / Zoopla URL</span>
          </div>
          <div className="p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ExternalLink size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-linear-text-muted" />
                <input
                  type="url"
                  value={quickAddUrl}
                  onChange={e => setQuickAddUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                  placeholder="https://www.rightmove.co.uk/..."
                  className="w-full pl-8 pr-3 py-2 bg-linear-bg border border-linear-border rounded-lg text-[10px] text-white placeholder-linear-text-muted focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                />
              </div>
              <button
                onClick={handleQuickAdd}
                disabled={quickAddLoading}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-[9px] font-bold text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 transition-all flex items-center gap-1 shrink-0"
              >
                {quickAddLoading ? <Loader2 size={9} className="animate-spin" /> : <Plus size={9} />}
                {quickAddLoading ? '...' : 'Add'}
              </button>
            </div>
            {quickAddMsg && (
              <div className={`mt-2 text-[9px] font-bold px-2.5 py-1.5 rounded-lg ${quickAddMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {quickAddMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* Micro-Market Heat — compact pills */}
        <div className="lg:col-span-3">
          <MicroMarketVelocityPills />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
