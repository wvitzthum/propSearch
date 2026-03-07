import React from 'react';
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
  ChevronDown
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { icon: <Compass size={16} />, label: 'Discover', path: '/' },
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Zap size={16} />, label: 'Strategy', path: '/strategy' },
  ];

  return (
    <div className="min-h-screen bg-linear-bg text-white font-sans antialiased flex selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-linear-border flex flex-col fixed inset-y-0 left-0 z-50 bg-linear-bg/80 backdrop-blur-xl">
        <div className="p-4 flex items-center justify-between group">
          <div className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-linear-card transition-colors">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-black italic shadow-lg shadow-blue-500/20">
              IS
            </div>
            <span className="text-sm font-semibold tracking-tight">immoSearch</span>
            <ChevronDown size={14} className="text-linear-text-muted" />
          </div>
          <button className="h-6 w-6 rounded border border-linear-border flex items-center justify-center text-linear-text-muted hover:text-white hover:bg-linear-card transition-all">
            <Plus size={14} />
          </button>
        </div>

        <div className="px-3 py-2">
          <button className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-linear-card border border-linear-border text-linear-text-muted hover:text-white transition-all shadow-sm group">
            <div className="flex items-center gap-2">
              <Search size={14} />
              <span className="text-xs">Search properties</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] bg-linear-bg px-1 rounded border border-linear-border group-hover:border-linear-accent transition-colors">⌘</span>
              <span className="text-[10px] bg-linear-bg px-1 rounded border border-linear-border group-hover:border-linear-accent transition-colors">K</span>
            </div>
          </button>
        </div>

        <nav className="flex-grow px-2 py-4 space-y-0.5">
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

          <div className="pt-8 pb-2 px-3 text-[10px] font-bold text-linear-text-muted uppercase tracking-wider">
            Target Areas
          </div>
          <div className="space-y-0.5">
            {['Islington', 'Bayswater', 'West Hampstead'].map(area => (
              <button key={area} className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-linear-text-muted hover:text-white hover:bg-linear-card/50 transition-all text-left group">
                <div className="h-2 w-2 rounded-full border border-linear-border group-hover:border-blue-500 transition-colors"></div>
                {area}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-linear-border flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold border border-white/10 shadow-lg ring-1 ring-white/5">
              AM
            </div>
            <span className="text-xs font-medium text-linear-text-muted group-hover:text-white transition-colors">alex.m</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-linear-text-muted hover:text-white hover:bg-linear-card rounded-md transition-all relative">
              <Bell size={16} />
              <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full border border-linear-bg"></div>
            </button>
            <button className="p-1.5 text-linear-text-muted hover:text-white hover:bg-linear-card rounded-md transition-all">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow pl-64 min-h-screen">
        <header className="h-12 border-b border-linear-border bg-linear-bg/50 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-linear-text-muted">
            <span className="hover:text-white cursor-pointer">Acquisition</span>
            <span className="text-linear-border">/</span>
            <span className="text-white capitalize">{location.pathname.replace('/', '') || 'Discover'}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 bg-linear-card px-2 py-1 rounded border border-linear-border text-[10px] font-mono text-linear-text-muted select-none">
                <Command size={10} />
                <span>K</span>
             </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
