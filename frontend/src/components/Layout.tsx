import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Settings, 
  Bell, 
  Command,
  Plus,
  Compass,
  Zap,
  ChevronDown,
  Percent,
  Inbox,
  History
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import SearchModal from './SearchModal';
import SubmissionHistory from './SubmissionHistory';
import ComparisonBar from './ComparisonBar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { properties } = usePropertyContext();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { icon: <Compass size={16} />, label: 'Discover', path: '/' },
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Inbox size={16} />, label: 'Lead Inbox', path: '/inbox' },
    { icon: <Zap size={16} />, label: 'Comparative Intel', path: '/compare' },
    { icon: <Percent size={16} />, label: 'Mortgage Tracker', path: '/mortgage' },
  ];

  const dynamicAreas = useMemo(() => {
    const uniqueAreas = new Set(properties.map(p => p.area.split(' (')[0]));
    return Array.from(uniqueAreas).sort();
  }, [properties]);

  const breadcrumbs = useMemo(() => {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths.length === 0) return [{ label: 'Discover', path: '/', active: true }];

    return paths.map((path, index) => {
      const isLast = index === paths.length - 1;
      const currentPath = '/' + paths.slice(0, index + 1).join('/');
      let label = path.charAt(0).toUpperCase() + path.slice(1);
      
      // Special cases
      if (path === 'dashboard') label = 'Terminal';
      if (path === 'inbox') label = 'Lead Inbox';
      if (path === 'compare') label = 'Comparative Intel';
      if (path === 'mortgage') label = 'Mortgage Intelligence';
      if (path === 'property' && paths[index + 1]) {
        return { label: 'Asset Scan', path: '/dashboard', active: false };
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
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <SubmissionHistory isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

      {/* Sidebar */}
      <aside className="w-64 border-r border-linear-border flex flex-col fixed inset-y-0 left-0 z-50 bg-linear-bg/80 backdrop-blur-xl">
        <div className="p-4 flex items-center justify-between group">
          <Link to="/" className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-linear-card transition-colors">
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
            onClick={() => setIsSearchOpen(true)}
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
                location.pathname === item.path || (item.path === '/dashboard' && location.pathname.startsWith('/property'))
                  ? 'bg-linear-card text-white shadow-sm ring-1 ring-linear-border' 
                  : 'text-linear-text-muted hover:text-white hover:bg-linear-card/50'
              }`}
            >
              <span className={`${(location.pathname === item.path || (item.path === '/dashboard' && location.pathname.startsWith('/property'))) ? 'text-blue-400' : 'text-linear-text-muted group-hover:text-blue-400'} transition-colors`}>
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
                to={`/dashboard?area=${encodeURIComponent(area)}`}
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

      {/* Main Content */}
      <main className="flex-grow pl-64 min-h-screen">
        <header className="h-12 border-b border-linear-border bg-linear-bg/50 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
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
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsHistoryOpen(!isHistoryOpen)}
               className={`flex items-center gap-2 px-2.5 py-1 rounded border transition-all ${isHistoryOpen ? 'bg-linear-accent text-white border-white/20 shadow-lg' : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-white hover:border-linear-accent'}`}
             >
                <History size={12} className={isHistoryOpen ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">Trace</span>
             </button>
             <div 
               onClick={() => setIsSearchOpen(true)}
               className="flex items-center gap-1 bg-linear-card px-2 py-1 rounded border border-linear-border text-[10px] font-mono text-linear-text-muted select-none group hover:border-linear-accent transition-colors cursor-pointer"
             >
                <Command size={10} className="group-hover:text-white transition-colors" />
                <span className="group-hover:text-white transition-colors">K</span>
             </div>
          </div>
        </header>
        <div className={`p-8 mx-auto ${location.pathname === '/dashboard' ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
          {children}
        </div>
        <ComparisonBar />
      </main>
    </div>
  );
};

export default Layout;
