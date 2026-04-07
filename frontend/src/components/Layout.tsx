import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Settings,
  Command,
  Plus,
  ChevronDown,
  ChevronRight,
  Inbox,
  History,
  Calculator,
  Building2,
  Map,
  Scale,
  Archive,
  BarChart3,
  TrendingUp,
  Menu,
  X,
  Activity,
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import { usePipeline } from '../hooks/usePipeline';
import CommandPalette from './CommandPalette';
import SubmissionHistory from './SubmissionHistory';
import ComparisonBar from './ComparisonBar';
import ShortcutsOverlay from './ShortcutsOverlay';

// UX-015: Shared nav item renderer
interface NavItemDef {
  icon: React.ReactNode;
  label: string;
  path: string;
}

// FE-218: NavItem with 44px minimum touch target (WCAG 2.5.5)
const NavItem: React.FC<{ item: NavItemDef; isActive: boolean; onClick?: () => void }> = ({
  item, isActive, onClick
}) => (
  <Link
    to={item.path}
    onClick={onClick}
    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group min-h-[44px] ${
      isActive
        ? 'bg-linear-card text-white shadow-sm ring-1 ring-linear-border'
        : 'text-linear-text-muted hover:text-white hover:bg-linear-card/50'
    }`}
  >
    <span className={`${isActive ? 'text-blue-400' : 'text-linear-text-muted group-hover:text-blue-400'} transition-colors shrink-0`}>
      {item.icon}
    </span>
    <span className="truncate">{item.label}</span>
  </Link>
);

const ZoneHeader: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-[9px] font-black text-linear-text-muted/60 uppercase tracking-[0.2em] px-3 pt-4 pb-1">
    {label}
  </div>
);

// FE-196: Demo mode indicator
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

const DemoBadge: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  if (!IS_DEMO) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(v => !v)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[8px] font-black uppercase tracking-widest hover:bg-amber-500/30 transition-colors cursor-help"
        title="Demo Mode"
      >
        DEMO
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 shadow-xl z-[100]">
          <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Demo Mode Active</div>
          <div className="text-[8px] text-linear-text-muted leading-relaxed">
            Running with mock data. No live API connection.
          </div>
          <div className="absolute top-full left-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black/90" />
        </div>
      )}
    </div>
  );
};

// UX-023: Searchable Target Areas dropdown
const TargetAreasDropdown: React.FC<{
  areas: string[];
  currentArea: string;
  onSelect: (area: string) => void;
}> = ({ areas, currentArea, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo((): string[] => {
    if (!query.trim()) return areas.slice(0, 8);
    const q = query.toLowerCase();
    return areas.filter(a => a.toLowerCase().includes(q));
  }, [areas, query]);

  return (
    <div ref={ref} className="relative px-2 pt-2">
      <div className="px-3 pb-1.5">
        <div className="text-[9px] font-black text-linear-text-muted/60 uppercase tracking-[0.2em]">Target Areas</div>
      </div>
      {/* Trigger — FE-218: 44px touch target */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-linear-text-muted hover:text-white hover:bg-linear-card/50 transition-all min-h-[44px]"
      >
        <span className="truncate">{currentArea ? `Area: ${currentArea}` : 'All Areas'}</span>
        <ChevronDown size={10} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-linear-card border border-linear-border rounded-xl shadow-2xl z-[60] overflow-hidden">
          <div className="p-2 border-b border-linear-border">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search areas..."
              className="w-full px-2 py-1 text-xs bg-linear-bg border border-linear-border rounded text-white placeholder:text-linear-text-muted focus:outline-none focus:border-linear-accent"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-linear-text-muted italic">No areas found</div>
            )}
            {filtered.map(area => (
              <button
                key={area}
                onClick={() => { onSelect(area); setIsOpen(false); setQuery(''); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-linear-bg/50 text-white transition-colors"
              >
                <div className="h-1.5 w-1.5 rounded-full border border-linear-border shrink-0" />
                <span className="truncate">{area}</span>
              </button>
            ))}
          </div>
          {query && filtered.length < areas.length && (
            <div className="px-3 py-1.5 border-t border-linear-border">
              <button
                onClick={() => { onSelect(''); setIsOpen(false); setQuery(''); }}
                className="text-[10px] text-blue-400 hover:text-blue-300"
              >
                Show all {areas.length} areas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { properties } = usePropertyContext();
  const { getStatus } = usePipeline();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMarketIntelOpen, setIsMarketIntelOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');

  // UX-008: Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // UX-015: 3-zone nav structure
  const zone1: NavItemDef[] = [
    { icon: <Inbox size={16} />, label: 'Inbox', path: '/inbox' },
    { icon: <Building2 size={16} />, label: 'Properties', path: '/properties' },
    { icon: <Map size={16} />, label: 'Map', path: '/map' },
  ];
  const zone2: NavItemDef[] = [
    { icon: <Scale size={16} />, label: 'Comparison', path: '/comparison' },
    { icon: <Calculator size={16} />, label: 'Affordability', path: '/affordability' },
  ];
  const zone3: NavItemDef[] = [
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Archive size={16} />, label: 'Archive', path: '/archive' },
  ];
  const marketNavItems: NavItemDef[] = [
    { icon: <BarChart3 size={14} />, label: 'Rates & Scenarios', path: '/rates' },
    { icon: <TrendingUp size={14} />, label: 'Area Heat Map', path: '/market' },
  ];

  const dynamicAreas = useMemo(() => {
    const uniqueAreas = new Set(
      properties.map(p => ((p.area ?? '').split(' (')[0] ?? '').trim())
    );
    return Array.from(uniqueAreas).sort();
  }, [properties]);

  // UX-015: Pipeline funnel counts for header progress bar
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

  const breadcrumbs = useMemo(() => {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths.length === 0) return [{ label: 'Dashboard', path: '/dashboard', active: true }];
    return paths.map((path, index) => {
      const isLast = index === paths.length - 1;
      const currentPath = '/' + paths.slice(0, index + 1).join('/');
      let label = path.charAt(0).toUpperCase() + path.slice(1);
      if (path === 'dashboard') label = 'Dashboard';
      if (path === 'properties') label = 'Properties';
      if (path === 'map') label = 'Map';
      if (path === 'inbox') label = 'Inbox';
      if (path === 'comparison') label = 'Comparison';
      if (path === 'affordability') label = 'Affordability';
      if (path === 'archive') label = 'Archive';
      if (path === 'rates') label = 'Rates & Scenarios';
      if (path === 'market') label = 'Area Heat Map';
      if (path === 'property' && paths[index + 1]) {
        return { label: 'Asset Detail', path: '/dashboard', active: false };
      }
      if (index > 0 && paths[index - 1] === 'property') {
        label = `ID:${path.slice(0, 8)}`;
      }
      return { label, path: currentPath, active: isLast };
    });
  }, [location.pathname]);

  const isMarketIntelRoute = location.pathname === '/rates' || location.pathname === '/market';

  // Shared sidebar nav content (used by both desktop sidebar and mobile drawer)
  const sidebarNav = (close?: () => void) => (
    <>
      {/* Search bar — FE-218: 44px touch target */}
      {!close && (
        <div className="px-3 py-2">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-linear-card border border-linear-border text-linear-text-muted hover:text-white transition-all shadow-sm group min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <Search size={14} />
              <span className="text-xs">Search terminal</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] bg-linear-bg px-1 rounded border border-linear-border group-hover:border-linear-accent transition-colors">⌘</span>
              <span className="text-[10px] bg-linear-bg px-1 rounded border border-linear-border group-hover:border-linear-accent transition-colors">K</span>
            </div>
          </button>
        </div>
      )}

      <nav className="flex-grow px-2 py-3 space-y-0 overflow-y-auto custom-scrollbar">

        {/* Zone 1 — Acquisition Workflow */}
        <ZoneHeader label="Acquisition" />
        {zone1.map(item => (
          <NavItem key={item.path} item={item} isActive={location.pathname === item.path} onClick={close} />
        ))}

        {/* Zone 2 — Decision Support */}
        <ZoneHeader label="Decision Support" />
        {zone2.map(item => (
          <NavItem key={item.path} item={item} isActive={location.pathname === item.path} onClick={close} />
        ))}

        {/* Market Intel accordion */}
        <button
          onClick={() => setIsMarketIntelOpen(v => !v)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all group ${
            isMarketIntelRoute
              ? 'bg-purple-500/10 text-white'
              : 'text-linear-text-muted hover:text-white hover:bg-linear-card/50'
          }`}
        >
          <span className={`${isMarketIntelRoute ? 'text-purple-400' : 'text-linear-text-muted group-hover:text-purple-400'}`}>
            <Activity size={14} />
          </span>
          <span className="flex-grow text-left">Market Intel</span>
          <ChevronRight size={10} className={`transition-transform ${isMarketIntelOpen ? 'rotate-90' : ''}`} />
        </button>
        {isMarketIntelOpen && (
          <div className="ml-3 space-y-0.5">
            {marketNavItems.map(item => (
              <NavItem key={item.path} item={item} isActive={location.pathname === item.path} onClick={close} />
            ))}
          </div>
        )}

        {/* Zone 3 — System */}
        <ZoneHeader label="System" />
        {zone3.map(item => (
          <NavItem key={item.path} item={item} isActive={location.pathname === item.path} onClick={close} />
        ))}

        {/* Target Areas — UX-023 searchable dropdown */}
        <TargetAreasDropdown
          areas={dynamicAreas}
          currentArea={selectedArea}
          onSelect={area => {
            setSelectedArea(area);
            if (area) window.location.href = `/properties?area=${encodeURIComponent(area)}`;
            else window.location.href = '/properties';
          }}
        />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-linear-border bg-linear-bg/50 mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="h-7 w-7 rounded-lg bg-linear-card border border-linear-border flex items-center justify-center text-[10px] font-black text-linear-accent shadow-inner">v1.2</div>
              <DemoBadge />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Terminal</span>
              <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-tighter mt-1">Institutional Mode</span>
            </div>
          </div>
          {/* FE-218: Footer buttons with 44px touch targets */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsHistoryOpen(v => !v)}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md transition-all ${isHistoryOpen ? 'bg-blue-500/10 text-blue-400' : 'text-linear-text-muted hover:text-white hover:bg-linear-card'}`}
              title="Submission History"
            >
              <History size={16} />
            </button>
            <button className="min-h-[44px] min-w-[44px] flex items-center justify-center text-linear-text-muted hover:text-white hover:bg-linear-card rounded-md transition-all">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-linear-bg text-white font-sans antialiased flex selection:bg-blue-500/30">
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <SubmissionHistory isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      <ShortcutsOverlay isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-linear-border flex flex-col fixed inset-y-0 left-0 z-50 bg-linear-bg/80 backdrop-blur-xl hidden lg:flex">
        {/* Logo */}
        <div className="p-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-linear-card transition-colors">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-black italic shadow-lg shadow-blue-500/20">
              IS
            </div>
            <span className="text-sm font-semibold tracking-tight">propSearch</span>
            <ChevronDown size={14} className="text-linear-text-muted" />
          </Link>
          <button className="h-6 w-6 rounded border border-linear-border flex items-center justify-center text-linear-text-muted hover:text-white hover:bg-linear-card transition-all">
            <Plus size={14} />
          </button>
        </div>
        {sidebarNav()}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isMobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="w-72 border-r border-linear-border flex flex-col fixed inset-y-0 left-0 z-50 bg-linear-bg/95 backdrop-blur-xl lg:hidden overflow-y-auto">
            {/* Mobile header with close button */}
            <div className="p-4 flex items-center justify-between border-b border-linear-border">
              <Link
                to="/dashboard"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-linear-card transition-colors"
              >
                <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-black italic shadow-lg shadow-blue-500/20">
                  IS
                </div>
                <span className="text-sm font-semibold tracking-tight text-white">propSearch</span>
              </Link>
              {/* FE-218: Mobile close button with 44px touch target */}
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded border border-linear-border text-linear-text-muted hover:text-white hover:bg-linear-card transition-all"
              >
                <X size={16} />
              </button>
            </div>
            {sidebarNav(() => setIsMobileSidebarOpen(false))}
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-grow min-h-screen pl-0 lg:pl-64">
        <header className="border-b border-linear-border bg-linear-bg/50 backdrop-blur-md sticky top-0 z-40">
          {/* Top row: hamburger + breadcrumbs + controls */}
          <div className="h-12 px-4 lg:px-6 flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-linear-border text-linear-text-muted hover:text-white hover:bg-linear-card transition-all"
            >
              <Menu size={18} />
            </button>
            {/* FE-218: Breadcrumb truncation on mobile */}
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-linear-text-muted uppercase tracking-widest overflow-hidden min-w-0 flex-1 truncate">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-linear-accent mx-0.5 shrink-0">/</span>}
                  {crumb.active ? (
                    <span className="text-white shrink-0 truncate max-w-[120px] sm:max-w-none">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path || '#'} className="hover:text-white transition-colors shrink-0 truncate max-w-[100px] sm:max-w-none">
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </div>
            {/* FE-218: Header controls with 44px touch targets */}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsHistoryOpen(v => !v)}
                className={`flex items-center gap-1.5 px-2 min-h-[44px] rounded border transition-all text-[10px] ${isHistoryOpen ? 'bg-linear-accent text-white border-white/20' : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-white hover:border-linear-accent'}`}
              >
                <History size={10} className={isHistoryOpen ? 'animate-pulse' : ''} />
                <span className="font-black uppercase tracking-widest hidden sm:inline">Trace</span>
              </button>
              <div
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-1 bg-linear-card px-2 min-h-[44px] rounded border border-linear-border text-[10px] font-mono text-linear-text-muted select-none group hover:border-linear-accent transition-colors cursor-pointer"
              >
                <Command size={10} className="group-hover:text-white transition-colors" />
                <span className="group-hover:text-white transition-colors">K</span>
              </div>
              <button
                onClick={() => setIsShortcutsOpen(true)}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] bg-linear-card rounded border border-linear-border text-[10px] font-mono text-linear-text-muted hover:border-linear-accent transition-colors hover:text-white"
              >
                <span>?</span>
              </button>
            </div>
          </div>

          {/* UX-015: Pipeline progress bar — FE-217: Mobile-responsive with flex-wrap */}
          <div className="px-4 lg:px-6 py-1.5 flex flex-wrap items-center gap-2 border-t border-white/5 lg:overflow-x-auto">
            <div className="flex items-center gap-1 text-[9px] font-black text-linear-text-muted/60 uppercase tracking-widest shrink-0">
              Pipeline
            </div>
            {/* FE-217: Flex-wrap on mobile, horizontal scroll on lg */}
            <div className="flex items-center gap-1 flex-wrap min-w-0 lg:flex-nowrap lg:overflow-x-auto lg:flex-row">
              <Link
                to="/properties"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-linear-card border border-linear-border text-[10px] text-white hover:border-blue-500 transition-colors shrink-0"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                <span className="font-mono font-bold">{pipelineStats.discovered}</span>
                <span className="text-linear-text-muted hidden xs:inline">discovered</span>
              </Link>
              <ChevronRight size={9} className="text-linear-text-muted/40 shrink-0 hidden xs:block" />
              <Link
                to="/properties?status=shortlisted"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-linear-card border border-linear-border text-[10px] text-white hover:border-amber-500 transition-colors shrink-0"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="font-mono font-bold">{pipelineStats.shortlisted}</span>
                <span className="text-linear-text-muted hidden xs:inline">shortlisted</span>
              </Link>
              <ChevronRight size={9} className="text-linear-text-muted/40 shrink-0 hidden xs:block" />
              <Link
                to="/properties?status=vetted"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-linear-card border border-linear-border text-[10px] text-white hover:border-emerald-500 transition-colors shrink-0"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-mono font-bold">{pipelineStats.vetted}</span>
                <span className="text-linear-text-muted hidden xs:inline">vetted</span>
              </Link>
            </div>
            <Link
              to="/properties"
              className="ml-auto text-[9px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest shrink-0 hidden md:block"
            >
              View Funnel →
            </Link>
          </div>
        </header>

        {/* FE-218: Responsive padding — p-4 on mobile, p-6 on sm, p-8 on lg */}
        <div className={`p-4 sm:p-6 lg:p-8 mx-auto ${location.pathname === '/dashboard' ? 'max-w-full' : 'max-w-7xl'}`}>
          {children}
        </div>
        <ComparisonBar />
      </main>
    </div>
  );
};

export default Layout;
