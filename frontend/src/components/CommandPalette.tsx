import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, ArrowRight, Command, Check, Zap, LayoutDashboard,
  Inbox, Percent, Compass, Clock, Star, Sparkles,
  TrendingUp, DollarSign, Building2, X
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import type { PropertyWithCoords } from '../types/property';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type CommandCategory = 'navigation' | 'search' | 'filter' | 'action' | 'recent';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  shortcut?: string[];
}

interface RecentAction {
  id: string;
  type: 'property' | 'filter' | 'navigation';
  label: string;
  timestamp: number;
}

const RECENT_ACTIONS_KEY = 'propSearch_recent_actions';
const MAX_RECENT = 10;

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<'search' | 'command'>('search');
  const [injectionStatus, setInjectionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const { properties, updateFilters } = usePropertyContext();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isUrl = query.startsWith('http');

  // Load recent actions from localStorage
  const recentActions: RecentAction[] = useMemo(() => {
    try {
      const stored = localStorage.getItem(RECENT_ACTIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out actions older than 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return parsed.filter((a: RecentAction) => a.timestamp > oneDayAgo).slice(0, MAX_RECENT);
      }
    } catch (e) {
      console.error('Failed to load recent actions:', e);
    }
    return [];
  }, []);

  const addRecentAction = useCallback((action: Omit<RecentAction, 'timestamp'>) => {
    try {
      const stored = localStorage.getItem(RECENT_ACTIONS_KEY);
      const existing: RecentAction[] = stored ? JSON.parse(stored) : [];
      const newAction: RecentAction = { ...action, timestamp: Date.now() };
      const updated = [newAction, ...existing.filter(a => a.id !== action.id)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_ACTIONS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent action:', e);
    }
  }, []);

  // Navigation commands
  const navigationCommands: CommandItem[] = useMemo(() => [
    {
      id: 'nav-discover',
      label: 'Go to Discover',
      description: 'Return to landing page',
      category: 'navigation',
      icon: <Compass size={16} />,
      action: () => { navigate('/'); addRecentAction({ id: 'nav-discover', type: 'navigation', label: 'Discover' }); onClose(); },
      keywords: ['home', 'landing', 'start'],
    },
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'Main property terminal',
      category: 'navigation',
      icon: <LayoutDashboard size={16} />,
      action: () => { navigate('/dashboard'); addRecentAction({ id: 'nav-dashboard', type: 'navigation', label: 'Dashboard' }); onClose(); },
      keywords: ['terminal', 'main', 'properties'],
    },
    {
      id: 'nav-inbox',
      label: 'Go to Lead Inbox',
      description: 'Unprocessed property leads',
      category: 'navigation',
      icon: <Inbox size={16} />,
      action: () => { navigate('/inbox'); addRecentAction({ id: 'nav-inbox', type: 'navigation', label: 'Lead Inbox' }); onClose(); },
      keywords: ['leads', 'new', 'unprocessed'],
    },
    {
      id: 'nav-compare',
      label: 'Go to Comparative Intel',
      description: 'Side-by-side property analysis',
      category: 'navigation',
      icon: <Percent size={16} />,
      action: () => { navigate('/compare'); addRecentAction({ id: 'nav-compare', type: 'navigation', label: 'Comparative Intel' }); onClose(); },
      keywords: ['comparison', 'analysis', 'side by side'],
    },
    {
      id: 'nav-mortgage',
      label: 'Go to Mortgage Tracker',
      description: 'Monitor financing options',
      category: 'navigation',
      icon: <DollarSign size={16} />,
      action: () => { navigate('/mortgage'); addRecentAction({ id: 'nav-mortgage', type: 'navigation', label: 'Mortgage Tracker' }); onClose(); },
      keywords: ['finance', 'loan', 'lending'],
    },
  ], [navigate, onClose, addRecentAction]);

  // Filter commands
  const filterCommands: CommandItem[] = useMemo(() => [
    {
      id: 'filter-valuebuy',
      label: 'Show Value Buys',
      description: 'Properties with high Alpha Score and reduced prices',
      category: 'filter',
      icon: <Star size={16} />,
      action: () => {
        updateFilters({ is_value_buy: true });
        navigate('/dashboard');
        addRecentAction({ id: 'filter-valuebuy', type: 'filter', label: 'Value Buys' });
        onClose();
      },
      keywords: ['deals', 'discount', 'alpha', 'score'],
    },
    {
      id: 'filter-vetted',
      label: 'Show Vetted Properties',
      description: 'Properties that passed due diligence',
      category: 'filter',
      icon: <Check size={16} />,
      action: () => {
        updateFilters({ vetted: true });
        navigate('/dashboard');
        addRecentAction({ id: 'filter-vetted', type: 'filter', label: 'Vetted' });
        onClose();
      },
      keywords: ['verified', 'approved', 'qualified'],
    },
    {
      id: 'filter-new',
      label: 'Show Fresh Discoveries',
      description: 'Properties seen for the first time',
      category: 'filter',
      icon: <Sparkles size={16} />,
      action: () => {
        updateFilters({});
        navigate('/dashboard');
        addRecentAction({ id: 'filter-new', type: 'filter', label: 'Fresh Discoveries' });
        onClose();
      },
      keywords: ['new', 'recent', 'fresh'],
    },
    {
      id: 'filter-clear',
      label: 'Clear All Filters',
      description: 'Reset to show all properties',
      category: 'filter',
      icon: <X size={16} />,
      action: () => {
        updateFilters({});
        navigate('/dashboard');
        addRecentAction({ id: 'filter-clear', type: 'filter', label: 'All Properties' });
        onClose();
      },
      keywords: ['reset', 'clear', 'all'],
    },
    {
      id: 'filter-alpha-high',
      label: 'Sort by Alpha Score (High-Low)',
      description: 'Best investment opportunities first',
      category: 'filter',
      icon: <TrendingUp size={16} />,
      action: () => {
        updateFilters({ sortBy: 'alpha_score', sortOrder: 'DESC' });
        navigate('/dashboard');
        addRecentAction({ id: 'filter-alpha', type: 'filter', label: 'Alpha Sort' });
        onClose();
      },
      keywords: ['best', 'top', 'highest'],
    },
    {
      id: 'filter-price-low',
      label: 'Sort by Price (Low-High)',
      description: 'Most affordable first',
      category: 'filter',
      icon: <DollarSign size={16} />,
      action: () => {
        updateFilters({ sortBy: 'realistic_price', sortOrder: 'ASC' });
        navigate('/dashboard');
        addRecentAction({ id: 'filter-price', type: 'filter', label: 'Price Sort' });
        onClose();
      },
      keywords: ['cheap', 'affordable', 'lowest'],
    },
  ], [updateFilters, navigate, onClose, addRecentAction]);

  // Area filter commands
  const areaCommands: CommandItem[] = useMemo(() => {
    const areas = [...new Set(properties.map(p => p.area.split(' (')[0]))];
    return areas.map(area => ({
      id: `filter-area-${area}`,
      label: `Filter: ${area}`,
      description: `Show properties in ${area}`,
      category: 'filter' as CommandCategory,
      icon: <Building2 size={16} />,
      action: () => {
        updateFilters({ area });
        navigate('/dashboard');
        addRecentAction({ id: `filter-area-${area}`, type: 'filter', label: area });
        onClose();
      },
      keywords: [area.toLowerCase(), 'area', 'location', 'zone'],
    }));
  }, [properties, updateFilters, navigate, onClose, addRecentAction]);

  // Fuzzy search function
  const fuzzyMatch = useCallback((text: string, search: string): boolean => {
    if (!search) return true;
    const textLower = text.toLowerCase();
    const searchLower = search.toLowerCase();

    // Direct contains
    if (textLower.includes(searchLower)) return true;

    // Fuzzy match: all characters must appear in order
    let searchIdx = 0;
    for (let i = 0; i < textLower.length && searchIdx < searchLower.length; i++) {
      if (textLower[i] === searchLower[searchIdx]) {
        searchIdx++;
      }
    }
    return searchIdx === searchLower.length;
  }, []);

  // Filter property results
  const propertyResults: PropertyWithCoords[] = useMemo(() => {
    if (!query.trim() || isUrl) return [];

    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

    return properties
      .filter(p => {
        const searchableText = `${p.address} ${p.area} ${p.id} ${p.neg_strategy}`.toLowerCase();
        return searchTerms.every(term => fuzzyMatch(searchableText, term));
      })
      .slice(0, 8);
  }, [query, properties, isUrl, fuzzyMatch]);

  // Filter commands based on query
  const allCommands = useMemo(() => {
    if (!query.trim() || isUrl) return [...navigationCommands, ...filterCommands, ...areaCommands];

    const searchLower = query.toLowerCase();
    const filteredNav = navigationCommands.filter(cmd =>
      fuzzyMatch(cmd.label, searchLower) ||
      cmd.keywords?.some(kw => fuzzyMatch(kw, searchLower))
    );
    const filteredFilters = filterCommands.filter(cmd =>
      fuzzyMatch(cmd.label, searchLower) ||
      cmd.keywords?.some(kw => fuzzyMatch(kw, searchLower))
    );
    const filteredAreas = areaCommands.filter(cmd =>
      fuzzyMatch(cmd.label, searchLower) ||
      cmd.keywords?.some(kw => fuzzyMatch(kw, searchLower))
    );

    return [...filteredNav, ...filteredFilters, ...filteredAreas];
  }, [query, isUrl, navigationCommands, filterCommands, areaCommands, fuzzyMatch]);

  // Combined results for display
  const displayResults = useMemo(() => {
    if (isUrl) return [];

    const items: Array<{ type: 'property' | 'command'; data: PropertyWithCoords | CommandItem }> = [];

    // Add property results
    propertyResults.forEach(p => items.push({ type: 'property', data: p }));

    // Add filtered commands
    allCommands.forEach(c => items.push({ type: 'command', data: c }));

    return items;
  }, [isUrl, propertyResults, allCommands]);

  // Handle direct URL injection
  const handleDirectInjection = async () => {
    if (!query.startsWith('http')) return;

    try {
      setInjectionStatus('loading');
      const res = await fetch('/api/manual-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: query, source: 'COMMAND_PALETTE' })
      });

      if (!res.ok) throw new Error('Injection failed');

      setInjectionStatus('success');
      setTimeout(() => {
        setInjectionStatus('idle');
        setQuery('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Injection error:', err);
      setInjectionStatus('error');
      setTimeout(() => setInjectionStatus('idle'), 3000);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = isUrl ? [] : displayResults;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (isUrl) {
          handleDirectInjection();
        } else if (items.length > 0) {
          const selected = items[selectedIndex];
          if (selected.type === 'property') {
            const prop = selected.data as PropertyWithCoords;
            navigate(`/property/${prop.id}`);
            addRecentAction({ id: prop.id, type: 'property', label: prop.address });
            onClose();
          } else {
            (selected.data as CommandItem).action();
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case '/':
        if (!isUrl && query === '') {
          e.preventDefault();
          setMode('command');
        }
        break;
    }
  }, [isUrl, displayResults, selectedIndex, navigate, onClose, handleDirectInjection, addRecentAction, query]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setMode('search');
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Parent component handles opening
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-linear-card border border-linear-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-linear-border bg-linear-bg/80">
          <div className="flex items-center gap-3 flex-1">
            {mode === 'command' ? (
              <Command size={18} className="text-blue-400" />
            ) : (
              <Search size={18} className="text-linear-accent" />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder={isUrl ? 'Inject URL to Scraper...' : 'Search properties, commands, or filters...'}
              className="w-full py-4 px-2 bg-transparent text-white placeholder-linear-text-muted focus:outline-none text-sm font-medium"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex items-center gap-2">
            {query && (
              <button
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="p-1 text-linear-text-muted hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
            <div className="flex items-center gap-1 px-2 py-1 rounded border border-linear-border text-[10px] font-mono text-linear-text-muted">
              <span className="text-[8px]">ESC</span>
            </div>
          </div>
        </div>

        {/* URL Injection Mode */}
        {isUrl && (
          <div className="p-4 space-y-4">
            <div className="px-3 py-2 text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Zap size={12} />
              Direct Asset Injection Detected
            </div>
            <button
              onClick={handleDirectInjection}
              disabled={injectionStatus === 'loading'}
              className={`w-full flex items-center justify-between p-6 rounded-2xl border transition-all ${
                injectionStatus === 'success' ? 'bg-retro-green/10 border-retro-green/40' :
                injectionStatus === 'error' ? 'bg-rose-500/10 border-rose-500/40' :
                'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40 group'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                  injectionStatus === 'success' ? 'bg-retro-green/20 text-retro-green' :
                  injectionStatus === 'error' ? 'bg-rose-500/20 text-rose-500' :
                  'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30'
                }`}>
                  {injectionStatus === 'loading' ? (
                    <div className="h-5 w-5 border-2 border-t-transparent border-white animate-spin rounded-full" />
                  ) : injectionStatus === 'success' ? (
                    <Check size={24} />
                  ) : (
                    <Zap size={24} />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-white uppercase tracking-widest">
                    {injectionStatus === 'loading' ? 'Analyzing Endpoint...' :
                     injectionStatus === 'success' ? 'Added to Manual Queue' :
                     injectionStatus === 'error' ? 'Handshake Failed' :
                     'Inject URL to Scraper'}
                  </div>
                  <div className="text-[10px] text-linear-text-muted font-mono truncate max-w-[300px] mt-1">{query}</div>
                </div>
              </div>
              <ArrowRight size={20} className="text-linear-accent" />
            </button>
            <div className="px-4 text-[10px] text-linear-text-muted leading-relaxed italic text-center">
              Manual injection prioritizes this URL in the next scrape cycle.
            </div>
          </div>
        )}

        {/* Recent Actions */}
        {!query && recentActions.length > 0 && (
          <div className="border-b border-linear-border">
            <div className="px-4 py-2 text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
              <Clock size={10} />
              Recent
            </div>
            <div className="px-2 pb-2 space-y-0.5">
              {recentActions.slice(0, 5).map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    // Navigate based on action type
                    if (action.type === 'navigation') {
                      const navMap: Record<string, string> = {
                        'Discover': '/',
                        'Dashboard': '/dashboard',
                        'Lead Inbox': '/inbox',
                        'Comparative Intel': '/compare',
                        'Mortgage Tracker': '/mortgage',
                      };
                      navigate(navMap[action.label] || '/');
                    } else if (action.type === 'property') {
                      navigate(`/property/${action.id}`);
                    }
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-linear-bg transition-colors text-left"
                >
                  <Clock size={14} className="text-linear-text-muted" />
                  <span className="text-sm text-white">{action.label}</span>
                  <span className="text-[10px] text-linear-text-muted ml-auto">
                    {new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        {!isUrl && (
          <div ref={listRef} className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
            {/* Properties */}
            {propertyResults.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-2 text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">
                  Properties
                </div>
                <div className="space-y-0.5">
                  {propertyResults.map((p, i) => {
                    const globalIndex = i;
                    return (
                      <button
                        key={p.id}
                        data-index={globalIndex}
                        onClick={() => {
                          navigate(`/property/${p.id}`);
                          addRecentAction({ id: p.id, type: 'property', label: p.address });
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                          selectedIndex === globalIndex
                            ? 'bg-blue-500/20 border border-blue-500/40'
                            : 'hover:bg-linear-bg border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-linear-bg border border-linear-border flex items-center justify-center text-linear-accent">
                            <MapPin size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{p.address}</div>
                            <div className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest">{p.area}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs font-bold text-white">£{p.realistic_price.toLocaleString()}</div>
                            <div className="text-[9px] text-linear-text-muted uppercase font-bold">Target</div>
                          </div>
                          {selectedIndex === globalIndex && (
                            <ArrowRight size={14} className="text-blue-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Commands */}
            {allCommands.length > 0 && (
              <div>
                <div className="px-3 py-2 text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                  <Command size={10} />
                  Commands
                </div>
                <div className="space-y-0.5">
                  {allCommands.map((cmd, i) => {
                    const globalIndex = propertyResults.length + i;
                    const categoryColors: Record<string, string> = {
                      navigation: 'text-blue-400',
                      filter: 'text-emerald-400',
                      action: 'text-amber-400',
                      recent: 'text-purple-400',
                      search: 'text-linear-accent',
                    };
                    return (
                      <button
                        key={cmd.id}
                        data-index={globalIndex}
                        onClick={cmd.action}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
                          selectedIndex === globalIndex
                            ? 'bg-blue-500/20 border border-blue-500/40'
                            : 'hover:bg-linear-bg border border-transparent'
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg bg-linear-bg border border-linear-border flex items-center justify-center ${categoryColors[cmd.category] || 'text-linear-accent'}`}>
                          {cmd.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-[10px] text-linear-text-muted truncate">{cmd.description}</div>
                          )}
                        </div>
                        {selectedIndex === globalIndex && (
                          <ArrowRight size={14} className="text-blue-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {displayResults.length === 0 && query && (
              <div className="py-12 text-center">
                <Search size={32} className="mx-auto mb-3 text-linear-text-muted opacity-50" />
                <p className="text-sm text-linear-text-muted">No results for "{query}"</p>
                <p className="text-[10px] text-linear-text-muted mt-1">Try different keywords or press "/" for commands</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 bg-linear-bg/50 border-t border-linear-border flex items-center justify-between text-[10px] font-medium text-linear-text-muted uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-linear-card border border-linear-border text-white">↑↓</span>
              Navigate
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-linear-card border border-linear-border text-white">↵</span>
              {isUrl ? 'Inject' : 'Select'}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-linear-card border border-linear-border text-white">/</span>
              Commands
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Command size={10} />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
