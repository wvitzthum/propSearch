
PROPERTY EDIT FORM — UX AUDIT
=============================
File: frontend/src/pages/PropertyEdit.tsx
Route: /property/:id/edit
Date: 2026-04-16
Auditor: ui_ux_qa

CONTEXT
-------
PropertyEdit is a manual data editor form at /property/:id/edit with 7 sections:
Financial, Property Characteristics, Location & Proximity, Market Status,
Rating & Analysis, Media, and Your Notes. Uses accordion sections with
dirty tracking (amber border on changed fields) and a sticky save footer.

FINDINGS
--------

[PED-001] 🔴 CRITICAL: Number inputs accept negative values — no min validation
  All 20+ number-type inputs (sqft, bedrooms, bathrooms, service_charge,
  ground_rent, list_price, realistic_price, etc.) accept negative numbers.
  
  User can type -999 for "Floor Area" or -5 for "Bedrooms".
  The handleFieldChange callback has no validation:
    field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
  
  Fix: Add min="0" to ALL number inputs. For financial fields (prices),
  also consider step="1000" to allow arrow-key increments of £1000.
  
  Additionally, parseFloat('') = NaN, then || 0 converts to 0.
  This means clearing a number field and saving creates value 0 — not null.
  For financial fields this is particularly bad: service_charge: 0 looks
  like a real value, not "unknown/not set".

[PED-002] 🟠 HIGH: Market status options show raw database slugs — user can't read them
  Line 73:
    options: ['active', 'under_offer', 'sold_stc', 'sold_completed', 'withdrawn', 'unknown'],
  
  The select renders these raw slugs directly as option labels.
  A user sees 'sold_stc' and 'sold_completed' in the dropdown — meaningless.
  The MARKET_STATUS_LABELS map (line 115) is defined but NOT used in the select.
  
  Fix: Use MARKET_STATUS_LABELS[opt] in the option label:
    <option value={opt}>{MARKET_STATUS_LABELS[opt] ?? opt}</option>
  
  This is a one-line fix — the labels are already defined.

[PED-003] 🟠 HIGH: Price/number inputs allow sub-pound decimal values
  list_price and realistic_price are type='number' but allow values like
  £1,234,567.89. UK convention is whole pounds for property prices.
  Adding step="1000" (or at minimum step="1") to these fields prevents
  accidental sub-pound entries while allowing arrow-key nudging.
  
  Similarly: price_reduction_amount should use step="100" or step="1000".
  ground_rent and service_charge: step="1" (whole pounds).

[PED-004] 🟡 MEDIUM: Date input for price_reduction_date is type='date' but
  displayValue is String(value) — raw ISO date string shown (e.g. "2024-03-15")
  The date input correctly uses type="date" on the <input>, but the initial
  value when the field has data is an ISO string like "2024-03-15".
  For a date input, the value must be in YYYY-MM-DD format — which it IS from
  the schema. So this may actually work correctly with type="date".
  NOTE: needs visual verification — if it works, no action needed.

[PED-005] 🟡 MEDIUM: Dirty tracking edge case with null values
  handleFieldChange (line 169):
    if (String(property[key] ?? '') === String(value))
  When original value is null/undefined and user clears the field:
    - original: String(null ?? '') = 'null'  (wait, null ?? '' → '')
    - value (empty input): ''
    - String('') = ''
    - Comparison: 'null' !== '' → marks as dirty ✓
  
  But when original is null and user enters '0':
    - original: String(null ?? '') = ''
    - value: parseFloat('0') = 0
    - String(0) = '0'
    - '' !== '0' → dirty ✓ (correct)
  
  The edge case: original is 0, user clears → stores 0 again:
    - String(0) === String(parseFloat('')) = '0' === '0' → NOT dirty
    This is correct — clearing and setting to 0 are the same outcome.
  
  However: original null, user enters '' (clears) then saves:
    - dirty: '' → submit body: { field: '' }
    - Server receives empty string, not null
  This may be acceptable depending on backend handling. Flag for verification.

[PED-006] 🟡 MEDIUM: Cancel button has no unsaved-changes confirmation inline
  The cancel button (line 479) uses window.confirm() for unsaved changes.
  This is jarring: a browser native dialog in a styled form.
  The sticky footer already has a dirty count badge ("3 changes unsaved")
  but clicking Cancel still throws a native alert.
  
  Fix: Replace window.confirm with an inline confirmation in the sticky footer:
    - When hasChanges is true, show an inline "Discard?" mini-dialog
    - Or use a small popover/modal component already in the design system
  This would be consistent with the rest of the UI.

[PED-007] 🟡 MEDIUM: Form layout — number inputs too narrow for large prices
  The grid uses 2-column layout (sm:grid-cols-2) with 16px gap.
  For list_price at £1,250,000 the input may overflow or truncate.
  The address field at the top (h1) uses truncate + max-w-xl but form inputs
  have no such protection.
  
  Fix: Add overflow:hidden + text-overflow:ellipsis to number inputs
  or ensure the grid column min-width is sufficient for £1M+ values.

[PED-008] 🟡 MEDIUM: URL input — no validation feedback
  image_url, floorplan_url, streetview_url use type='url'.
  Browsers validate on form submission, but not on input.
  An invalid URL shows no inline error until Save is attempted.
  Consider adding a simple regex check on blur or on change for URLs.

[PED-009] 🟢 LOW: Accordion section for "Your Notes" is outside the main form grid
  Lines 429–465: the notes section is rendered OUTSIDE the
  <div className="max-w-4xl mx-auto px-6 py-8 space-y-4"> wrapper.
  It sits below the form but above the sticky footer.
  The "Your Notes" section may not align visually with the form sections above.

[PED-010] 🟢 LOW: No success state after save
  After a successful PATCH, the form navigates back to /property/:id.
  There is no inline success feedback on the form itself.
  The showToast confirms save, but the transition is immediate (navigate()).
  Consider a brief 300ms delay with a success state before navigating.

SUMMARY
-------
PED-001 is a showstopper — negative bedrooms, negative sqft, negative prices
are nonsensical and could corrupt data. Fix with min="0" on all number inputs.

PED-002 is a simple fix with high impact — market status slugs should use
the already-defined MARKET_STATUS_LABELS map.

PED-003 is a minor but important polish fix for financial fields.

PED-004 through PED-010 are medium/low improvements.

Total new tasks to create: 3
