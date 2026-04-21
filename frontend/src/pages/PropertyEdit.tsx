/**
 * PropertyEdit.tsx — FE-234 + FE-235
 * Manual property data editor subpage at /property/:id/edit
 * FE-235: All Property type fields are now editable (no dataset fields excluded).
 * PATCH /api/properties/:id with changed fields only.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  Loader2,
  ShieldAlert,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { showToast } from '../utils/toast';
import type { Property } from '../types/property';

interface EditableField {
  key: keyof Property;
  label: string;
  type: 'number' | 'text' | 'select' | 'textarea' | 'date' | 'url';
  group: 'financial' | 'property' | 'location' | 'market' | 'media' | 'rating' | 'notes';
  options?: string[];
  unit?: string;
  placeholder?: string;
  tooltip?: string;
  /** Map option values → Tailwind text color class for the select */
  optionColor?: Record<string, string>;
}

const EDITABLE_FIELDS: EditableField[] = [
  // ── SECTION 1: Financial ──────────────────────────────────────────────────
  { key: 'list_price', label: 'List Price', type: 'number', group: 'financial', unit: '£' },
  { key: 'realistic_price', label: 'Realistic Price', type: 'number', group: 'financial', unit: '£' },
  { key: 'service_charge', label: 'Service Charge', type: 'number', group: 'financial', unit: '£/yr' },
  { key: 'ground_rent', label: 'Ground Rent', type: 'number', group: 'financial', unit: '£/yr' },
  { key: 'council_tax_band', label: 'Council Tax Band', type: 'text', group: 'financial',
    placeholder: 'e.g. D, E' },

  // ── SECTION 2: Property Characteristics ──────────────────────────────────
  { key: 'sqft', label: 'Floor Area', type: 'number', group: 'property', unit: 'sqft' },
  { key: 'bedrooms', label: 'Bedrooms', type: 'number', group: 'property', unit: '',
    placeholder: 'e.g. 2 or 1.5 (decimal for en-suite rooms)' },
  { key: 'bathrooms', label: 'Bathrooms', type: 'number', group: 'property', unit: '',
    placeholder: 'e.g. 1 or 1.5' },
  {
    key: 'epc', label: 'EPC Rating', type: 'select', group: 'property',
    options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    optionColor: { A: 'text-retro-green', B: 'text-retro-green', C: 'text-retro-amber', D: 'text-retro-amber', E: 'text-rose-400', F: 'text-rose-400', G: 'text-rose-400' },
  },
  { key: 'tenure', label: 'Tenure', type: 'select', group: 'property',
    options: ['Freehold', 'Share of Freehold', 'Leasehold'] },
  { key: 'lease_years_remaining', label: 'Lease Years Remaining', type: 'number', group: 'property', unit: 'years' },
  { key: 'floor_level', label: 'Floor Level', type: 'text', group: 'property', placeholder: 'e.g. Ground, 1st, Penthouse' },
  { key: 'dom', label: 'Days on Market', type: 'number', group: 'property', unit: 'days' },

  // ── SECTION 3: Location & Proximity (often wrong in scraped data) ─────────
  { key: 'nearest_tube_distance', label: 'Tube Distance', type: 'number', group: 'location', unit: 'm' },
  { key: 'park_proximity', label: 'Park Proximity', type: 'number', group: 'location', unit: 'm' },
  { key: 'commute_paternoster', label: 'Commute — Paternoster', type: 'number', group: 'location', unit: 'min' },
  { key: 'commute_canada_square', label: 'Commute — Canada Square', type: 'number', group: 'location', unit: 'min' },
  { key: 'waitrose_distance', label: 'Waitrose Distance', type: 'number', group: 'location', unit: 'm' },
  { key: 'whole_foods_distance', label: 'Whole Foods Distance', type: 'number', group: 'location', unit: 'm' },
  { key: 'wellness_hub_distance', label: 'Wellness Hub Distance', type: 'number', group: 'location', unit: 'm' },

  // ── SECTION 4: Market Status ──────────────────────────────────────────────
  {
    key: 'market_status', label: 'Market Status', type: 'select', group: 'market',
    options: ['active', 'under_offer', 'sold_stc', 'sold_completed', 'withdrawn', 'unknown'],
  },
  { key: 'price_reduction_amount', label: 'Price Reduction Amount', type: 'number', group: 'market', unit: '£' },
  { key: 'price_reduction_percent', label: 'Price Reduction %', type: 'number', group: 'market', unit: '%' },
  { key: 'days_since_reduction', label: 'Days Since Reduction', type: 'number', group: 'market', unit: 'days' },
  { key: 'price_reduction_date', label: 'Price Reduction Date', type: 'date', group: 'market' },

  // ── SECTION 5: Rating & Analysis ──────────────────────────────────────────
  {
    key: 'epc_improvement_potential', label: 'EPC Improvement Potential', type: 'select', group: 'rating',
    options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    tooltip: 'Estimated EPC rating after recommended improvements',
    optionColor: { A: 'text-retro-green', B: 'text-retro-green', C: 'text-retro-amber', D: 'text-retro-amber', E: 'text-rose-400', F: 'text-rose-400', G: 'text-rose-400' },
  },
  { key: 'est_capex_requirement', label: 'Est. Capex Requirement', type: 'number', group: 'rating', unit: '£',
    tooltip: 'Estimated capital expenditure for improvements/refurbishment' },
  { key: 'neg_strategy', label: 'Negotiation Strategy', type: 'textarea', group: 'rating',
    placeholder: 'Notes on negotiation approach, vendor motivation, offers already rejected...' },

  // ── SECTION 6: Media ───────────────────────────────────────────────────────
  { key: 'image_url', label: 'Image URL', type: 'url', group: 'media' },
  { key: 'floorplan_url', label: 'Floorplan URL', type: 'url', group: 'media' },
  { key: 'streetview_url', label: 'Street View URL', type: 'url', group: 'media' },
  { key: 'links', label: 'All Links', type: 'textarea', group: 'media',
    placeholder: 'One URL per line or comma-separated' },

  // ── SECTION 7: Notes ──────────────────────────────────────────────────────
  { key: 'analyst_notes', label: 'Your Notes', type: 'textarea', group: 'notes',
    placeholder: 'Strategic observations, viewing notes, follow-up actions...' },
];

// Calculated / server-maintained fields — read-only in the form
const READ_ONLY_FIELDS: { key: keyof Property; label: string }[] = [
  { key: 'address', label: 'Address' },
  { key: 'area', label: 'Area' },
  { key: 'alpha_score', label: 'Alpha Score' },
  { key: 'appreciation_potential', label: 'Appreciation Potential' },
  { key: 'price_per_sqm', label: 'Price per SQM' },
  { key: 'is_value_buy', label: 'Value Buy Flag' },
  { key: 'vetted', label: 'Vetted' },
];

const MARKET_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  under_offer: 'Under Offer',
  sold_stc: 'Sold STC',
  sold_completed: 'Sold Completed',
  withdrawn: 'Withdrawn',
  unknown: 'Unknown',
};

const PropertyEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false); // PED-006: replace window.confirm
  // Track dirty fields: fieldKey → new value (string or number)
  const [dirty, setDirty] = useState<Record<string, string | number>>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['financial']));

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // In demo mode, fetch from demo data
    const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
    const url = isDemo
      ? '/data/demo_master.json'
      : `/api/properties/${id}`;
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data: Property | Property[]) => {
        // demo_master.json is an array — find the property by id
        const props = Array.isArray(data) ? data : [data];
        const prop = props.find(p => p.id === id);
        if (!prop) throw new Error('Property not found');
        setProperty(prop);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load property:', err);
        showToast('Property not found', 'error');
        setLoading(false);
      });
  }, [id]);

  const hasChanges = Object.keys(dirty).length > 0;

  const handleFieldChange = useCallback((key: string, value: string | number) => {
    setDirty(prev => {
      const next = { ...prev };
      if (property && String(property[key as keyof Property] ?? '') === String(value)) {
        // Reverting to original value — remove from dirty
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }, [property]);

  const handleSubmit = useCallback(async () => {
    if (!id || !hasChanges) return;
    setSubmitting(true);
    try {
      const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
      if (isDemo) {
        // In demo mode, just simulate success
        await new Promise(r => setTimeout(r, 800));
        showToast('Property updated (demo mode)', 'success');
        navigate(`/property/${id}`);
        return;
      }
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dirty),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(err.error || 'Update failed');
      }
      showToast('Property updated', 'success');
      navigate(`/property/${id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed — please try again', 'error');
      setSubmitting(false);
    }
  }, [id, dirty, hasChanges, navigate]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      navigate(`/property/${id}`);
    }
  }, [hasChanges, navigate, id]);

  const handleDiscardConfirm = useCallback(() => {
    setShowDiscardConfirm(false);
    navigate(`/property/${id}`);
  }, [navigate, id]);

  const handleDiscardCancel = useCallback(() => {
    setShowDiscardConfirm(false);
  }, []);

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const formatValue = (key: keyof Property, value: unknown): string => {
    if (value === undefined || value === null) return '—';
    if (key === 'list_price' || key === 'realistic_price') {
      return `£${Number(value).toLocaleString()}`;
    }
    if (key === 'service_charge' || key === 'ground_rent') {
      return `£${Number(value).toLocaleString()}/yr`;
    }
    if (key === 'sqft') return `${Number(value).toLocaleString()} sqft`;
    if (key === 'market_status') return MARKET_STATUS_LABELS[String(value)] ?? String(value);
    if (key === 'is_value_buy') return value ? 'Yes' : 'No';
    if (key === 'vetted') return value ? 'Yes' : 'No';
    if (key === 'price_per_sqm') return `£${Number(value).toLocaleString()}/sqm`;
    if (Array.isArray(value)) return (value as string[]).join('\n');
    return String(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-sm text-linear-text-muted">Loading property…</span>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <ShieldAlert className="w-12 h-12 text-retro-green" />
          <h2 className="text-xl font-bold text-white">Property not found</h2>
          <Link to="/properties" className="text-purple-400 hover:text-purple-300 text-sm">← Back to Properties</Link>
        </div>
      </div>
    );
  }

  const groups = [
    { key: 'financial',  label: 'Financial' },
    { key: 'property',  label: 'Property Characteristics' },
    { key: 'location',  label: 'Location & Proximity' },
    { key: 'market',    label: 'Market Status' },
    { key: 'rating',    label: 'Rating & Analysis' },
    { key: 'media',     label: 'Media' },
    { key: 'notes',     label: 'Your Notes' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      {/* Header */}
      <div className="bg-linear-card border-b border-linear-border px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest"
              >
                <ArrowLeft size={12} />
                Back
              </button>
              <span className="text-white/30 text-sm">/</span>
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Edit Property</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight truncate max-w-xl">{property.address}</h1>
          <p className="text-xs text-linear-text-muted mt-0.5">{property.area} · {formatValue('list_price', property.list_price)}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {/* Read-only fields — always visible at top */}
        <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleSection('readonly')}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={12} className="text-amber-400" />
              <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Read-Only Fields</span>
              <span className="text-[9px] text-white/40 font-medium ml-2">calculated — cannot be edited</span>
            </div>
            <span className="text-white/40 text-xs">{openSections.has('readonly') ? '▲' : '▼'}</span>
          </button>
          {openSections.has('readonly') && (
            <div className="px-5 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {READ_ONLY_FIELDS.map(f => (
                  <div key={f.key} className="bg-[#0f1923] border border-white/5 rounded-lg p-3">
                    <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-1">{f.label}</div>
                    <div className="text-xs font-medium text-white/60 flex items-center gap-1.5 group relative">
                      {formatValue(f.key, property[f.key as keyof Property])}
                      <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-[#0f1923] border border-white/10 rounded px-2 py-1 text-[9px] text-white/60 whitespace-nowrap z-10">
                        This field is calculated — request enrichment to update
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editable sections */}
        {groups.filter(g => g.key !== 'notes').map(group => {
          const fields = EDITABLE_FIELDS.filter(f => f.group === group.key);
          if (fields.length === 0) return null;
          return (
            <div key={group.key} className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleSection(group.key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">{group.label}</span>
                <span className="text-white/40 text-xs">{openSections.has(group.key) ? '▲' : '▼'}</span>
              </button>
              {openSections.has(group.key) && (
                <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields.map(field => {
                    const currentValue = property[field.key] as string | number | undefined;
                    const dirtyValue = dirty[field.key];
                    const displayValue = dirtyValue !== undefined ? String(dirtyValue) : String(currentValue ?? '');
                    const isDirty = field.key in dirty;

                    return (
                      <div key={field.key} className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">
                          {field.label}
                          {field.unit && <span className="text-white/30 ml-1">({field.unit})</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            value={displayValue}
                            onChange={e => handleFieldChange(field.key, e.target.value)}
                            className={[
                              'bg-[#0f1923] border rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors',
                              isDirty ? 'border-amber-500/60' : 'border-white/10',
                              'focus:border-purple-500/60',
                              field.optionColor ? field.optionColor[displayValue] ?? 'text-white' : 'text-white',
                            ].join(' ')}
                          >
                            <option value="">— not set —</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>{MARKET_STATUS_LABELS[opt] ?? opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={displayValue}
                            onChange={e => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                            rows={3}
                            className={[
                              'bg-[#0f1923] border rounded-lg px-3 py-2 text-sm text-white font-medium outline-none transition-colors placeholder:text-white/20 resize-none custom-scrollbar',
                              isDirty ? 'border-amber-500/60' : 'border-white/10',
                              'focus:border-purple-500/60',
                            ].join(' ')}
                          />
                        ) : (
                          <div className="relative">
                            <input
                              type={field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : field.type}
                              value={displayValue}
                              step={
                                field.type !== 'number' ? undefined
                                  : field.key === 'bedrooms' || field.key === 'bathrooms' ? '0.5'
                                  : field.key === 'price_reduction_percent' ? '0.5'
                                  : field.group === 'financial' || field.key === 'est_capex_requirement' ? '100'
                                  : '1'
                              }
                              min={field.type === 'number' ? 0 : undefined}
                              onChange={e => handleFieldChange(
                                field.key,
                                field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                              )}
                              placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                              className={[
                                'w-full bg-[#0f1923] border rounded-lg px-3 py-2 text-sm text-white font-medium outline-none transition-colors placeholder:text-white/20',
                                isDirty ? 'border-amber-500/60' : 'border-white/10',
                                'focus:border-purple-500/60',
                              ].join(' ')}
                            />
                            {field.type === 'url' && displayValue && (
                              <a
                                href={displayValue}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-linear-text-muted hover:text-white transition-colors"
                                onClick={e => e.stopPropagation()}
                              >
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FE-235: Your Notes — dedicated section (clearly labelled as user notes) */}
      <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection('notes')}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText size={12} className="text-blue-400" />
            <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Your Notes</span>
          </div>
          <span className="text-white/40 text-xs">{openSections.has('notes') ? '▲' : '▼'}</span>
        </button>
        {openSections.has('notes') && (
          <div className="px-5 pb-5">
            {(() => {
              const field = EDITABLE_FIELDS.find(f => f.key === 'analyst_notes');
              if (!field) return null;
              const currentValue = (property as unknown as Record<string, unknown>)[field.key] as string | undefined;
              const dirtyValue = dirty[field.key];
              const displayValue = dirtyValue !== undefined ? String(dirtyValue) : String(currentValue ?? '');
              const isDirty = field.key in dirty;
              return (
                <textarea
                  value={displayValue}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder ?? 'Strategic observations, viewing notes, follow-up actions...'}
                  rows={5}
                  className={[
                    'w-full bg-[#0f1923] border rounded-xl px-4 py-3 text-sm text-white font-medium outline-none transition-colors placeholder:text-white/20 resize-none custom-scrollbar',
                    isDirty ? 'border-amber-500/60' : 'border-white/10',
                    'focus:border-purple-500/60',
                  ].join(' ')}
                />
              );
            })()}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-[#0a0e14]/95 backdrop-blur border-t border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                <AlertCircle size={10} />
                {Object.keys(dirty).length} change{Object.keys(dirty).length !== 1 ? 's' : ''} unsaved
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {showDiscardConfirm ? (
              <>
                <span className="text-[10px] text-linear-text-muted">Discard changes?</span>
                <button
                  onClick={handleDiscardCancel}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-xs font-bold rounded-lg transition-colors"
                >
                  Keep Editing
                </button>
                <button
                  onClick={handleDiscardConfirm}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg transition-colors"
                >
                  Discard
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  <X size={12} />
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!hasChanges || submitting}
                  className={[
                    'flex items-center gap-1.5 px-5 py-2 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                    hasChanges && !submitting
                      ? 'bg-retro-green hover:bg-retro-green/90 shadow-lg shadow-retro-green/20'
                      : 'bg-retro-green/40',
                  ].join(' ')}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save size={12} />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyEdit;
