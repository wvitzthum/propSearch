// FE-283: Extended with Rate Alert System
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Activity,
  Percent,
  Info,
  AlertTriangle,
  X,
  Settings
} from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';
import Tooltip from './Tooltip';
import { extractValue } from '../types/macro';
import type { RateAlert, AlertType } from '../types/macro';

const heatColor = (score: number): string => {
  if (score >= 8) return '#22c55e';
  if (score >= 6) return '#f59e0b';
  return '#ef4444';
};

// FE-283: Rate Alert System
const STORAGE_KEY = 'propSearch_rate_alerts';

const defaultAlerts: RateAlert[] = [
  { id: '1', type: 'cut_prob', threshold: 0.6, meeting: 'May 2026', triggered: false },
  { id: '2', type: 'cut_prob', threshold: 0.5, meeting: 'June 2026', triggered: false },
];

interface RateAlertSettingsModalProps {
  alerts: RateAlert[];
  onSave: (alerts: RateAlert[]) => void;
  onClose: () => void;
}

const RateAlertSettingsModal: React.FC<RateAlertSettingsModalProps> = ({ alerts, onSave, onClose }) => {
  const [localAlerts, setLocalAlerts] = useState<RateAlert[]>(alerts);

  const addAlert = () => {
    setLocalAlerts([...localAlerts, {
      id: Date.now().toString(),
      type: 'cut_prob',
      threshold: 0.5,
      triggered: false,
    }]);
  };

  const removeAlert = (id: string) => {
    setLocalAlerts(localAlerts.filter(a => a.id !== id));
  };

  const updateAlert = (id: string, updates: Partial<RateAlert>) => {
    setLocalAlerts(localAlerts.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-linear-card border border-linear-border rounded-xl max-w-md w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-linear-border flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Rate Alert Settings</h3>
          <button onClick={onClose} className="text-linear-text-muted hover:text-white"><X size={14} /></button>
        </div>
        <div className="p-4 space-y-3">
          {localAlerts.map(alert => (
            <div key={alert.id} className="p-3 bg-linear-bg rounded-xl border border-linear-border space-y-2">
              <div className="flex items-center justify-between">
                <select
                  value={alert.type}
                  onChange={e => updateAlert(alert.id, { type: e.target.value as AlertType })}
                  className="text-[10px] bg-transparent text-white border border-linear-border rounded px-2 py-1"
                >
                  <option value="cut_prob">Cut Probability</option>
                  <option value="hold_prob">Hold Probability</option>
                  <option value="rate_fall">Rate Fall</option>
                  <option value="rate_rise">Rate Rise</option>
                </select>
                <button onClick={() => removeAlert(alert.id)} className="text-retro-rose hover:text-white">
                  <X size={12} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-linear-text-muted">Alert when {'>'}</span>
                <input
                  type="number"
                  value={alert.threshold}
                  onChange={e => updateAlert(alert.id, { threshold: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-16 text-[10px] bg-transparent text-white border border-linear-border rounded px-2 py-1"
                />
                <span className="text-[9px] text-linear-text-muted">
                  {alert.type.includes('prob') ? '%' : '%'}
                </span>
              </div>
              {alert.meeting && (
                <div className="text-[9px] text-linear-text-muted">Meeting: {alert.meeting}</div>
              )}
            </div>
          ))}
          <button
            onClick={addAlert}
            className="w-full p-2 text-[10px] text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/10 transition-colors"
          >
            + Add Alert
          </button>
        </div>
        <div className="p-4 border-t border-linear-border flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-[10px] text-linear-text-muted hover:text-white">
            Cancel
          </button>
          <button onClick={() => { onSave(localAlerts); onClose(); }} className="px-3 py-1.5 text-[10px] bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const MarketPulse: React.FC = () => {
  const { data, loading, error } = useMacroData();
  const [showSettings, setShowSettings] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<RateAlert[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultAlerts;
    } catch {
      return defaultAlerts;
    }
  });

  // Persist alerts to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  // Check for triggered alerts
  const triggeredAlerts = useMemo(() => {
    if (!data) return [];
    const fc = data.forward_curve ?? [];
    const nextMeeting = fc[0];
    if (!nextMeeting) return [];

    return alerts.filter(alert => {
      if (alert.triggered && !dismissedAlerts.has(alert.id)) return true;
      if (alert.type === 'cut_prob' && nextMeeting.cut_25bp_prob > alert.threshold) return true;
      if (alert.type === 'hold_prob' && nextMeeting.no_change_prob > alert.threshold) return true;
      if (alert.type === 'rate_fall' && nextMeeting.implied_rate < alert.threshold) return true;
      if (alert.type === 'rate_rise' && nextMeeting.implied_rate > alert.threshold) return true;
      return false;
    });
  }, [alerts, data, dismissedAlerts]);

  const dismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set([...prev, id]));
  }, []);

  if (loading) return (
    <div className="bg-linear-card/30 border border-linear-border rounded-xl p-4 flex items-center justify-center animate-pulse h-24">
      <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Fetching Market Pulse...</span>
    </div>
  );

  if (error || !data) return (
    <div className="bg-linear-card/50 border border-linear-border rounded-xl p-4 flex items-center gap-3">
      <div className="h-2 w-2 rounded-full bg-retro-amber animate-pulse" />
      <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">LIVE DATA UNAVAILABLE</span>
    </div>
  );

  // Core KPI values
  const londonHPI = data?.london_hpi;
  const annualChange = extractValue(londonHPI?.annual_change ?? londonHPI?.yoy_pct) ?? 0;
  const monthlyChange = extractValue(londonHPI?.monthly_change ?? londonHPI?.mom_pct) ?? 0;

  const inventory = data?.inventory_velocity;
  const monthsSupply = extractValue(inventory?.months_of_supply) ?? 0;
  const newInstQChange = extractValue(inventory?.new_instructions_q_change) ?? 0;

  const negotiation = data?.negotiation_delta;
  const avgDiscount = extractValue(negotiation?.avg_discount_pct) ?? 0;
  const sentiment = extractValue(negotiation?.market_sentiment) ?? 'Stable';

  const econ = data?.economic_indicators;
  const boeRate = extractValue(econ?.boe_base_rate) ?? 0;
  const cpi = extractValue(econ?.uk_inflation_cpi) ?? 0;

  // Area heat — top 5 for inline display
  const areaHeat = (data?.area_heat_index || data?.area_trends || []).slice(0, 5);

  return (
    <div className="bg-linear-card/50 border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-linear-border bg-linear-card/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-linear-accent-blue animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <h2 className="text-[10px] font-bold text-white uppercase tracking-[0.15em]">Market Pulse</h2>
          {/* FE-283: Rate Alert Badge */}
          {triggeredAlerts.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
              <AlertTriangle size={8} className="text-amber-400" />
              <span className="text-[8px] font-bold text-amber-400">
                RATE ALERT
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-linear-text-muted">
            {londonHPI?.last_updated ?? new Date().toLocaleDateString()}
          </span>
          {/* FE-283: Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="text-linear-text-muted hover:text-white transition-colors"
            title="Rate Alert Settings"
          >
            <Settings size={12} />
          </button>
        </div>
      </div>

      {/* FE-283: Rate Alert Banner */}
      {triggeredAlerts.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={10} className="text-amber-400" />
            <span className="text-[9px] text-amber-300">
              {triggeredAlerts[0].type === 'cut_prob' && (
                <>Cut probability hit {((data?.forward_curve?.[0]?.cut_25bp_prob ?? 0) * 100).toFixed(0)}% — consider locking mortgage</>
              )}
              {triggeredAlerts[0].type === 'hold_prob' && (
                <>Hold probability elevated</>
              )}
              {triggeredAlerts[0].type === 'rate_fall' && (
                <>Rates falling — favorable timing</>
              )}
              {triggeredAlerts[0].type === 'rate_rise' && (
                <>Rates rising — consider locking</>
              )}
            </span>
          </div>
          <button
            onClick={() => dismissAlert(triggeredAlerts[0].id)}
            className="text-amber-400 hover:text-amber-300"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* KPI Grid — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-linear-border">
        <Tooltip
          content="A localized liquidity score for specific London boroughs, tracking search volume vs. listing duration."
          methodology="Aggregated data from Rightmove/Zoopla on search volume vs. listing duration."
        >
          <div className="p-4 hover:bg-linear-card/60 transition-colors">
            <div className="flex justify-between items-start mb-1.5">
              <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-[0.1em]">London HPI</span>
              <TrendingUp size={10} className="text-linear-accent-blue" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tracking-tighter">
                {annualChange > 0 ? '+' : ''}{annualChange}%
              </span>
              <span className={`text-[9px] font-bold ${monthlyChange >= 0 ? 'text-linear-accent-emerald' : 'text-linear-accent-rose'}`}>
                {monthlyChange >= 0 ? '▲' : '▼'}{Math.abs(monthlyChange)}% MoM
              </span>
            </div>
          </div>
        </Tooltip>

        <Tooltip
          content="The number of months it would take to sell all current listings at the average monthly absorption rate."
          methodology="Active Listings / Avg. Monthly Sales. < 4m = Seller's Market, > 6m = Buyer's Market."
        >
          <div className="p-4 hover:bg-linear-card/60 transition-colors">
            <div className="flex justify-between items-start mb-1.5">
              <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-[0.1em]">Inventory</span>
              <Activity size={10} className="text-linear-accent-blue" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tracking-tighter">{monthsSupply}</span>
              <span className="text-[8px] text-linear-text-muted font-bold uppercase">MOS</span>
              <span className={`text-[9px] font-bold ml-auto ${newInstQChange >= 0 ? 'text-linear-accent-emerald' : 'text-linear-accent-rose'}`}>
                {newInstQChange >= 0 ? '▲' : '▼'}{Math.abs(newInstQChange)}% Q
              </span>
            </div>
          </div>
        </Tooltip>

        <Tooltip
          content="The average difference between the 'Asking Price' and 'Sold Price' in the current quarter."
          methodology="Calculation based on Land Registry sold data vs. initial portal asking price."
        >
          <div className="p-4 hover:bg-linear-card/60 transition-colors">
            <div className="flex justify-between items-start mb-1.5">
              <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-[0.1em]">Negotiation</span>
              <Percent size={10} className="text-linear-accent-emerald" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tracking-tighter">-{avgDiscount}%</span>
              <span className="text-[8px] text-linear-accent-emerald font-bold uppercase">{sentiment}</span>
            </div>
          </div>
        </Tooltip>

        <Tooltip
          content="Current official Bank of England base interest rate, governing the floor for retail mortgage products."
          methodology="Directly sourced from the BoE Monetary Policy Committee (MPC) latest release."
        >
          <div className="p-4 hover:bg-linear-card/60 transition-colors">
            <div className="flex justify-between items-start mb-1.5">
              <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-[0.1em]">BoE Base</span>
              <Info size={10} className="text-retro-amber" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tracking-tighter">{boeRate.toFixed(2)}%</span>
              <span className="text-[8px] text-retro-amber font-bold uppercase">CPI {cpi}%</span>
            </div>
          </div>
        </Tooltip>
      </div>

      {/* Area Heat Strip — inline compact row */}
      {areaHeat.length > 0 && (
        <div className="px-4 py-2.5 border-t border-linear-border bg-linear-card/30 flex items-center gap-3 overflow-x-auto custom-scrollbar">
          <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-widest shrink-0">
            Area Heat
          </span>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {areaHeat.map((area: any) => {
              const score = extractValue(area.score) ?? 5;
              const color = heatColor(score);
              return (
                <div
                  key={area.area}
                  className="flex items-center gap-1.5 px-2 py-1 rounded border shrink-0"
                  style={{ backgroundColor: `${color}10`, borderColor: `${color}25` }}
                >
                  <div className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[8px] font-bold text-white uppercase tracking-tight whitespace-nowrap">
                    {area.area}
                  </span>
                  <span className="text-[8px] font-black" style={{ color }}>
                    {score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FE-283: Rate Alert Settings Modal */}
      {showSettings && (
        <RateAlertSettingsModal
          alerts={alerts}
          onSave={(newAlerts) => setAlerts(newAlerts)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default MarketPulse;
