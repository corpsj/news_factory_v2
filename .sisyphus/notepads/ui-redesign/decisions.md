# UI Redesign — Decisions

## [2026-02-19] Session ses_38c1bd74dffeC33rGK542hPd7D

### Key Design Decisions
- **Korean labels preserved** — Grok style LAYOUT, not English text
- **Monitoring health colors preserved** — emerald/amber/red are FUNCTIONAL (HEALTH_CONFIG), not decorative
- **Sidebar collapse removed** — unused complexity, safe to remove
- **Semantic status colors exempt from monochromatic rule** — health indicators, error/success feedback
- **bg-zinc-950 IS already #09090b** — only container styles change, not page background
- **Toggles in Settings/Crawl = monochromatic** — active state uses white (not colored) ring + bg
- **Stats CATEGORY_COLORS = bar fills** — use /60 opacity (not same as badge pattern)

### Wave Execution Order
1. Wave 1 (SEQUENTIAL): T1 globals.css → T2 layout+sidebar
2. Wave 2 (8 PARALLEL): T3 dashboard, T4 list pages, T5 detail pages, T6 clients, T7 stats, T8 monitoring, T9 crawl, T10 settings
3. Wave 3: T11 full verification
4. Final (4 PARALLEL): F1-F4 review

### Pattern Replacement Map
- `bg-white/5` → `bg-white/[0.03]` (cards), `bg-white/[0.02]` (tables)
- `bg-white/10` → `bg-white/[0.06]` or `bg-white/[0.08]` (elevated)
- `border-white/10` → `border-white/[0.06]`
- `border-white/5` → `border-white/[0.04]`
- `backdrop-blur-xl` → REMOVE entirely
- `text-zinc-400` → `text-white/40`
- `text-zinc-300` → `text-white/50`
- `text-zinc-500` → `text-white/25`
- `text-zinc-200` → `text-white/60`
- `text-2xl font-bold` → `text-[28px] font-semibold` (page titles)
- `text-3xl font-bold` → `text-4xl font-light` (KPI numbers)
- Table headers: add `uppercase tracking-wider`, `text-[11px]`, `text-white/30`
- Table cells: `px-4 py-3` → `px-5 py-4` (body), `px-5 py-3.5` (header)
- Primary button: `bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90`