# Map Usability Deep Dive & Implementation Guide: 2026-03-08

## The Problem
The map is currently a "black box" where data markers exist without spatial context. Environmental features (Parks, Thames, Streets) are suppressed by aggressive CSS filters.

## Final Remediation Specs (Institutional Standard)

### A. index.css Adjustments
Replace the current `.retro-map` blocks with the following refined styles:

```css
/* Optimized Map Container */
.retro-map .leaflet-container {
  background: #0c0c0e !important; /* Linear Carbon */
  filter: none !important; /* REMOVE DESTRUCTIVE FILTERS */
}

/* Subtle Tile Tinting (If needed for Bloomberg feel) */
.retro-map .leaflet-tile-pane {
  opacity: 1;
  filter: saturate(1.1) brightness(0.95); /* Slight pop without crushing blacks */
}

/* Metro Overlay Refinement */
.leaflet-interactive {
  filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));
}
```

### B. Dashboard.tsx (MetroOverlay)
The Metro lines need to be a primary structural element.

```tsx
// frontend/src/pages/Dashboard.tsx -> MetroOverlay style
return {
  color,
  weight: 4.5, // Increased from 3
  opacity: 0.75, // Increased from 0.45
  lineJoin: 'round'
};
```

### C. SPATIAL_CONTEXT Enhancement
Parks and Stations need higher contrast labels.

```tsx
// frontend/src/pages/Dashboard.tsx -> createNodeIcon
// Increase shadow and background contrast
const createNodeIcon = (type: 'hub' | 'park' | 'station', label: string) => {
  const iconColor = type === 'hub' ? '#60a5fa' : type === 'park' ? '#34d399' : '#94a3b8';
  return L.divIcon({
    className: 'node-marker',
    html: `<div class="flex items-center gap-2 bg-black/80 backdrop-blur-xl px-2.5 py-1.5 rounded-lg border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
             <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${iconColor}; box-shadow: 0 0 12px ${iconColor}"></div>
             <span class="text-[10px] font-black text-white uppercase tracking-[0.1em] whitespace-nowrap">${label}</span>
           </div>`,
    iconSize: [120, 30],
    iconAnchor: [15, 15]
  });
};
```

## Summary
By removing the global filters and using a Carbon Grey background, the native dark-green and dark-blue hues of the Carto tiles will become visible, restoring the "Institutional Spatial Intelligence" required by the user.
