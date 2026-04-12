# Frontend Null Safety Patterns
**Purpose:** Prevent runtime crashes when datasets are shallow/incomplete

---

## The Problem

When property data is incomplete (shallow dataset, API returning partial data), fields like `price`, `realistic_price`, `list_price` are `null` or `undefined`.

Calling methods on null values causes runtime crashes:
```typescript
// CRASHES if property.price is null
<span>{property.price.toLocaleString()}</span>

// CRASHES if realistic_price is null  
<span>£{Math.round(property.realistic_price * 0.95).toLocaleString()}</span>
```

---

## Safe Formatting Utility

Create `frontend/src/utils/format.ts`:

```typescript
/**
 * Format a number as GBP currency, with null safety
 */
export const fmtGBP = (
  value: number | null | undefined,
  options: { fallback?: string; compact?: boolean } = {}
): string => {
  const { fallback = '—', compact = false } = options;
  
  if (value == null) return fallback;
  
  if (compact && value >= 1_000_000) {
    return `£${(value / 1_000_000).toFixed(1)}M`;
  }
  if (compact && value >= 1_000) {
    return `£${(value / 1_000).toFixed(0)}K`;
  }
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format a number with null safety
 */
export const fmtNum = (
  value: number | null | undefined,
  fallback = '—'
): string => {
  if (value == null) return fallback;
  return value.toLocaleString('en-GB');
};

/**
 * Format a percentage with null safety
 */
export const fmtPct = (
  value: number | null | undefined,
  options: { fallback?: string; decimals?: number } = {}
): string => {
  const { fallback = '—', decimals = 1 } = options;
  if (value == null) return fallback;
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

/**
 * Safe getter for potentially null object properties
 */
export const get = <T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  fallback: T[K] | null = null
): T[K] | null => {
  if (obj == null) return fallback;
  return obj[key] ?? fallback;
};
```

---

## Usage Examples

### Before (Unsafe)
```tsx
<span>£{property.price.toLocaleString()}</span>
<span>£{Math.round(property.realistic_price * 0.95).toLocaleString()}</span>
<div>{property.name.toUpperCase()}</div>
```

### After (Safe)
```tsx
<span>{fmtGBP(property.price)}</span>
<span>{fmtGBP(property.realistic_price ? Math.round(property.realistic_price * 0.95) : null)}</span>
<div>{property.name?.toUpperCase() ?? 'Unnamed'}</div>
```

---

## Component-Level Guards

### Guard at the top level
```tsx
const PropertyDetail = ({ property }: { property: Property | null }) => {
  // Early return for missing data
  if (!property) {
    return (
      <div className="p-4 text-center text-linear-text-muted">
        No property data available
      </div>
    );
  }
  
  // ... rest of component
};
```

### Guard for optional nested data
```tsx
const PropertyCard = ({ property }) => {
  const price = property?.realistic_price ?? property?.list_price;
  
  return (
    <div>
      {price ? fmtGBP(price) : 'Price pending'}
    </div>
  );
};
```

---

## Arithmetic Operations

### Before (Unsafe)
```tsx
// If realistic_price is null, this is NaN
const negotiation = property.list_price - property.realistic_price;
const discount = (negotiation / property.list_price) * 100;
```

### After (Safe)
```tsx
// Use nullish coalescing for defaults
const realisticPrice = property.realistic_price ?? property.list_price ?? 0;
const listPrice = property.list_price ?? 0;

const negotiation = listPrice - realisticPrice;
const discount = listPrice > 0 ? (negotiation / listPrice) * 100 : 0;
```

---

## Property List Handling

When mapping over arrays of properties:
```tsx
// Before - crashes if any property has null price
{properties.map(p => (
  <div key={p.id}>{p.price.toLocaleString()}</div>
))}

// After - safe with optional chaining
{properties.map(p => (
  <div key={p.id}>{fmtGBP(p.price)}</div>
))}

// Or filter out incomplete
{properties.filter(p => p.price != null).map(p => (
  <div key={p.id}>{fmtGBP(p.price)}</div>
))}
```

---

## TypeScript Type Guards

```typescript
interface SafeProperty {
  price: number | null;
  realistic_price: number | null;
  list_price: number | null;
  name: string | null;
}

const isValidProperty = (p: any): p is SafeProperty => {
  return (
    typeof p === 'object' &&
    p !== null
  );
};

// Usage
const PropertyCard = ({ data }: { data: any }) => {
  if (!isValidProperty(data)) {
    return <div>Invalid property data</div>;
  }
  // TypeScript now knows data.price is number | null
  return <div>{fmtGBP(data.price)}</div>;
};
```

---

## ESLint Rules to Add

```json
{
  "rules": {
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-unnecessary-condition": "warn",
    "no-prototype-builtins": "error"
  }
}
```

---

## Quick Reference Card

| Operation | Unsafe | Safe |
|-----------|--------|------|
| Currency | `{p.price.toLocaleString()}` | `{fmtGBP(p.price)}` |
| Percentage | `{rate.toFixed(2)}%` | `{rate != null ? `${rate.toFixed(2)}%` : '—'}` |
| Uppercase | `{name.toUpperCase()}` | `{name?.toUpperCase() ?? 'N/A'}` |
| Math | `{price * 1.1}` | `{(price ?? 0) * 1.1}` |
| Array method | `{prices.map(...)}` | `{prices.filter(p => p != null).map(...)}` |
| Property access | `{obj.prop.nested}` | `{obj?.prop?.nested ?? '—'}` |

---

## Summary

1. **Never assume data exists** - always use `??` or `?.` 
2. **Create utility functions** for common formatting operations
3. **Add component guards** - return early if required data is missing
4. **Use TypeScript types** - make nullability explicit
5. **Test with empty data** - verify graceful degradation
