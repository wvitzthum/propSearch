/**
 * AnalystStatementPanel — PO-003
 * Surfaces written macro summaries at the top of MarketPage.
 * Shows latest statement + compact history of older ones.
 * "Bloomberg Terminal meets Linear" aesthetic — terminal dispatch feel.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';
import type { AnalystStatement } from '../types/macro';

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const MacroBadge: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex items-center gap-1.5 px-2 py-1 bg-linear-bg rounded-lg border border-linear-border/50">
    <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">{label}</span>
    <span className="text-[10px] font-bold text-white tabular-nums">{value}</span>
  </div>
);

// ── Single statement card ───────────────────────────────────────────────────────
const StatementCard: React.FC<{ stmt: AnalystStatement; latest: boolean }> = ({ stmt, latest }) => {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const ctx = stmt.macro_context;
  const badges: Array<{ label: string; value: string }> = [];
  if (ctx.boe_rate != null) badges.push({ label: 'BoE', value: `${ctx.boe_rate}%` });
  if (ctx.two_year_swap != null) badges.push({ label: '2yr Swap', value: `${ctx.two_year_swap}%` });
  if (ctx.five_year_swap != null) badges.push({ label: '5yr Swap', value: `${ctx.five_year_swap}%` });
  if (ctx.london_hpi_annual_change != null) badges.push({ label: 'HPI YoY', value: `${ctx.london_hpi_annual_change > 0 ? '+' : ''}${ctx.london_hpi_annual_change}%` });
  if (ctx.gbp_usd != null) badges.push({ label: 'GBP/USD', value: ctx.gbp_usd.toFixed(2) });
  if (ctx.mos != null) badges.push({ label: 'MOS', value: ctx.mos.toFixed(1) });
  if (ctx.avg_discount_pct != null) badges.push({ label: 'Avg Disc', value: `${ctx.avg_discount_pct}%` });
  if (ctx.mortgage_2yr_75ltv != null) badges.push({ label: '2yr 75LTV', value: `${ctx.mortgage_2yr_75ltv}%` });

  return (
    <div className={`rounded-2xl border overflow-hidden ${latest ? 'border-retro-green/30 bg-retro-green/5' : 'border-linear-border bg-linear-card'}`}>
      {/* Card header */}
      <div className="flex items-start justify-between px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Retro-green terminal dispatch marker */}
          {latest && (
            <div className="mt-0.5 h-2 w-2 rounded-full bg-retro-green shrink-0 mt-1" />
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-mono text-linear-text-muted/60">{stmt.id}</span>
              <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">
                {fmtDate(stmt.date)}
              </span>
              <span className="text-[9px] font-bold text-linear-text-muted/50">
                · {stmt.analyst}
              </span>
            </div>
            <h3 className={`text-sm font-bold ${latest ? 'text-white' : 'text-linear-text-muted'}`}>
              {stmt.title}
            </h3>
          </div>
        </div>
        {stmt.sources.length > 0 && (
          <button
            onClick={() => setSourcesExpanded(v => !v)}
            className="flex items-center gap-1 text-[8px] font-black text-linear-text-muted/50 uppercase tracking-widest hover:text-white transition-colors shrink-0"
          >
            {stmt.sources.length} sources
            {sourcesExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        )}
      </div>

      {/* Expanded sources */}
      {sourcesExpanded && (
        <div className="px-5 pb-3">
          <div className="border-t border-linear-border/50 pt-2 space-y-0.5">
            {stmt.sources.map((s, i) => (
              <div key={i} className="text-[8px] text-linear-text-muted/60 font-mono">
                › {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body text */}
      <div className="px-5 pb-4">
        <p className={`text-[11px] leading-relaxed ${latest ? 'text-linear-text-muted' : 'text-linear-text-muted/70'}`}>
          {stmt.body}
        </p>
      </div>

      {/* Macro snapshot strip */}
      {latest && badges.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {badges.map(b => <MacroBadge key={b.label} label={b.label} value={b.value} />)}
        </div>
      )}

      {/* Tags */}
      {stmt.tags.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1">
          {stmt.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[7px] font-black text-linear-text-muted/60 bg-linear-bg border border-linear-border/30 rounded uppercase tracking-widest"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Previous statements compact list ──────────────────────────────────────────
const PreviousStatements: React.FC<{ statements: AnalystStatement[] }> = ({ statements }) => {
  const [expanded, setExpanded] = useState(false);
  if (statements.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 text-[9px] font-black text-linear-text-muted uppercase tracking-widest hover:text-white transition-colors mb-3"
      >
        {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        {statements.length} Previous Statement{statements.length !== 1 ? 's' : ''}
      </button>

      {expanded && (
        <div className="space-y-2">
          {statements.map(stmt => (
            <div
              key={stmt.id}
              className="bg-linear-bg border border-linear-border/50 rounded-lg px-4 py-2.5"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-linear-text-muted/40">{stmt.id}</span>
                  <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">
                    {fmtDate(stmt.date)}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-linear-text-muted/50">{stmt.title}</span>
              </div>
              <p className="text-[9px] text-linear-text-muted/60 leading-relaxed">
                {stmt.body.slice(0, 140)}…
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main component ──────────────────────────────────────────────────────────────
const AnalystStatementPanel: React.FC = () => {
  const { data } = useMacroData();
  const statements: AnalystStatement[] = data?.analyst_statements ?? [];
  const latest = statements[0] ?? null;
  const history = statements.slice(1);

  if (statements.length === 0) {
    return (
      <div className="bg-linear-card border border-linear-border/50 rounded-2xl px-5 py-4 flex items-center gap-3">
        <MessageSquare size={14} className="text-linear-text-muted/40" />
        <div>
          <div className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Analyst Statement</div>
          <div className="text-[9px] text-linear-text-muted/50 mt-0.5">No analyst statements available — macro data may be stale.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {latest && <StatementCard stmt={latest} latest={true} />}
      {history.length > 0 && <PreviousStatements statements={history} />}
    </div>
  );
};

export default AnalystStatementPanel;
