// FE-279: MPC Probability Matrix — Cut/Hold/Raise probability bars for next 4 MPC meetings
import React, { useMemo, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';
import Tooltip from './Tooltip';
import PredictionAccuracyPanel from './PredictionAccuracyPanel';

interface ProbabilityBarProps {
  cut: number;
  hold: number;
  raise: number;
  compact?: boolean;
}

const ProbabilityBar: React.FC<ProbabilityBarProps> = ({ cut, hold, raise, compact = false }) => {
  const total = cut + hold + raise;
  if (total === 0) return <div className="h-1.5 bg-linear-bg rounded" />;
  
  const cutPct = (cut / total) * 100;
  const holdPct = (hold / total) * 100;
  const raisePct = (raise / total) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-[8px]">
        <span className="text-retro-green font-bold">{cutPct.toFixed(0)}%</span>
        <span className="text-linear-text-muted">|</span>
        <span className="text-white font-bold">{holdPct.toFixed(0)}%</span>
        <span className="text-linear-text-muted">|</span>
        <span className="text-retro-rose font-bold">{raisePct.toFixed(0)}%</span>
      </div>
    );
  }

  return (
    <div className="h-1.5 bg-linear-bg rounded-full overflow-hidden flex">
      {cutPct > 0 && (
        <div 
          className="bg-retro-green transition-all" 
          style={{ width: `${cutPct}%` }} 
          title={`Cut: ${cutPct.toFixed(1)}%`}
        />
      )}
      {holdPct > 0 && (
        <div 
          className="bg-gray-500 transition-all" 
          style={{ width: `${holdPct}%` }} 
          title={`Hold: ${holdPct.toFixed(1)}%`}
        />
      )}
      {raisePct > 0 && (
        <div 
          className="bg-retro-rose transition-all" 
          style={{ width: `${raisePct}%` }} 
          title={`Raise: ${raisePct.toFixed(1)}%`}
        />
      )}
    </div>
  );
};

interface MeetingRowProps {
  meeting: {
    meeting_date: string;
    meeting_name: string;
    implied_rate: number;
    no_change_prob: number;
    cut_25bp_prob: number;
    raise_25bp_prob: number;
    expected_change_bp?: number;
    source?: string;
    volume_total?: number | null;
  };
  onExpand?: () => void;
  isExpanded?: boolean;
}

const MeetingRow: React.FC<MeetingRowProps> = ({ meeting, onExpand, isExpanded }) => {
  const confidence = useMemo(() => {
    const vol = meeting.volume_total ?? 0;
    if (vol > 100000) return { level: 'high', color: '#22c55e' };
    if (vol > 25000) return { level: 'medium', color: '#f59e0b' };
    return { level: 'low', color: '#a1a1aa' };
  }, [meeting.volume_total]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <tr className="border-b border-linear-border/30 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={onExpand}>
        <td className="py-2 px-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-white">{meeting.meeting_name}</span>
            {isExpanded ? (
              <ChevronDown size={10} className="text-linear-text-muted" />
            ) : (
              <ChevronDown size={10} className="text-linear-text-muted transform rotate-[-90deg]" />
            )}
          </div>
          <div className="text-[8px] text-linear-text-muted font-mono">{formatDate(meeting.meeting_date)}</div>
        </td>
        <td className="py-2 px-2">
          <ProbabilityBar 
            cut={meeting.cut_25bp_prob} 
            hold={meeting.no_change_prob} 
            raise={meeting.raise_25bp_prob} 
          />
          <div className="flex items-center gap-3 mt-0.5 text-[8px]">
            <span className="text-retro-green">{meeting.cut_25bp_prob > 0 ? `${(meeting.cut_25bp_prob * 100).toFixed(0)}%` : '—'}</span>
            <span className="text-gray-400">{meeting.no_change_prob > 0 ? `${(meeting.no_change_prob * 100).toFixed(0)}%` : '—'}</span>
            <span className="text-retro-rose">{meeting.raise_25bp_prob > 0 ? `${(meeting.raise_25bp_prob * 100).toFixed(0)}%` : '—'}</span>
          </div>
        </td>
        <td className="py-2 px-2 text-right">
          <span className="text-[10px] font-bold text-white">{meeting.implied_rate.toFixed(2)}%</span>
        </td>
        <td className="py-2 px-2">
          <div className="flex items-center justify-end gap-1">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: confidence.color }} />
            <span className="text-[8px] uppercase font-bold" style={{ color: confidence.color }}>
              {confidence.level}
            </span>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-linear-border/30">
          <td colSpan={4} className="py-2 px-3 bg-blue-500/5">
            <div className="space-y-1.5 text-[9px]">
              <div className="flex items-center justify-between">
                <span className="text-linear-text-muted">Implied Rate:</span>
                <span className="text-white font-bold">{meeting.implied_rate.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-linear-text-muted">Expected Change:</span>
                <span className={meeting.meeting_date.includes('2026-05') ? 'text-gray-400' : 'text-white'}>
                  {meeting.meeting_date.includes('2026-05') ? 'No change' : `${meeting.meeting_date.includes('raise') || meeting.raise_25bp_prob > meeting.cut_25bp_prob ? '+' : ''}${meeting.expected_change_bp ?? 0}bp`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-linear-text-muted">Volume:</span>
                <span className="text-white">
                  {meeting.volume_total ? `$${(meeting.volume_total / 1000).toFixed(0)}K` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-linear-text-muted">Source:</span>
                <span className="text-white">{meeting.source || 'SONIA + Polymarket'}</span>
              </div>
              <div className="pt-1 border-t border-linear-border/30 flex items-center justify-between">
                <span className="text-linear-text-muted">Market:</span>
                <a 
                  href="https://polymarket.com/event/bank-of-england-decision-in-april" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-blue-400 hover:text-blue-300"
                >
                  Polymarket <ExternalLink size={8} />
                </a>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const MPCProbabilityMatrix: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { data } = useMacroData();
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [showAccuracy, setShowAccuracy] = useState(false);

  // Get forward curve data or build from boe_rate_probabilities
  const meetings = useMemo(() => {
    const fc = data?.forward_curve ?? [];
    if (fc.length > 0) {
      return fc.slice(0, compact ? 1 : 4).map(m => ({
        ...m,
        no_change_prob: m.no_change_prob ?? 0.6,
        cut_25bp_prob: m.cut_25bp_prob ?? 0.2,
        raise_25bp_prob: m.raise_25bp_prob ?? 0.2,
        volume_total: data?.prediction_markets?.boe_decisions?.[0]?.volume_total,
      }));
    }

    // Fallback: build from boe_rate_probabilities
    const brp = data?.boe_rate_probabilities;
    if (!brp) return [];

    const nextMeeting = brp.next_rate_change;
    return [
      {
        meeting_date: nextMeeting?.meeting?.split(',')[0] || '2026-05-07',
        meeting_name: nextMeeting?.meeting || 'May 2026',
        implied_rate: nextMeeting?.expected_new_rate ?? brp.base_rate ?? 3.75,
        no_change_prob: nextMeeting?.probability ?? 0.6,
        cut_25bp_prob: 0.2,
        raise_25bp_prob: 0.2,
        volume_total: data?.prediction_markets?.boe_decisions?.[0]?.volume_total,
      },
    ];
  }, [data?.forward_curve, data?.boe_rate_probabilities, data?.prediction_markets, compact]);

  if (meetings.length === 0) {
    return (
      <div className="p-3 bg-linear-bg rounded-xl border border-linear-border">
        <div className="text-[10px] text-linear-text-muted text-center">MPC probability data unavailable</div>
      </div>
    );
  }

  const nextMeeting = meetings[0];

  if (compact) {
    return (
      <Tooltip 
        content={`Next MPC: ${nextMeeting.meeting_name} — ${(nextMeeting.no_change_prob * 100).toFixed(0)}% hold probability`}
        methodology="Probabilities from SONIA forward curve + Polymarket composite. Confidence based on market volume."
      >
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold text-linear-text-muted uppercase">MPC</span>
          <span className="text-[9px] text-white font-mono">{nextMeeting.meeting_name.split(' ')[0]}</span>
          <ProbabilityBar 
            cut={nextMeeting.cut_25bp_prob} 
            hold={nextMeeting.no_change_prob} 
            raise={nextMeeting.raise_25bp_prob} 
            compact 
          />
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">MPC Probability Matrix</h3>
          </div>
          <div className="flex items-center gap-2 text-[8px]">
            <span className="text-retro-green">● Cut</span>
            <span className="text-gray-400">● Hold</span>
            <span className="text-retro-rose">● Raise</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-linear-border/50">
              <th className="text-left text-[8px] font-bold text-linear-text-muted uppercase tracking-widest py-1.5 px-2">Meeting</th>
              <th className="text-left text-[8px] font-bold text-linear-text-muted uppercase tracking-widest py-1.5 px-2">Cut / Hold / Raise</th>
              <th className="text-right text-[8px] font-bold text-linear-text-muted uppercase tracking-widest py-1.5 px-2">Implied</th>
              <th className="text-right text-[8px] font-bold text-linear-text-muted uppercase tracking-widest py-1.5 px-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((meeting) => (
              <MeetingRow
                key={meeting.meeting_date}
                meeting={meeting}
                isExpanded={expandedMeeting === meeting.meeting_date}
                onExpand={() => setExpandedMeeting(
                  expandedMeeting === meeting.meeting_date ? null : meeting.meeting_date
                )}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-linear-border/50 bg-linear-card/30 flex items-center justify-between">
        <button 
          onClick={() => setShowAccuracy(true)}
          className="text-[8px] text-linear-text-muted hover:text-white transition-colors"
        >
          View prediction accuracy →
        </button>
        <div className="flex items-center gap-1 text-[8px] text-linear-text-muted">
          <span>Source:</span>
          <span className="text-white">SONIA + Polymarket</span>
        </div>
      </div>

      {/* Prediction Accuracy Modal */}
      {showAccuracy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAccuracy(false)}>
          <div className="bg-linear-card border border-linear-border rounded-xl max-w-md w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <PredictionAccuracyPanel onClose={() => setShowAccuracy(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MPCProbabilityMatrix;
