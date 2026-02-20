# UI Polish — Decisions

## [2026-02-19] Inherited from ui-redesign (Phase 6)

### Key Codebase Facts
- **Color palette**: `#09090b` background, `white/[0.06]` borders, `white/[0.08]` elevated
- **Korean labels PRESERVED** — all UI text stays in Korean
- **Primary button pattern**: `bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90`
- **Secondary button pattern**: `border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] hover:text-white`
- **Card padding**: `p-6` (primary), `p-4` (sub/inner panel) — `p-8` only for detail page main card
- **Page header spacing**: `mb-8` (standard — already used in dashboard, monitoring, crawl, stats)
- **Semantic health colors**: emerald/amber/red ARE intentional — do NOT replace with monochromatic

## [2026-02-19] Phase 7 UI Polish — Core Decisions

### Architecture Decisions
- **Mobile sidebar**: `hidden md:flex` on desktop aside + `useState` toggle inside sidebar.tsx — layout.tsx stays Server Component
- **layout.tsx rule**: NEVER add "use client" — it is a Server Component, period
- **Pagination**: URL-based `<a href="?page=N">` — preserves filter params, no client hooks
- **Breakpoint**: `md:` (768px) for sidebar show/hide
- **Focus ring**: `focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]`
- **Active press**: `active:scale-[0.98]` on buttons only (NOT on `<a>` or `<Link>` tags)

### Standards Set
- `mb-8` — all page headers (articles, press-releases, clients, settings currently mb-6 → must fix)
- `p-6` — all primary stat cards (stats page currently p-5 → must fix)
- `py-2.5` — all primary buttons (crawl-form currently py-3 → must fix)
- `overflow-x-auto` — replaces `overflow-hidden` on table wrappers

### Files That Must NOT Be Changed (except specific patterns)
- API routes: `/src/app/api/**` — off-limits
- Supabase client creation pattern — off-limits
- `globals.css` — off-limits (Phase 6 already handles base styles)
