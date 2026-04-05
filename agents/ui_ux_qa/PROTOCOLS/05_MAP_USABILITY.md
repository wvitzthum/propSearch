# Map Usability Reference
*Reference from: agents/ui_ux_qa/MAP_USABILITY_GUIDE.md*

## Map Stack
- Leaflet (OpenStreetMap tiles)
- Custom dark theme (Bloomberg/Linear aesthetic)
- GeoJSON markers for properties

## Aesthetic Standards
```css
.retro-map .leaflet-container {
  background: #0c0c0e !important; /* Linear Carbon */
  filter: none !important; /* REMOVE DESTRUCTIVE FILTERS */
}
.retro-map .leaflet-tile-pane {
  opacity: 1;
  filter: saturate(1.1) brightness(0.95);
}
```

## Property Popup
```css
.property-popup .leaflet-popup-content-wrapper {
  background: #18181b !important;
  border: 1px solid #27272a !important;
  border-radius: 12px !important;
}
```

## Map Pages to Test
- `/map` — full-viewport spatial exploration
- `/market` — Micro-Market Velocity Map with area overlays
- Dashboard embedded map (if applicable)

## Viewport Testing
All map pages must be tested at 375px, 768px, 1280px, 1920px.
Check: popup rendering, marker clustering, tile loading, zoom controls.
