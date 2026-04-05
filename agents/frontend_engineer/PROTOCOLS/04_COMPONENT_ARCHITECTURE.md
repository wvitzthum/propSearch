# Component Architecture
*Reference from: agents/frontend_engineer/README.md — "Core UI Components"*

## Layout Hierarchy
```
<Layout>                # Shell: sidebar + header + main
  ├── <header>          # Sticky, breadcrumb + pipeline bar
  ├── <main>            # Page content
  └── <ComparisonBar>   # Fixed bottom, comparison count
```

## Core Components (Do NOT delete without PO consent)

| Component | Purpose |
|-----------|---------|
| `PropertyTable.tsx` | High-density sortable table with batch selection |
| `MarketPulse.tsx` | Real-time market conditions signal |
| `KPICard.tsx` | Generic metric display card |
| `AlphaBadge.tsx` | Score ring (emerald/amber/rose) |
| `ComparisonBar.tsx` | Fixed bottom bar with comparison count |

## Key Hooks
- `usePropertyContext` — global property state
- `usePipeline` — pipeline status management
- `useComparison` — comparison basket
- `useAffordability` — budget/LTV calculations
- `useThesisTags` — thesis tagging

## Props Patterns
- Always use TypeScript interfaces — no `any`
- Core components (PropertyTable, Layout) require prior consent before refactoring
- Prefer composition over prop-drilling — use React Context

## Mobile Considerations
- Sidebar: `hidden lg:flex` + mobile drawer with backdrop
- Header: sticky with `z-40`
- Tables: `overflow-x-auto` wrapper with `custom-scrollbar`
- Cards: `min-w-0` to prevent overflow

## Design Standards
See `PROTOCOLS/01_UI_STANDARDS.md` for full design token and pattern reference.
