# Map Usability & Environmental Contrast Audit: 2026-03-08

## Audit Objective
Resolve user feedback regarding "pitch black" map background and the inability to distinguish environmental features (parks, rivers, transit lines).

## 1. Technical Findings
| Component | Issue | Impact |
| --- | --- | --- |
| `.leaflet-container` | `brightness(0.7)` + `contrast(1.4)` | Crushes the low-end of the color spectrum. Dark greens (parks) and dark blues (Thames) are rendered as `#000000`. |
| `.leaflet-container` | `background: #050507` | Too close to pure black, preventing any "glow" or separation from the UI chrome. |
| `MetroOverlay` | `opacity: 0.45` | Combined with the container brightness filter, the lines are effectively invisible at standard zoom levels. |

## 2. Reproduction Steps
1. Navigate to the Map view in the Terminal.
2. Attempt to identify "Hyde Park" or "The Thames".
3. **Result:** Entire map area appears as a monolithic black block with only property markers visible.

## 3. Corrective Strategy (For FE Implementation)
1. **REMOVE** the `filter` property from `.retro-map .leaflet-container` in `index.css`.
2. **ADJUST** `.retro-map .leaflet-container` background to a slightly lighter "Linear Carbon" (e.g., `#0c0c0e`).
3. **ENHANCE** GeoJSON Metro weight to `4` and opacity to `0.6` for immediate spatial recognition.
4. **ADD** a subtle `saturate(1.2)` to the `leaflet-tile-pane` to make environmental colors pop without affecting overall darkness.

## 4. Status
**FAILED** - Usability critical. Requires immediate remediation.
