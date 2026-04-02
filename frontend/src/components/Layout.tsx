import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Settings,
  Command,
  Plus,
  ChevronDown,
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
  X
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import CommandPalette from './CommandPalette';
import SubmissionHistory from './SubmissionHistory';
import ComparisonBar from './ComparisonBar';
import ShortcutsOverlay from './ShortcutsOverlay';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { properties } = usePropertyContext();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  // QA-187: Mobile sidebar open/close state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // UX-008: Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // ? to show shortcuts overlay
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // FE-175: 5-page nav structure per QA-175
  // Icons from lucide-react: LayoutDashboard, Building2, Map, Inbox, Scale, Calculator
  const navItems = [
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Building2 size={16} />, label: 'Properties', path: '/properties' },
    { icon: <Map size={16} />, label: 'Map', path: '/map' },
    { icon: <Inbox size={16} />, label: 'Inbox', path: '/inbox' },
    { icon: <Scale size={16} />, label: 'Comparison', path: '/comparison' },
    { icon: <Calculator size={16} />, label: 'Affordability', path: '/affordability' },
    { icon: <Archive size={16} />, label: 'Archive Review', path: '/archive' },
  ];

  // UX-013: Market Intelligence sub-section
  const marketNavItems = [
    { icon: <BarChart3 size={14} />, label: 'Rates & Scenarios', path: '/rates' },
    { icon: <TrendingUp size={14} />, label: 'Area Heat Map', path: '/market' },
  ];

  const dynamicAreas = useMemo(() => {
    const uniqueAreas = new Set(properties.map(p => (p.area ?? '').split(' (')[0]));
    return Array.from(uniqueAreas).sort();
  }, [properties]);

  // FE-175: Updated breadcrumbs for 5-page structure
  const breadcrumbs = useMemo(() => {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths.length === 0) return [{ label: 'Dashboard', path: '/dashboard', active: true }];

    return paths.map((path, index) => {
      const isLast = index === paths.length - 1;
      const currentPath = '/' + paths.slice(0, index + 1).join('/');
      let label = path.charAt(0).toUpperCase() + path.slice(1);

      // Special cases for new routes
      if (path === 'dashboard') label = 'Dashboard';
      if (path === 'properties') label = 'Properties';
      if (path === 'map') label = 'Map';
      if (path === 'inbox') label = 'Inbox';
      if (path === 'comparison') label = 'Comparison';
      if (path === 'affordability') label = 'Affordability';
      if (path === 'archive') label = 'Archive Review';
      if (path === 'rates') label = 'Rates & Scenarios';
      if (path === 'market') label = 'Area Heat Map';
      if (path === 'property' && paths[index + 1]) {
        return { label: 'Asset Detail', path: '/dashboard', active: false };
      }
      if (index > 0 && paths[index - 1] === 'property') {
        label = `ID:${path.slice(0, 8)}`;
      }

      return {
        label,
        path: currentPath,
        active: isLast
      };
    });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-linear-bg text-white font-sans antialiased flex selection:bg-blue-500/30">
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <SubmissionHistory isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      <ShortcutsOverlay isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {/* Sidebar */}
      {/* QA-187: Responsive — mobile: hidden+drawer, tablet: w-16 icon-only, desktop: w-64 full */}
      <aside className="w-64 border-r border-linear-border flex flex-col fixed inset-y-0 left-0 z-50 bg-linear-bg/80 backdrop-blur-xl hidden lg:flex">
        <div className="p-4 flex items-center justify-between group">
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

        <div className="px-3 py-2">
          <button 
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-linear-card border border-linear-border text-linear-text-muted hover:text-white transition-all shadow-sm group"
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

        <nav className="flex-grow px-2 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all group ${
                location.pathname === item.path
                  ? 'bg-linear-card text-white shadow-sm ring-1 ring-linear-border'
                  : 'text-linear-text-muted hover:text-white hover:bg-linear-card/50'
              }`}
            >
              <span className={`${location.pathname === item.path ? 'text-blue-400' : 'text-linear-text-muted group-hover:text-blue-400'} transition-colors`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}

          {/* UX-013: Market Intelligence sub-section */}
          <div className="pt-6 pb-1 px-3">
            <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest flex items-center gap-2">
              <div className="h-px flex-1 bg-linear-border" />
              Market Intel
              <div className="h-px flex-1 bg-linear-border" />
            </div>
          </div>
          {marketNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                location.pathname === item.path
                  ? 'bg-purple-500/10 text-white shadow-sm ring-1 ring-purple-500/20'
                  : 'text-linear-text-muted hover:text-white hover:bg-linear-card/50'
              }`}
            >
              <span className={`${location.pathname === item.path ? 'text-purple-400' : 'text-linear-text-muted group-hover:text-purple-400'} transition-colors`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}

          <div className="pt-8 pb-2 px-3 text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">
            Target Areas
          </div>
          <div className="space-y-0.5">
            {dynamicAreas.length > 0 ? dynamicAreas.map(area => (
              <Link
                key={area}
                to={`/properties?area=${encodeURIComponent(area)}`}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left group ${
                  location.search.includes(encodeURIComponent(area))
                    ? 'text-white bg-linear-card/40'
                    : 'text-linear-text-muted hover:text-white hover:bg-linear-card/50'
                }`}
              >
                <div className={`h-1.5 w-1.5 rounded-full border transition-colors ${
                  location.search.includes(encodeURIComponent(area))
                    ? 'border-blue-500 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                    : 'border-linear-border group-hover:border-blue-500'
                }`}></div>
                {area}
              </Link>
            )) : (
              <div className="px-3 py-2 text-[10px] text-linear-accent italic uppercase">Loading nodes...</div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-linear-border bg-linear-bg/50 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-linear-card border border-linear-border flex items-center justify-center text-[10px] font-black text-linear-accent shadow-inner">
                v1.2
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Terminal</span>
                <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-tighter mt-1">Institutional Mode</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`p-1.5 rounded-md transition-all ${isHistoryOpen ? 'bg-blue-500/10 text-blue-400' : 'text-linear-text-muted hover:text-white hover:bg-linear-card'}`}
                title="Submission History"
              >
                <History size={16} />
              </button>
              <button className="p-1.5 text-linear-text-muted hover:text-white hover:bg-linear-card rounded-md transition-all">
                <Settings size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* QA-187: Mobile sidebar drawer — shown when isMobileSidebarOpen on mobile/tablet */}
      {isMobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="w-72 border-r border-linear-border flex flex-col fixed inset-y-0 left-0 z-50 bg-linear-bg/95 backdrop-blur-xl lg:hidden overflow-y-auto">
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
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="h-8 w-8 rounded border border-linear-border flex items-center justify-center text-linear-text-muted hover:text-white hover:bg-linear-card transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <nav className="flex-grow px-2 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                    location.pathname === item.path
                      ? 'bg-linear-card text-white shadow-sm ring-1 ring-linear-border'
                      : 'text-linear-text-muted hover:text-white hover:bg-linear-card/50'
                  }`}
                >
                  <span className={`${location.pathname === item.path ? 'text-blue-400' : 'text-linear-text-muted group-hover:text-blue-400'} transition-colors`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
              {/* Market Intelligence sub-section */}
              <div className="pt-6 pb-1 px-3">
                <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest flex items-center gap-2">
                  <div className="h-px flex-1 bg-linear-border" />
                  Market Intel
                  <div className="h-px flex-1 bg-linear-border" />
                </div>
              </div>
              {marketNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                    location.pathname === item.path
                      ? 'bg-purple-500/10 text-white shadow-sm ring-1 ring-purple-500/20'
                      : 'text-linear-text-muted hover:text-white hover:bg-linear-card/50'
                  }`}
                >
                  <span className={`${location.pathname === item.path ? 'text-purple-400' : 'text-linear-text-muted group-hover:text-purple-400'} transition-colors`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-linear-border bg-linear-bg/50 mt-auto">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-linear-card border border-linear-border flex items-center justify-center text-[10px] font-black text-linear-accent shadow-inner">v1.2</div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Terminal</span>
                  <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-tighter mt-1">Institutional Mode</span>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      {/* QA-187: pl-0 on mobile/tablet, pl-64 on desktop */}
      <main className="flex-grow min-h-screen pl-0 lg:pl-64">
        <header className="h-12 border-b border-linear-border bg-linear-bg/50 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* QA-187: Hamburger — mobile/tablet only */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg border border-linear-border text-linear-text-muted hover:text-white hover:bg-linear-card transition-all"
            >
              <Menu size={18} />
            </button>
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-linear-accent mx-1">/</span>}
                  {crumb.active ? (
                    <span className="text-white">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path || '#'} className="hover:text-white transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsHistoryOpen(!isHistoryOpen)}
               className={`flex items-center gap-2 px-2.5 py-1 rounded border transition-all ${isHistoryOpen ? 'bg-linear-accent text-white border-white/20 shadow-lg' : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-white hover:border-linear-accent'}`}
             >
                <History size={12} className={isHistoryOpen ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">Trace</span>
             </button>
             <div
               onClick={() => setIsCommandPaletteOpen(true)}
               className="flex items-center gap-1 bg-linear-card px-2 py-1 rounded border border-linear-border text-[10px] font-mono text-linear-text-muted select-none group hover:border-linear-accent transition-colors cursor-pointer"
             >
                <Command size={10} className="group-hover:text-white transition-colors" />
                <span className="group-hover:text-white transition-colors">K</span>
             </div>
             <button
               onClick={() => setIsShortcutsOpen(true)}
               title="Keyboard shortcuts (?)"
               className="flex items-center justify-center h-7 w-7 bg-linear-card px-2 py-1 rounded border border-linear-border text-[10px] font-mono text-linear-text-muted select-none group hover:border-linear-accent transition-colors hover:text-white"
             >
               <span>?</span>
             </button>
          </div>
        </header>
        <div className={`p-8 mx-auto ${location.pathname === '/dashboard' ? 'max-w-full' : 'max-w-7xl'}`}>
          {children}
        </div>
        <ComparisonBar />
      </main>
    </div>
  );
};

export default Layout;
