# @visx Chart Implementation Protocol
*Reference from: agents/frontend_engineer/README.md — ADR-015*

## Why @visx
All data visualizations must use `@visx` (airbnb/visx) instead of raw SVG. This ensures:
- Consistent scaling and responsive behavior
- Proper accessibility (axis labels, tooltips)
- Maintainable, testable chart code

## Required Packages
```
npm install @visx/scale @visx/shape @visx/axis @visx/grid @visx/responsive @visx/tooltip @visx/group @visx/event @visx/gradient --legacy-peer-deps
```

## Core Patterns

### 1. Responsive Charts with ParentSize
```tsx
import { ParentSize } from '@visx/responsive';
// Wrap chart in <ParentSize> to auto-fill container
```

### 2. Scales
```tsx
import { scaleLinear, scalePoint, scaleTime } from '@visx/scale';
// xScale: maps data domain to pixel range
// yScale: maps value range to pixel range
```

### 3. Chart Types

**Line Chart (LinePath + AreaClosed):**
```tsx
import { LinePath, AreaClosed } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
```

**Bar Chart (Bar):**
```tsx
import { Bar } from '@visx/shape';
```

### 4. Axis
```tsx
import { AxisLeft, AxisBottom } from '@visx/axis';
// Always include axis labels for accessibility
```

### 5. Grid
```tsx
import { GridRows } from '@visx/grid';
```

### 6. Tooltips
```tsx
import { useTooltip, Tooltip } from '@visx/tooltip';
```

## NEVER use raw SVG for data charts
- ❌ `<polyline>`, `<line>`, `<rect>` in chart components
- ❌ Hand-rolled `getX()`, `getY()` calculations
- ✅ `@visx/scale`, `@visx/shape`, `@visx/axis`
- ✅ Raw `<svg>` only for decorative shapes (icons, dividers, backgrounds)

## Testing
All chart components must have Playwright viewport tests at:
- 375px (mobile), 768px (tablet), 1280px (laptop), 1920px (desktop)
