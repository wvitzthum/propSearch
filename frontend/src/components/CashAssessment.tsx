/**
 * CashAssessment.tsx — Floor 2: property price + deposit → Cash Stack waterfall
 */
import React from 'react';
import type { CashStackResult, BuyerScenario } from '../utils/affordability';
import { DEPOSIT_PRESETS } from '../hooks/useAffordabilityCalculator';

// ── Waterfall Bar ───────────────────────────────────────────────────────────────
interface WaterfallBarProps {
  entries: { label: string; amount: number; color: string; subLabel?: string }[];
  totalCashNeeded: number;
  gap: number | null;
  gapPct: number | null;
}

const WaterfallBar: React.FC<WaterfallBarProps> = ({ entries, totalCashNeeded, gap, gapPct }) => (
  <div className="space-y-3">
    {/* Bars */}
    <div className="flex h-8 rounded-full overflow-hidden gap-px bg-linear-bg">
      {entries.map((entry) => {
        const pct = totalCashNeeded > 0 ? (entry.amount / totalCashNeeded) * 100 : 0;
        if (pct < 1) return null;
        return (
          <div key={entry.label} title={`${entry.label}: £${entry.amount.toLocaleString()}`}
            className="flex items-center justify-center transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: entry.color, minWidth: pct > 5 ? 0 : 1 }}>
            {pct > 12 && (
              <span className="text-[8px] font-black text-white/90 truncate px-1 whitespace-nowrap">
                {entry.label} £{(entry.amount / 1000).toFixed(0)}K
              </span>
            )}
          </div>
        );
      })}
    </div>

    {/* Legend */}
    <div className="space-y-1">
      {entries.map((entry) => (
        <div key={entry.label} className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[9px] text-linear-text-muted">{entry.label}</span>
            {entry.subLabel && <span className="text-[8px] text-linear-text-muted/50">· {entry.subLabel}</span>}
          </div>
          <span className="text-[9px] font-bold text-white">£{entry.amount.toLocaleString()}</span>
        </div>
      ))}
    </div>

    {/* Total */}
    <div className="pt-2 border-t border-linear-border/50 flex items-center justify-between">
      <span className="text-[9px] font-black text-white uppercase tracking-widest">Total Cash Needed</span>
      <span className="text-[10px] font-black text-linear-accent">£{totalCashNeeded.toLocaleString()}</span>
    </div>

    {/* Gap alert */}
    {gap != null && gapPct != null && (
      <div className={`p-2.5 rounded-xl border text-[9px] leading-relaxed
        ${gapPct > 20 ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
        <span className="font-bold">Cash gap:</span> £{gap.toLocaleString()} shortfall
        {gapPct > 20 ? ' — consider raising deposit or reducing price.' : ' — modest adjustment needed.'}
      </div>
    )}
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────
interface CashAssessmentProps {
  scenario: BuyerScenario;
  setScenario: (s: BuyerScenario) => void;
  propertyPrice: number;
  setPropertyPrice: (v: number) => void;
  depositPct: number;
  setDepositPct: (v: number) => void;
  availableCash: number | null;
  setAvailableCash: (v: number | null) => void;
  cashStack: CashStackResult;
  suggestedPrice: number;
  effectivePrice: number;
}

// ── Component ────────────────────────────────────────────────────────────────
const SCENARIOS: { value: BuyerScenario; label: string; note?: string }[] = [
  { value: 'ftb', label: 'First Time Buyer' },
  { value: 'home_mover', label: 'Home Mover' },
  { value: 'additional_property', label: 'Additional Property', note: 'Higher SDLT rates apply' },
];

const PRICE_PRESETS = [250000, 500000, 750000, 1000000, 1500000];

const CashAssessment: React.FC<CashAssessmentProps> = ({
  scenario, setScenario, propertyPrice, setPropertyPrice, depositPct, setDepositPct,
  availableCash, setAvailableCash, cashStack, suggestedPrice, effectivePrice,
}) => {
  const [usedSuggestion, setUsedSuggestion] = React.useState(false);

  const handleUseSuggestion = () => {
    setPropertyPrice(suggestedPrice);
    setUsedSuggestion(true);
  };

  const handlePriceManual = () => setUsedSuggestion(false);

  const pricePct = Math.min(100, Math.max(0, ((effectivePrice - 100000) / (3000000 - 100000)) * 100));
  const isFtB = scenario === 'ftb';
  const isAdditional = scenario === 'additional_property';

  return (
    <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden" id="cash-assessment">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-linear-border/50">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-[10px] font-black text-white uppercase tracking-widest">Cash Assessment</div>
        </div>
        <div className="text-[9px] text-linear-text-muted">Deposit + SDLT + fees &amp; disbursements</div>

        {/* Suggestion badge */}
        {usedSuggestion && propertyPrice === suggestedPrice && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[8px] font-black uppercase tracking-widest">
            Suggested: £{(suggestedPrice / 1000000).toFixed(2)}M
          </div>
        )}
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Scenario */}
        <div className="space-y-2">
          <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest block">Buyer Scenario</span>
          <div className="flex gap-1.5 flex-wrap">
            {SCENARIOS.map((s) => (
              <button key={s.value} onClick={() => setScenario(s.value)}
                className={`px-2.5 py-1.5 rounded-xl text-[9px] font-bold transition-all border
                  ${scenario === s.value
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                    : 'bg-linear-bg border-linear-border text-linear-text-muted hover:text-white hover:border-blue-500/30'}`}>
                {s.label}
                {s.note && <span className="block text-[8px] font-normal opacity-70">{s.note}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Property Price */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">Target Price</span>
            <div className="flex gap-2">
              <button onClick={handleUseSuggestion}
                className="text-[8px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors"
                title="Set to max mortgage × 1.1">
                Use suggestion
              </button>
              {usedSuggestion && propertyPrice !== suggestedPrice && (
                <button onClick={handlePriceManual}
                  className="text-[8px] font-black text-linear-text-muted/50 hover:text-linear-text-muted uppercase tracking-widest transition-colors">
                  clear
                </button>
              )}
            </div>
          </div>

          <div className="relative h-1.5 bg-linear-bg rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-purple-500 rounded-full transition-all duration-100"
              style={{ width: `${pricePct}%` }} />
            <input type="range" min={100000} max={3000000} step={5000}
              value={effectivePrice} onChange={(e) => { setPropertyPrice(Number(e.target.value)); setUsedSuggestion(false); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
          <div className="flex justify-between text-[8px] text-linear-text-muted/60">
            <span>£100K</span><span>£3M</span>
          </div>

          {/* Price display */}
          <div className="text-center py-2 bg-linear-bg rounded-xl border border-linear-border/50">
            <span className="text-2xl font-black text-white tracking-tighter tabular-nums">
              £{(effectivePrice / 1000000).toFixed(2)}M
            </span>
            {effectivePrice !== propertyPrice && propertyPrice === 0 && (
              <span className="block text-[8px] text-linear-text-muted/50 mt-0.5">using suggestion</span>
            )}
          </div>

          {/* Price presets */}
          <div className="flex gap-1 flex-wrap">
            {PRICE_PRESETS.map((p) => (
              <button key={p} onClick={() => { setPropertyPrice(p); setUsedSuggestion(false); }}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all border
                  ${effectivePrice === p ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                    : 'bg-linear-bg border-linear-border text-linear-text-muted hover:text-white hover:border-blue-500/30'}`}>
                £{(p / 1000000).toFixed(1)}M
              </button>
            ))}
          </div>
        </div>

        {/* Deposit presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">
              Deposit ({depositPct}%)
            </span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {DEPOSIT_PRESETS.map((pct) => (
              <button key={pct} onClick={() => setDepositPct(pct)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border
                  ${depositPct === pct ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                    : 'bg-linear-bg border-linear-border text-linear-text-muted hover:text-white hover:border-blue-500/30'}`}>
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Available cash input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">
              Available Cash
            </span>
            {availableCash != null && (
              <button onClick={() => setAvailableCash(null)}
                className="text-[8px] text-linear-text-muted/50 hover:text-linear-text-muted uppercase tracking-widest transition-colors">
                clear
              </button>
            )}
          </div>
          <input
            type="number"
            min={0}
            max={10000000}
            step={5000}
            placeholder="Enter available cash…"
            value={availableCash ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setAvailableCash(v === '' ? null : Number(v));
            }}
            className="w-full px-3 py-2 bg-linear-bg border border-linear-border rounded-xl
              text-sm font-bold text-white placeholder:text-linear-text-muted/30
              focus:outline-none focus:border-blue-500/50 focus:bg-linear-card transition-all"
          />
        </div>

        {/* FTB note */}
        {isFtB && (
          <div className={`p-2.5 rounded-xl border text-[9px] leading-relaxed
            ${cashStack.entries.some(e => e.label === 'SDLT' && e.color === '#f59e0b')
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-linear-bg border-linear-border/50 text-linear-text-muted/60'}`}>
            {cashStack.entries.some(e => e.label === 'SDLT' && e.color === '#f59e0b')
              ? 'FTB relief lost above £625K — SDLT applies on portion above threshold.'
              : 'FTB nil-rate band covers properties up to £425K; 5% on £425,001–£625K.'}
          </div>
        )}

        {/* Additional Property note */}
        {isAdditional && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[9px] text-rose-300 leading-relaxed">
            Higher SDLT rates apply — this property is not your primary residence.
          </div>
        )}

        {/* Cash Stack waterfall */}
        <div className="pt-3 border-t border-linear-border/50">
          <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-3">Cash Stack Breakdown</div>
          <WaterfallBar
            entries={cashStack.entries}
            totalCashNeeded={cashStack.totalCashNeeded}
            gap={cashStack.gap}
            gapPct={cashStack.gapPct}
          />
        </div>
      </div>
    </div>
  );
};

export default CashAssessment;
