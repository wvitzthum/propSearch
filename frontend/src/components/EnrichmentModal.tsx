/**
 * EnrichmentModal.tsx — FE-237
 * Modal for requesting data enrichment on a specific property.
 * Sends POST /api/enrichment-requests with selected fields + optional notes.
 * Warns if a pending request already exists for this property.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckSquare, Square, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { showToast } from '../utils/toast';

interface EnrichmentModalProps {
  propertyId: string;
  propertyAddress: string;
  isOpen: boolean;
  onClose: () => void;
  onRequested?: () => void; // called after successful request
}

// Fields the analyst can re-evaluate
const ENRICHMENT_FIELDS: { key: string; label: string; desc: string }[] = [
  { key: 'alpha_score',        label: 'Alpha Score',          desc: 'Re-score based on current market data' },
  { key: 'appreciation_potential', label: 'Appreciation Potential', desc: 'Update growth projections with latest HPI' },
  { key: 'realistic_price',    label: 'Realistic Price',     desc: 'Revise estimate using recent comparables' },
  { key: 'area_benchmarks',    label: 'Area Benchmarks',      desc: 'Refresh area performance metrics' },
  { key: 'epc',               label: 'EPC Rating',           desc: 'Re-assess energy performance certificate' },
  { key: 'nearest_tube_distance', label: 'Tube Distance',   desc: 'Verify nearest station proximity' },
  { key: 'market_status',     label: 'Market Status',       desc: 'Confirm current offer/listing status' },
  { key: 'price_history',     label: 'Price History',       desc: 'Re-scrape listing for price changes' },
  { key: 'tenure',            label: 'Tenure Details',       desc: 'Confirm lease/freehold and years remaining' },
];

const EnrichmentModal: React.FC<EnrichmentModalProps> = ({
  propertyId,
  propertyAddress,
  isOpen,
  onClose,
  onRequested,
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [checkingPending, setCheckingPending] = useState(false);

  // Escape key closes the modal — reliable regardless of React event delegation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Check for existing pending request on open
  useEffect(() => {
    if (!isOpen) return;
    setCheckingPending(true);
    const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
    if (isDemo) {
      setHasPending(false);
      setCheckingPending(false);
      return;
    }
    fetch(`/api/enrichment-requests?property_id=${propertyId}&status=pending`)
      .then(r => r.ok ? r.json() : { requests: [] })
      .then((data: { requests?: unknown[] }) => {
        setHasPending(Array.isArray(data.requests) && data.requests.length > 0);
      })
      .catch(() => setHasPending(false))
      .finally(() => setCheckingPending(false));
  }, [isOpen, propertyId]);

  const toggleField = useCallback((key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selected.size === 0) {
      showToast('Select at least one field to enrich', 'error');
      return;
    }
    setSubmitting(true);
    const body = {
      propertyId,
      fields: Array.from(selected),
      notes: notes.trim(),
      requestedAt: new Date().toISOString(),
    };
    try {
      const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
      if (isDemo) {
        await new Promise(r => setTimeout(r, 1000));
        showToast('Enrichment requested — the analyst will review this property', 'success');
        onRequested?.();
        onClose();
        return;
      }
      const res = await fetch('/api/enrichment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Request failed');
      showToast('Enrichment requested — the analyst will review this property', 'success');
      onRequested?.();
      onClose();
    } catch {
      showToast('Enrichment request failed — please try again', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [selected, notes, propertyId, onClose, onRequested]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="enrichment-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-linear-card border border-linear-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'fadeIn 0.15s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-linear-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare size={14} className="text-blue-400" />
              <h2 className="text-[11px] font-black text-white uppercase tracking-widest">
                Request Enrichment
              </h2>
            </div>
            <p className="text-[10px] text-linear-text-muted truncate max-w-xs">{propertyAddress}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-linear-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Pending warning */}
        {hasPending && !checkingPending && (
          <div className="mx-6 mt-4 px-4 py-3 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-start gap-2">
            <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-300 leading-relaxed">
              A pending enrichment request already exists for this property. Submitting again will add to the queue.
            </p>
          </div>
        )}

        {/* Field checklist */}
        <div className="px-6 py-4">
          <p className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-3">
            Select fields to re-analyse
          </p>
          <div className="space-y-2">
            {ENRICHMENT_FIELDS.map(field => {
              const isChecked = selected.has(field.key);
              return (
                <button
                  key={field.key}
                  onClick={() => toggleField(field.key)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                    isChecked
                      ? 'bg-blue-500/10 border-blue-500/30 text-white'
                      : 'bg-transparent border-white/10 text-linear-text-muted hover:border-white/20 hover:text-white/80'
                  }`}
                >
                  {isChecked
                    ? <CheckSquare size={13} className="text-blue-400 mt-0.5 shrink-0" />
                    : <Square size={13} className="text-linear-accent mt-0.5 shrink-0" />
                  }
                  <div>
                    <div className="text-[11px] font-bold">{field.label}</div>
                    <div className="text-[9px] text-white/40 mt-0.5">{field.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="px-6 pb-4">
          <p className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-2">
            Notes <span className="text-white/30 font-normal">(optional)</span>
          </p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any context that would help the analyst — price guide, viewing notes, known issues..."
            rows={3}
            className="w-full bg-[#0f1923] border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-white placeholder:text-white/20 outline-none focus:border-blue-500/40 transition-colors resize-none custom-scrollbar"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-linear-border bg-black/20">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-[10px] font-bold text-linear-text-muted hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selected.size === 0}
            className="px-4 py-2 text-[10px] font-black text-black bg-blue-400 hover:bg-blue-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Send size={11} />
            )}
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default EnrichmentModal;
