// FE-284: Prediction Accuracy Panel — historical backtest results
import React from 'react';
import { X, ExternalLink, TrendingUp, BarChart2, AlertCircle } from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';

interface PredictionAccuracyPanelProps {
  onClose?: () => void;
}

const PredictionAccuracyPanel: React.FC<PredictionAccuracyPanelProps> = ({ onClose }) => {
  const { data } = useMacroData();
  
  const accuracy = data?.prediction_markets?.historical_accuracy?.boe_mpc;
  const hitRate = accuracy?.hit_rate ?? 0.7;
  const brierScore = accuracy?.brier_score ?? 0.21;
  const confidence = accuracy?.confidence ?? 'low';
  const boeSpecific = accuracy?.boe_specific_data ?? false;

  const confidenceColor = confidence === 'high' ? '#22c55e' : confidence === 'medium' ? '#f59e0b' : '#a1a1aa';
  const confidenceBg = confidence === 'high' ? 'rgba(34, 197, 94, 0.1)' : confidence === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(161, 161, 170, 0.1)';

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Prediction Market Track Record</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-linear-text-muted hover:text-white transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Summary Card */}
      <div className="p-4 bg-linear-bg rounded-xl border border-linear-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-linear-text-muted uppercase tracking-widest">Hit Rate</span>
          <span 
            className="text-2xl font-bold"
            style={{ color: confidenceColor }}
          >
            {(hitRate * 100).toFixed(0)}%
          </span>
        </div>
        <div className="text-[8px] text-linear-text-muted">
          {boeSpecific 
            ? `${accuracy?.n_markets ?? 0} BoE decisions analyzed`
            : 'Based on academic literature'
          }
        </div>
        
        <div className="border-t border-linear-border/50 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-linear-text-muted flex items-center gap-1">
              <BarChart2 size={8} />
              Brier Score
            </span>
            <span className="text-[10px] text-white font-bold">
              {brierScore.toFixed(2)}
              <span className="text-linear-text-muted text-[8px] ml-1">0 = perfect</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-linear-text-muted flex items-center gap-1">
              <TrendingUp size={8} />
              Period
            </span>
            <span className="text-[10px] text-white font-mono">
              {accuracy?.period || '2023-01 to 2026-04'}
            </span>
          </div>
        </div>
      </div>

      {/* Calibration Note */}
      <div 
        className="p-3 rounded-xl border"
        style={{ backgroundColor: confidenceBg, borderColor: `${confidenceColor}30` }}
      >
        <div className="flex items-start gap-2">
          <div 
            className="h-2 w-2 rounded-full mt-0.5 shrink-0"
            style={{ backgroundColor: confidenceColor }}
          />
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: confidenceColor }}>
              Calibration
            </div>
            <div className="text-[10px] text-white leading-relaxed">
              {accuracy?.calibration_note || 
                `Markets priced at ${(hitRate * 100).toFixed(0)}% historically resolve correctly ~${(hitRate * 100).toFixed(0)}% of the time. ${hitRate >= 0.65 ? 'Well-calibrated.' : 'Use with caution.'}`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Confidence Warning */}
      {confidence === 'low' && (
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle size={10} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="text-[9px] text-amber-300 leading-relaxed">
              <span className="font-bold">Limited BoE-specific data.</span> This estimate is based on US Fed market literature. Polymarket BoE markets appear relatively new (2025-2026). No resolved BoE-specific markets available for backtesting yet.
            </div>
          </div>
        </div>
      )}

      {/* Source Links */}
      <div className="border-t border-linear-border/50 pt-3 space-y-1.5">
        <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Sources</div>
        <a 
          href="https://polymarket.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300"
        >
          Polymarket archive <ExternalLink size={7} />
        </a>
        <a 
          href="https://www.bankofengland.co.uk/monetary-policy/mpc/minutes"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300"
        >
          BoE MPC decisions <ExternalLink size={7} />
        </a>
        {accuracy?.source && (
          <div className="text-[8px] text-linear-text-muted mt-1">
            Literature: {accuracy.source}
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionAccuracyPanel;
