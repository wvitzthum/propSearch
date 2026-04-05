# UI Standards & Design System
*Reference from: agents/frontend_engineer/README.md — sections "Design Standards", "Core UI Components"*

## Aesthetic
**"Bloomberg Terminal meets Linear."** — dense, data-rich, precise, dark-theme.

## Tech Stack
- React 19, Tailwind CSS
- No external UI component libraries
- Custom components only

## Design Tokens (index.css)
```css
--color-linear-bg: #09090b;
--color-linear-card: #18181b;
--color-linear-border: #27272a;
--color-linear-text-muted: #a1a1aa;
--color-linear-accent: #3f3f46;
--color-linear-accent-blue: #3b82f6;
--color-linear-accent-emerald: #10b981;
--color-linear-accent-rose: #f43f5e;
```
Always use Tailwind utility classes — avoid hardcoding hex values.

## Color Coding for Data
| Element | Color |
|---------|-------|
| Alpha Score ≥ 8 | Emerald (`text-retro-green`, `#33ff33`) |
| Alpha Score 5–7 | Amber (`text-retro-amber`, `#ffb000`) |
| Alpha Score < 5 | Rose (`text-linear-accent-rose`) |
| Value Buy flag | Emerald bg |
| Shallow Data flag | Amber bg |
| EPC A/B | Emerald |
| EPC C/D | Amber |
| EPC E/F/G | Rose |

## Component Patterns

### KPI Cards
Compact metric display with label, value, optional trend indicator.

### Property Cards
High-density display: address, area, alpha badge, price, sqft, tenure, EPC, DOM.
Discovery status badges: "Fresh Discovery", "Repeat Find", "Value Buy".

### Alpha Badge
Colored score ring: emerald ≥ 8, amber 5–7, rose < 5.

## Typography
- Labels: `text-[10px] font-black uppercase tracking-widest`
- Data: `text-[11px] font-bold`
- Headers: `text-[11px] font-bold uppercase tracking-tight`

## Responsive Strategy
- Desktop-first for data density
- Mobile breakpoints: `sm:768px`, `md:1024px`, `lg:1280px`
- Use `hidden lg:flex` pattern for sidebar, `lg:pl-64` for main content offset

## Custom Scrollbar
Use `.custom-scrollbar` class — 6px width, `#27272a` thumb.
