# UI Redesign — Grok/SpaceX/Tesla Aesthetic

## TL;DR

> **Quick Summary**: 관리자 대시보드 16개 UI 파일을 Grok/SpaceX/Tesla 스타일로 전면 리디자인. 순수 시각적 변경만 — 로직 변경 없음.
> 
> **Deliverables**:
> - 리디자인된 globals.css, admin layout, sidebar
> - 리디자인된 12개 admin 페이지/폼 컴포넌트
> - tsc + build 통과 검증
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3-10 (parallel) → Task 11

---

## Context

### Original Request
"UI 디자인을 Grok, SpaceX, Tesla 처럼 직관적이면서 깔끔하고 고급스럽고 첨단 이미지를 가진 디자인으로 수정하고 개선해줘"

### Interview Summary
**Key Decisions**:
- Pure visual overhaul — Tailwind class changes only, zero logic changes
- Korean labels preserved — Grok style LAYOUT not English text
- Semantic status colors preserved — health/error/success indicators exempt from monochromatic rule

**Research Findings (Metis Review)**:
- 16 files total (not 14): globals.css + layout + sidebar + 13 page/form files
- `bg-zinc-950` is already `#09090b` — container styles change, not page background
- CATEGORY_COLORS duplicated in 3 files — must update all copies
- STATUS_STYLES duplicated in 2 files — must update all copies
- Sidebar collapse toggle is unused complexity — safe to remove
- Backdrop-blur removal requires increasing bg opacity to maintain visibility

---

## Work Objectives

### Core Objective
Transform the admin dashboard from generic dark theme to Grok/SpaceX/Tesla premium aesthetic while preserving all functionality.

### Concrete Deliverables
- 16 files modified with new design system
- Zero logic changes, zero new files
- tsc + build passing

### Definition of Done
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run build` → compiled successfully
- [ ] `grep -r "backdrop-blur" src/app/admin/ src/components/admin/` → 0 matches
- [ ] All 16 files updated with new design tokens

### Must Have
- Pure black background (#09090b)
- Extreme color restraint — monochromatic with white accent
- Generous whitespace, larger typography
- Borders at white/[0.06] (not white/10)
- No backdrop-blur anywhere
- Clean sidebar with left-bar active indicator (no unicode icons)
- Large KPI numbers (font-light, 4xl)
- Muted badges (10% opacity, not 20%)
- Uppercase tracking-wider table headers
- Preserved Korean UI labels throughout
- Preserved semantic status colors (health/error/success)
- All responsive breakpoints preserved (sm:, lg:, xl:)
- All interactive states preserved (disabled:, focus:, hover:)

### Must NOT Have (Guardrails)
- NO new files created
- NO component extraction ("shared Table/Badge component")
- NO new dependencies (no icon library, no framer-motion)
- NO logic changes (fetch, supabase, state management untouched)
- NO data constant changes (CATEGORY_LABELS, STAT_CARDS, etc.)
- NO accessibility additions (separate task)
- NO mobile navigation / hamburger menu
- NO CSS custom properties in globals.css
- NO English translation of Korean labels
- NO removal of responsive breakpoints
- NO changes to colSpan, style={{ width }}, or non-className attributes

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO (no unit tests for UI)
- **Automated tests**: None
- **Framework**: N/A
- **QA Method**: Agent-executed build verification + pattern grep + Playwright screenshots

### QA Policy
Every task MUST run `npx tsc --noEmit` after changes.
Final task runs `npm run build` and greps for banned patterns.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

---

## Execution Strategy

### Design System Specification (ALL tasks must follow this)

**Backgrounds:**
- Page: `bg-[#09090b]` (or `bg-zinc-950` — they're identical)
- Surface/Card: `bg-white/[0.03]` with `border border-white/[0.06]` and `rounded-xl`
- Surface hover: `hover:bg-white/[0.04]`
- Elevated: `bg-white/[0.05]`

**Typography:**
- Page title: `text-[28px] font-semibold tracking-tight text-white`
- Page subtitle: `mt-2 text-sm text-white/40`
- Section title: `text-base font-medium text-white`
- Body text: `text-sm text-white/60`
- Labels: `text-xs text-white/40`
- KPI numbers: `text-4xl font-light text-white`
- Table headers: `text-[11px] uppercase tracking-wider text-white/30 font-medium`

**Borders:**
- Default: `border-white/[0.06]`
- Table row: `border-b border-white/[0.04]`
- Card: `rounded-xl border border-white/[0.06]`
- Subtle section: `rounded-lg border border-white/[0.04]`

**Buttons:**
- Primary: `rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90`
- Secondary: `rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white`
- Ghost: `text-sm text-white/40 transition-colors hover:text-white`

**Badges (muted):**
- Neutral: `rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-white/50`
- Categories: Keep distinct hue but reduce to 10% bg, /70 text:
  - economy: `bg-blue-500/10 text-blue-300/70`
  - politics: `bg-red-500/10 text-red-300/70`
  - society: `bg-emerald-500/10 text-emerald-300/70`
  - sports: `bg-orange-500/10 text-orange-300/70`
  - culture: `bg-violet-500/10 text-violet-300/70`
  - opinion: `bg-cyan-500/10 text-cyan-300/70`
  - editorial: `bg-amber-500/10 text-amber-300/70`
- Status badges (articles): generated=`bg-white/[0.06] text-white/50`, available=`bg-emerald-500/10 text-emerald-400/70`, distributed=`bg-blue-500/10 text-blue-300/70`
- Status badges (press releases): collected=`bg-white/[0.06] text-white/50`, embedded=`bg-blue-500/10 text-blue-300/70`, processed=`bg-emerald-500/10 text-emerald-400/70`, failed=`bg-red-500/10 text-red-400/70`

**Semantic Colors (EXEMPT from monochromatic — preserve these):**
- Health: emerald=healthy, amber=warning, red=critical (monitoring page)
- Error feedback: `text-red-400`, `border-red-500/20 bg-red-500/[0.07]`
- Success feedback: `text-emerald-400`
- Warning (API key): `border-amber-500/20 bg-amber-500/[0.07]`

**Inputs:**
- Text/Date/Number: `w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none transition-colors`

**Tables:**
- Container: `rounded-xl border border-white/[0.06] bg-white/[0.02]`
- Header row: `border-b border-white/[0.06]`
- Header cell: `px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium`
- Body row: `border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]`
- Body cell: `px-5 py-4 text-sm`
- Link cell: `text-white/80 hover:text-white transition-colors`
- Empty state: `px-5 py-16 text-center text-white/20`

**Sidebar:**
- Background: `bg-[#09090b]` (same as page — seamless)
- Width: `w-60` (240px)
- Border: `border-r border-white/[0.06]`
- Logo: White `NF` badge (rounded-md bg-white) + text
- Nav item default: `text-[13px] text-white/40 hover:bg-white/[0.04] hover:text-white/70`
- Nav item active: `bg-white/[0.08] font-medium text-white` + left accent bar `w-[2px] h-4 bg-white`
- No icons, no collapse toggle
- Version: `text-[11px] text-white/20`

**Layout:**
- No sticky header (removed)
- Content: `ml-60 mx-auto max-w-6xl px-10 py-10`

### Parallel Execution Waves

```
Wave 1 (Foundation — SEQUENTIAL, must complete first):
├── Task 1: globals.css [quick]
└── Task 2: admin/layout.tsx + sidebar.tsx [visual-engineering]

Wave 2 (All pages — MAX PARALLEL, 8 tasks):
├── Task 3: Dashboard (admin/page.tsx) [visual-engineering]
├── Task 4: Articles list + Press releases list (2 files) [visual-engineering]
├── Task 5: Article detail + Press release detail (2 files) [visual-engineering]
├── Task 6: Clients page + client-actions (2 files) [visual-engineering]
├── Task 7: Stats page [visual-engineering]
├── Task 8: Monitoring page [visual-engineering]
├── Task 9: Crawl page + crawl-form (2 files) [visual-engineering]
└── Task 10: Settings page + settings-form (2 files) [visual-engineering]

Wave 3 (Verification):
└── Task 11: Full verification (tsc + build + banned pattern grep) [quick]

Wave FINAL (Review — 4 parallel):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Visual QA via Playwright [unspecified-high]
└── F4: Scope fidelity check [deep]

Critical Path: Task 1 → Task 2 → Task 3-10 (parallel) → Task 11 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 8 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 2 |
| 2 | 1 | 3-10 |
| 3-10 | 2 | 11 |
| 11 | 3-10 | F1-F4 |
| F1-F4 | 11 | — |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1 `quick`, T2 `visual-engineering`
- **Wave 2**: 8 tasks — T3-T10 all `visual-engineering` with `frontend-ui-ux` skill
- **Wave 3**: 1 task — T11 `quick`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high` + `playwright`, F4 `deep`

---

## TODOs

- [x] 1. globals.css Redesign

  **What to do**:
  - Replace entire content of `src/app/globals.css`
  - Remove dark mode `@media (prefers-color-scheme: dark)` block
  - Set `--background: #09090b`, `--foreground: #fafafa`
  - Change body font from `Arial, Helvetica, sans-serif` to `var(--font-sans), system-ui, -apple-system, sans-serif`
  - Add `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`
  - Add `::selection` styling: `background: rgba(255,255,255,0.15); color: #ffffff`
  - Add date input picker indicator fix: `input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }`
  - Add number input spinner opacity: `input[type="number"]::-webkit-inner-spin-button { opacity: 0.3; }`
  - Keep `@import "tailwindcss"` and `@theme inline` block

  **Must NOT do**:
  - Do NOT add CSS custom properties for design tokens (use inline Tailwind)
  - Do NOT add utility classes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (sequential with Task 2)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `src/app/globals.css` — Current file (27 lines). Replace dark mode media query, change fonts, add selection/input styles.
  - `src/app/layout.tsx:5-13` — Geist font variables already loaded (`--font-geist-sans`). Reference to use in body font-family.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: globals.css has no dark mode media query
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "prefers-color-scheme" src/app/globals.css
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-1-no-dark-media.txt

  Scenario: Font family uses system font stack
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "font-family" src/app/globals.css
    Expected Result: Contains "var(--font-sans), system-ui"
    Evidence: .sisyphus/evidence/task-1-font-stack.txt
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `style(admin): redesign foundation — globals, layout, sidebar`
  - Files: `src/app/globals.css`

- [x] 2. Layout + Sidebar Redesign

  **What to do**:
  - **`src/app/admin/layout.tsx`**:
    - Remove the entire `<header>` element (sticky top bar)
    - Change `bg-zinc-950` → `bg-[#09090b]` on root div
    - Change `text-zinc-100` → `text-white/90`
    - Change sidebar margin `ml-56` → `ml-60`
    - Replace content wrapper: `<div className="p-8">` → `<div className="mx-auto max-w-6xl px-10 py-10">`
  - **`src/components/admin/sidebar.tsx`**:
    - Remove `useState` import and `collapsed` state
    - Remove collapse `<button>` element
    - Remove all `{!collapsed && ...}` conditional renders
    - Remove `transition-all duration-300` and `${collapsed ? "w-16" : "w-56"}` ternary
    - Set fixed `w-60` on aside
    - Change `border-white/10` → `border-white/[0.06]`
    - Remove `bg-zinc-950/80 backdrop-blur-xl` → `bg-[#09090b]`
    - Remove `border-b border-white/10` from logo area
    - Remove `icon` field from NAV_ITEMS — use label only (keep Korean: 대시보드, 보도자료, etc.)
    - Remove `<span className="text-base">{item.icon}</span>` render
    - Add logo: white `NF` badge (div with `h-7 w-7 rounded-md bg-white` containing `text-xs font-bold text-black` "NF")
    - Active state: add left accent bar `<span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-white" />`
    - Active bg: `bg-white/[0.08] font-medium text-white`
    - Default: `text-white/40 hover:bg-white/[0.04] hover:text-white/70`
    - Nav item: `text-[13px]` with `relative` positioning
    - Version: `text-[11px] text-white/20` showing "v2.0"
    - Change gap from `gap-1` → `gap-0.5`, padding from `px-2` → `px-3`, items padding from `px-3 py-2.5` → `px-4 py-2.5`

  **Must NOT do**:
  - Do NOT change `usePathname()` active detection logic
  - Do NOT change `<Link>` routing
  - Do NOT add icons from any library
  - Do NOT add mobile hamburger menu

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (after Task 1)
  - **Blocks**: Tasks 3-10
  - **Blocked By**: Task 1

  **References**:
  - `src/app/admin/layout.tsx` — 28 lines. Remove header, widen margin, add max-width.
  - `src/components/admin/sidebar.tsx` — 72 lines. Remove collapse state + icon system + backdrop-blur. Add NF logo badge + left accent bar.
  - Design System Spec in this plan: "Sidebar" and "Layout" sections.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No sticky header in layout
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "sticky\|header" src/app/admin/layout.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-2-no-header.txt

  Scenario: Sidebar has no backdrop-blur
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "backdrop-blur" src/components/admin/sidebar.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-2-no-blur.txt

  Scenario: Sidebar uses w-60 and layout uses ml-60
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "w-60" src/components/admin/sidebar.tsx
      2. Run: grep -n "ml-60" src/app/admin/layout.tsx
    Expected Result: Both return exactly 1 match each
    Evidence: .sisyphus/evidence/task-2-width-match.txt

  Scenario: No useState import in sidebar (collapse removed)
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "useState" src/components/admin/sidebar.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-2-no-state.txt

  Scenario: TypeScript compiles
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit
    Expected Result: Exit code 0, no errors
    Evidence: .sisyphus/evidence/task-2-tsc.txt
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `style(admin): redesign foundation — globals, layout, sidebar`
  - Files: `src/app/admin/layout.tsx`, `src/components/admin/sidebar.tsx`

- [x] 3. Dashboard Page Redesign

  **What to do**:
  - **`src/app/admin/page.tsx`**:
    - Page heading: `text-2xl font-bold tracking-tight text-white` → `text-[28px] font-semibold tracking-tight text-white`
    - Subtitle: `text-sm text-zinc-400` → `text-sm text-white/40`
    - Stat card container: `gap-6` → `gap-5`
    - Stat cards: remove `bg-gradient-to-br ${card.color} backdrop-blur-xl`, replace with `bg-white/[0.03]`
    - Card border: `border-white/10` → `border-white/[0.06]`
    - Card icon: `text-2xl` → `text-lg text-white/20` (mute the unicode icons)
    - Sub label: `text-xs text-zinc-500` → `text-[11px] text-white/30`
    - Value: `text-3xl font-bold text-white` → `text-4xl font-light text-white` (Tesla-style light numbers)
    - Label: `text-sm text-zinc-400` → `text-sm text-white/40`
    - Pipeline section: `bg-white/5 backdrop-blur-xl` → `bg-white/[0.03]`, `border-white/10` → `border-white/[0.06]`
    - Pipeline title: `text-lg font-semibold text-white` → `text-base font-medium text-white`
    - Pipeline step circle: `bg-white/10` → `bg-white/[0.06]`
    - Pipeline text: `text-sm text-zinc-300` → `text-sm text-white/50`
    - Pipeline arrow: `text-zinc-600` → `text-white/15`
    - Update `sub` text from "AI 생성" → "생성" (matching Phase 4 change)

  **Must NOT do**:
  - Do NOT change STAT_CARDS array structure or getDashboardStats logic
  - Do NOT remove any data fields

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4-10)
  - **Blocks**: Task 11
  - **Blocked By**: Task 2

  **References**:
  - `src/app/admin/page.tsx` — 116 lines. Only className changes.
  - Design System Spec: "Typography" and "Backgrounds" sections.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No backdrop-blur in dashboard
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "backdrop-blur" src/app/admin/page.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-3-no-blur.txt

  Scenario: No gradient backgrounds
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "bg-gradient" src/app/admin/page.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-3-no-gradient.txt

  Scenario: KPI numbers use font-light
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "font-light" src/app/admin/page.tsx
    Expected Result: At least 1 match
    Evidence: .sisyphus/evidence/task-3-font-light.txt
  ```

  **Commit**: YES (groups with Tasks 4-10)
  - Message: `style(admin): redesign all pages — Grok/SpaceX/Tesla aesthetic`

- [x] 4. List Pages Redesign (Articles + Press Releases)

  **What to do**:
  - **`src/app/admin/articles/page.tsx`**:
    - Page heading: `text-2xl font-bold tracking-tight text-white` → `text-[28px] font-semibold tracking-tight text-white`
    - Subtitle: `text-sm text-zinc-400` → `text-sm text-white/40`
    - Filter buttons: `bg-white/10 text-white` (active) → `bg-white/[0.08] text-white`
    - Filter default: `text-zinc-400 hover:bg-white/5 hover:text-white` → `text-white/30 hover:bg-white/[0.04] hover:text-white/60`
    - Table container: `border-white/10 bg-white/5 backdrop-blur-xl` → `border-white/[0.06] bg-white/[0.02]`
    - Table headers: `text-xs font-medium text-zinc-400` → `text-[11px] uppercase tracking-wider text-white/30 font-medium`
    - Header cell padding: `px-4 py-3` → `px-5 py-3.5`
    - Header row border: `border-white/10` → `border-white/[0.06]`
    - Body row: `border-white/5 hover:bg-white/5` → `border-white/[0.04] hover:bg-white/[0.03]`
    - Body cell padding: `px-4 py-3` → `px-5 py-4`
    - Title link: `text-white hover:text-blue-300` → `text-white/80 hover:text-white`
    - Source text: `text-zinc-300` → `text-white/50`
    - Date text: `text-zinc-400` → `text-white/30`
    - Empty state: `text-zinc-500` → `text-white/20`, increase padding to `py-16`
    - CATEGORY_COLORS: change all values to muted versions per Design System Spec
    - Badge: keep existing `rounded-full px-2 py-0.5 text-xs` structure
  - **`src/app/admin/press-releases/page.tsx`** — Same pattern:
    - Apply identical table styling changes
    - STATUS_STYLES: change to muted versions per Design System Spec
    - Filter buttons: same changes as articles
    - Title link styling: same as articles

  **Must NOT do**:
  - Do NOT change the query logic, pagination, or filter parameters
  - Do NOT change CATEGORY_LABELS or filter href URLs
  - Do NOT change Link imports or href patterns

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 2

  **References**:
  - `src/app/admin/articles/page.tsx` — 152 lines. Table + filter buttons.
  - `src/app/admin/press-releases/page.tsx` — 132 lines. Same table pattern.
  - Design System Spec: "Tables" and "Badges" sections.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No backdrop-blur in list pages
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "backdrop-blur" src/app/admin/articles/page.tsx src/app/admin/press-releases/page.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-4-no-blur.txt

  Scenario: Table headers are uppercase tracking-wider
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "uppercase tracking-wider" src/app/admin/articles/page.tsx
    Expected Result: At least 1 match
    Evidence: .sisyphus/evidence/task-4-uppercase-headers.txt

  Scenario: No old border patterns
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "border-white/10\|border-white/5[^]]" src/app/admin/articles/page.tsx src/app/admin/press-releases/page.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-4-no-old-borders.txt
  ```

  **Commit**: YES (groups with Wave 2)

- [x] 5. Detail Pages Redesign (Article + Press Release)

  **What to do**:
  - **`src/app/admin/articles/[id]/page.tsx`**:
    - Back link: `text-zinc-400 hover:text-white` → `text-white/30 hover:text-white/70`
    - Main card: `border-white/10 bg-white/5 backdrop-blur-xl` → `border-white/[0.06] bg-white/[0.03]`, padding `p-6` → `p-8`
    - Title: `text-2xl font-bold tracking-tight` → `text-[28px] font-semibold tracking-tight`
    - Subtitle: `text-base text-zinc-300` → `text-base text-white/50`
    - CATEGORY_COLORS: update to muted versions (same as Task 4)
    - STATUS_STYLES: update to muted versions
    - Meta grid: `border-white/5 bg-white/[0.02]` → `border-white/[0.04] bg-white/[0.02]`
    - Meta labels: `text-xs text-zinc-500` → `text-[11px] text-white/25`
    - Meta values: `text-zinc-200` → `text-white/60`
    - Links: `text-blue-400 hover:text-blue-300` → `text-white/50 hover:text-white/80 underline underline-offset-2 decoration-white/20`
    - Image border: `border-white/10` → `border-white/[0.06]`
    - Section title: `text-sm font-medium text-zinc-400` → `text-xs uppercase tracking-wider text-white/30 font-medium`
    - Body container: `border-white/5 bg-white/[0.02]` → `border-white/[0.04] bg-white/[0.02]`
    - Body text: `text-sm leading-relaxed text-zinc-200` → `text-sm leading-relaxed text-white/60`
  - **`src/app/admin/press-releases/[id]/page.tsx`** — Same pattern:
    - Apply identical changes
    - STATUS_STYLES: use same muted values as list page
    - Attachments links: same link styling

  **Must NOT do**:
  - Do NOT change the Supabase query or notFound() logic
  - Do NOT change `params: Promise<{ id: string }>` signature
  - Do NOT change image `<img>` tags or their src

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 2

  **References**:
  - `src/app/admin/articles/[id]/page.tsx` — ~170 lines
  - `src/app/admin/press-releases/[id]/page.tsx` — ~180 lines
  - Design System Spec: "Typography", "Borders", "Badges" sections.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No backdrop-blur in detail pages
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "backdrop-blur" src/app/admin/articles/\\[id\\]/page.tsx src/app/admin/press-releases/\\[id\\]/page.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-5-no-blur.txt

  Scenario: Section headers are uppercase
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "uppercase tracking-wider" src/app/admin/articles/\\[id\\]/page.tsx
    Expected Result: At least 1 match
    Evidence: .sisyphus/evidence/task-5-uppercase.txt
  ```

  **Commit**: YES (groups with Wave 2)

- [x] 6. Clients Page + Client Actions Redesign

  **What to do**:
  - **`src/app/admin/clients/page.tsx`** (90 lines):
    - Page heading: `text-2xl font-bold tracking-tight text-white` → `text-[28px] font-semibold tracking-tight text-white`
    - Subtitle: `text-sm text-zinc-400` → `text-sm text-white/40`
    - Table container: `border-white/10 bg-white/5 backdrop-blur-xl` → `border-white/[0.06] bg-white/[0.02]`
    - Table header row: `border-b border-white/10` → `border-b border-white/[0.06]`
    - Table header cells: `px-4 py-3 text-xs font-medium text-zinc-400` → `px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium`
    - Body rows: `border-white/5 transition-colors hover:bg-white/5` → `border-white/[0.04] transition-colors hover:bg-white/[0.03]`
    - Body cell padding: `px-4 py-3` → `px-5 py-4`
    - Name text: `text-white` → `text-white/80`
    - Status badges: `bg-emerald-500/20 text-emerald-300` → `bg-emerald-500/10 text-emerald-400/70` (active), `bg-red-500/20 text-red-300` → `bg-red-500/10 text-red-400/70` (inactive)
    - Date text: `text-zinc-400` → `text-white/30`
    - Empty state: `px-4 py-12 text-center text-zinc-500` → `px-5 py-16 text-center text-white/20`
  - **`src/app/admin/clients/client-actions.tsx`** (105 lines):
    - API key warning box: `border-amber-500/30 bg-amber-500/10` → `border-amber-500/20 bg-amber-500/[0.07]` (keep amber — semantic)
    - API key warning text: `text-amber-300` → `text-amber-300` (keep), `text-amber-400` → `text-amber-400/80`
    - Code block: `bg-black/40` → `bg-white/[0.03]`
    - "닫기" button: `bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20` → `border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] hover:text-white`
    - "새 클라이언트 등록" button: `bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20` → Primary button: `bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90`
    - Input: `border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/30` → `border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15]`
    - "등록" button: `bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20` → Primary button: `bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90`
    - "취소" button: `text-sm text-zinc-400 hover:text-white` → Ghost: `text-sm text-white/40 hover:text-white`
    - Error text: `text-xs text-red-400` → keep as-is (semantic)

  **Must NOT do**:
  - Do NOT change handleCreate fetch logic
  - Do NOT change useState state management
  - Do NOT modify API key display logic or the apiKey conditional renders

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3-5, 7-10)
  - **Blocks**: Task 11
  - **Blocked By**: Task 2

  **References**:
  - `src/app/admin/clients/page.tsx` — 90 lines. Table with 3 columns: name, status badge, date.
  - `src/app/admin/clients/client-actions.tsx` — 105 lines. 3 UI states: showForm=false (register button), showForm=true (input + buttons), apiKey set (warning box).
  - Design System Spec: "Tables", "Buttons", "Inputs", "Badges" sections.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No backdrop-blur in clients pages
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "backdrop-blur" src/app/admin/clients/page.tsx src/app/admin/clients/client-actions.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-6-no-blur.txt

  Scenario: Table headers are uppercase tracking-wider
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "uppercase tracking-wider" src/app/admin/clients/page.tsx
    Expected Result: At least 1 match
    Evidence: .sisyphus/evidence/task-6-uppercase-headers.txt

  Scenario: Primary button uses white bg
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "bg-white px-5\|bg-white text-black" src/app/admin/clients/client-actions.tsx
    Expected Result: At least 1 match
    Evidence: .sisyphus/evidence/task-6-primary-button.txt
  ```

  **Commit**: YES (groups with Wave 2)

- [x] 7. Stats Page Redesign

  **What to do**:
  - **`src/app/admin/stats/page.tsx`** (118 lines):
    - Page heading: `text-2xl font-bold tracking-tight text-white` → `text-[28px] font-semibold tracking-tight text-white`
    - Subtitle: `text-sm text-zinc-400` → `text-sm text-white/40`
    - Stat card grid: `mb-8 grid gap-4 sm:grid-cols-3` → `mb-8 grid gap-5 sm:grid-cols-3`
    - Stat cards: `border-white/10 bg-white/5 p-5 backdrop-blur-xl` → `border-white/[0.06] bg-white/[0.03] p-5`
    - Stat label: `text-xs text-zinc-400` → `text-[11px] text-white/30`
    - Stat value: `mt-1 text-3xl font-bold text-white` → `mt-1 text-4xl font-light text-white` (Tesla-style light numbers)
    - Chart container: `border-white/10 bg-white/5 p-6 backdrop-blur-xl` → `border-white/[0.06] bg-white/[0.03] p-6`
    - Chart title: `text-lg font-semibold text-white` → `text-base font-medium text-white`
    - Category labels: `text-xs text-zinc-400` → `text-xs text-white/30`
    - Bar track: `bg-white/5` → `bg-white/[0.04]`
    - Count text: `text-sm font-medium text-white` → `text-sm font-light text-white`
    - CATEGORY_COLORS: Mute bar colors — change from solid to opacity variants:
      - economy: `bg-blue-500` → `bg-blue-400/60`
      - politics: `bg-red-500` → `bg-red-400/60`
      - society: `bg-emerald-500` → `bg-emerald-400/60`
      - sports: `bg-orange-500` → `bg-orange-400/60`
      - culture: `bg-violet-500` → `bg-violet-400/60`
      - opinion: `bg-cyan-500` → `bg-cyan-400/60`
      - editorial: `bg-amber-500` → `bg-amber-400/60`

  **Must NOT do**:
  - Do NOT change getStats() logic
  - Do NOT change CATEGORY_LABELS or ARTICLE_CATEGORIES import
  - Do NOT change the bar chart math (`item.count / maxCount * 100`)
  - Do NOT change style={{ width }} attribute

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 2

  **References**:
  - `src/app/admin/stats/page.tsx` — 118 lines. 3 stat cards + horizontal bar chart with CATEGORY_COLORS.
  - Design System Spec: "Typography", "Backgrounds", "Badges" sections.
  - Note: CATEGORY_COLORS in this file are BAR FILL colors (not badge colors). Use `/60` opacity variants for muted bars, not the badge pattern.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No backdrop-blur in stats page
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "backdrop-blur" src/app/admin/stats/page.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-7-no-blur.txt

  Scenario: KPI numbers use font-light
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "font-light" src/app/admin/stats/page.tsx
    Expected Result: At least 3 matches (3 stat cards)
    Evidence: .sisyphus/evidence/task-7-font-light.txt

  Scenario: Bar colors are muted (use /60 opacity)
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "bg-blue-400/60\|bg-red-400/60\|bg-emerald-400/60" src/app/admin/stats/page.tsx
    Expected Result: At least 3 matches
    Evidence: .sisyphus/evidence/task-7-muted-bars.txt
  ```

  **Commit**: YES (groups with Wave 2)

- [x] 8. Monitoring Page Redesign

  **What to do**:
  - **`src/app/admin/monitoring/page.tsx`** (335 lines):
    - Page heading: `text-2xl font-bold tracking-tight text-white` → `text-[28px] font-semibold tracking-tight text-white`
    - Subtitle: `text-sm text-zinc-400` → `text-sm text-white/40`
    - Summary cards (4 cards, lines 223-251): Remove `backdrop-blur-xl` from ALL four summary cards
    - Summary card — healthy: `border-emerald-500/20 bg-emerald-500/5 px-4 py-3 backdrop-blur-xl` → `border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3` (KEEP emerald border/colors — semantic)
    - Summary card — warning: `border-amber-500/20 bg-amber-500/5 px-4 py-3 backdrop-blur-xl` → `border-amber-500/20 bg-amber-500/[0.05] px-4 py-3`
    - Summary card — critical: `border-red-500/20 bg-red-500/5 px-4 py-3 backdrop-blur-xl` → `border-red-500/20 bg-red-500/[0.05] px-4 py-3`
    - Summary card — unknown: `border-zinc-700 bg-zinc-800/30 px-4 py-3 backdrop-blur-xl` → `border-white/[0.06] bg-white/[0.03] px-4 py-3`
    - Summary labels: `text-xs text-zinc-400` → `text-[11px] text-white/30`
    - Summary unknown count: `text-xl font-bold text-zinc-400` → `text-xl font-light text-white/40`
    - Site cards: `bg-white/5 p-4 backdrop-blur-xl` → `bg-white/[0.03] p-4` (KEEP health-specific borders from HEALTH_CONFIG)
    - Site card hover: `hover:bg-white/[0.07]` → `hover:bg-white/[0.05]`
    - Site name: `text-sm font-semibold text-white` → `text-sm font-medium text-white/90`
    - Info rows labels: `text-zinc-400` → `text-white/30`
    - Info rows values: `text-zinc-300` → `text-white/50`
    - New articles indicator: `text-emerald-400` → keep as-is (semantic)
    - Consecutive failures: `text-red-400` → keep as-is (semantic)
    - Failure reason box: `bg-red-500/10` → `bg-red-500/[0.07]` (subtle adjustment)
    - Failure text: `text-red-400` / `text-red-400/70` → keep as-is (semantic)
    - **CRITICAL: DO NOT TOUCH HEALTH_CONFIG constant (lines 20-45)** — These colors are functional, not decorative

  **Must NOT do**:
  - Do NOT modify HEALTH_CONFIG, FAILURE_LABELS constants
  - Do NOT change getSiteStatuses() logic
  - Do NOT change formatRelativeTime() or formatDuration() functions
  - Do NOT change health sorting logic
  - Do NOT remove health-specific border colors from site cards (they convey status)
  - Do NOT change responsive grid classes (sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 2

  **References**:
  - `src/app/admin/monitoring/page.tsx` — 335 lines. 4 summary cards + 27 site cards grid.
  - HEALTH_CONFIG (lines 20-45): Defines emerald/amber/red/zinc colors per health status — PRESERVE ALL.
  - Design System Spec: "Semantic Colors" section — health colors are EXEMPT from monochromatic rule.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No backdrop-blur in monitoring page
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "backdrop-blur" src/app/admin/monitoring/page.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-8-no-blur.txt

  Scenario: HEALTH_CONFIG preserved unchanged
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "text-emerald-400\|text-amber-400\|text-red-400" src/app/admin/monitoring/page.tsx
    Expected Result: At least 3 matches (one per health status in HEALTH_CONFIG)
    Evidence: .sisyphus/evidence/task-8-health-colors.txt

  Scenario: No old bg-white/5 pattern (except in HEALTH_CONFIG values)
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "bg-white/5[^]]" src/app/admin/monitoring/page.tsx
    Expected Result: 0 matches (all converted to bg-white/[0.03] or similar)
    Evidence: .sisyphus/evidence/task-8-no-old-bg.txt
  ```

  **Commit**: YES (groups with Wave 2)

- [x] 9. Crawl Page + Crawl Form Redesign

  **What to do**:
  - **`src/app/admin/crawl/page.tsx`** (20 lines):
    - Page heading: `text-2xl font-bold tracking-tight text-white` → `text-[28px] font-semibold tracking-tight text-white`
    - Subtitle: `text-sm text-zinc-400` → `text-sm text-white/40`
  - **`src/app/admin/crawl/crawl-form.tsx`** (315 lines):
    - Site selection container: `border-white/10 bg-white/5 p-6 backdrop-blur-xl` → `border-white/[0.06] bg-white/[0.03] p-6`
    - Section title "기관 선택": `text-sm font-semibold text-zinc-300` → `text-sm font-medium text-white/60`
    - "전체 선택/해제" label: `text-sm text-zinc-400` → `text-sm text-white/30`
    - Group labels: `text-xs font-medium text-zinc-500` → `text-[11px] font-medium text-white/25`
    - Site toggle — checked: `border-emerald-500/40 bg-emerald-500/10 text-emerald-300` → `border-white/[0.15] bg-white/[0.08] text-white` (remove green — Grok-style monochromatic toggle)
    - Site toggle — unchecked: `border-white/10 bg-white/5 text-zinc-400 hover:border-white/20` → `border-white/[0.06] bg-white/[0.02] text-white/30 hover:border-white/[0.10] hover:text-white/50`
    - Selected count: `text-xs text-zinc-500` → `text-xs text-white/20`
    - Options container: `border-white/10 bg-white/5 p-6 backdrop-blur-xl` → `border-white/[0.06] bg-white/[0.03] p-6`
    - Options title: `text-sm font-semibold text-zinc-300` → `text-sm font-medium text-white/60`
    - Input labels: `text-xs text-zinc-400` → `text-xs text-white/30`
    - All inputs: `border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:border-white/30` → `border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none transition-colors`
    - Submit button: `bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500` → Primary: `bg-white px-6 py-3 font-medium text-black hover:bg-white/90` (Grok-style white button)
    - Error box: `border-red-500/30 bg-red-500/10` → `border-red-500/20 bg-red-500/[0.07]` (keep red — semantic)
    - Result time text: `text-sm text-zinc-400` → `text-sm text-white/40`
    - Result stage cards: `border-white/10 bg-white/5 p-4` → `border-white/[0.06] bg-white/[0.03] p-4`
    - Stage label: `text-sm font-medium text-white` → `text-sm font-medium text-white/80`
    - Stage status badge — success: `bg-emerald-500/20 text-emerald-300` → `bg-emerald-500/10 text-emerald-400/70`
    - Stage status badge — failed: `bg-red-500/20 text-red-300` → `bg-red-500/10 text-red-400/70`
    - Stage status badge — other: `bg-zinc-500/20 text-zinc-400` → `bg-white/[0.06] text-white/40`
    - Duration text: `text-xs text-zinc-400` → `text-xs text-white/30`
    - Detail text: `text-xs text-zinc-500` → `text-xs text-white/20`

  **Must NOT do**:
  - Do NOT change handleSubmit fetch logic
  - Do NOT change useState state variables or their types
  - Do NOT change SITE_GROUPS or STAGE_LABELS constants
  - Do NOT change `siteMap` computation or toggleAll/toggleSite logic
  - Do NOT change ManualCrawlResult type

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 2

  **References**:
  - `src/app/admin/crawl/page.tsx` — 20 lines. Just heading + CrawlForm.
  - `src/app/admin/crawl/crawl-form.tsx` — 315 lines. Site selection grid (3 groups), options grid (4 inputs), submit button, error box, result cards (3 stages).
  - Design System Spec: "Inputs", "Buttons", "Backgrounds", "Badges" sections.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No backdrop-blur in crawl pages
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "backdrop-blur" src/app/admin/crawl/page.tsx src/app/admin/crawl/crawl-form.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-9-no-blur.txt

  Scenario: Submit button uses white primary style
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "bg-white px-6\|bg-white.*font-medium.*text-black" src/app/admin/crawl/crawl-form.tsx
    Expected Result: At least 1 match
    Evidence: .sisyphus/evidence/task-9-primary-button.txt

  Scenario: No old bg-white/10 input pattern
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "bg-white/10" src/app/admin/crawl/crawl-form.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-9-no-old-input-bg.txt
  ```

  **Commit**: YES (groups with Wave 2)

- [x] 10. Settings Page + Settings Form Redesign

  **What to do**:
  - **`src/app/admin/settings/page.tsx`** (50 lines):
    - Page heading: `text-2xl font-bold tracking-tight text-white` → `text-[28px] font-semibold tracking-tight text-white`
    - Subtitle: `text-sm text-zinc-400` → `text-sm text-white/40`
  - **`src/app/admin/settings/settings-form.tsx`** (271 lines):
    - "수집 시간" section container: `border-white/10 bg-white/5 p-6 backdrop-blur-xl` → `border-white/[0.06] bg-white/[0.03] p-6`
    - Section title: `text-lg font-semibold text-white` → `text-base font-medium text-white`
    - Section subtitle: `text-xs text-zinc-400` → `text-xs text-white/30`
    - Counter text: `text-xs text-zinc-500` → `text-xs text-white/20`
    - Hour toggle — active: `bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30` → `bg-white/[0.10] text-white ring-1 ring-white/[0.15]` (monochromatic Grok-style)
    - Hour toggle — inactive: `bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300` → `bg-white/[0.02] text-white/25 hover:bg-white/[0.05] hover:text-white/50`
    - "대상 지역" section container: same as "수집 시간"
    - "전체 선택" button: `bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-white` → `border border-white/[0.08] px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white`
    - renderSiteGroup — group container: `border-white/5 bg-white/[0.02] p-4` → `border-white/[0.04] bg-white/[0.02] p-4`
    - Group title: `text-sm font-medium text-white` — keep as-is
    - Group counter: `text-xs text-zinc-500` → `text-xs text-white/20`
    - Group toggle text: `text-xs text-zinc-400 transition-colors hover:text-white` → `text-xs text-white/30 transition-colors hover:text-white/70`
    - Site toggle — checked: `bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30` → `bg-white/[0.10] text-white ring-1 ring-white/[0.15]` (monochromatic)
    - Site toggle — unchecked: `bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300` → `bg-white/[0.02] text-white/25 hover:bg-white/[0.05] hover:text-white/50`
    - Save button: `bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500` → Primary: `bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90`
    - Save success text: `text-sm text-emerald-400` → keep as-is (semantic feedback)
    - Save error text: `text-sm text-red-400` → keep as-is (semantic feedback)

  **Must NOT do**:
  - Do NOT change handleSave, toggleSite, toggleGroupAll, toggleAll, toggleHour functions
  - Do NOT change useState/useTransition state
  - Do NOT change GWANGJU_SITES, JEONNAM_SITES, ALL_SITES, HOURS constants
  - Do NOT modify the grid-cols responsive breakpoints (grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 for hours, grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 for sites)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 2

  **References**:
  - `src/app/admin/settings/page.tsx` — 50 lines. Just heading + SettingsForm.
  - `src/app/admin/settings/settings-form.tsx` — 271 lines. Two sections: hours grid (24 toggles) + site groups grid (27 toggles in 2 groups). Save button at bottom.
  - Design System Spec: "Buttons", "Backgrounds" sections.
  - Note: Toggle styling differs from badges — toggles should be monochromatic (white) when active, not colored.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No backdrop-blur in settings pages
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "backdrop-blur" src/app/admin/settings/page.tsx src/app/admin/settings/settings-form.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-10-no-blur.txt

  Scenario: Save button uses white primary style
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "bg-white px-6\|bg-white.*font-medium.*text-black" src/app/admin/settings/settings-form.tsx
    Expected Result: At least 1 match
    Evidence: .sisyphus/evidence/task-10-primary-button.txt

  Scenario: No blue toggle pattern (hour/site toggles monochromatic)
    Tool: Bash (grep)
    Steps:
      1. Run: grep -n "bg-blue-500/20\|ring-blue-500\|bg-emerald-500/20\|ring-emerald-500" src/app/admin/settings/settings-form.tsx
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-10-no-colored-toggles.txt
  ```

  **Commit**: YES (groups with Wave 2)

- [x] 11. Full Verification

  **What to do**:
  - Run `npx tsc --noEmit` — must pass with 0 errors
  - Run `npm run build` — must compile successfully
  - Run banned pattern grep across ALL admin files:
    - `grep -rn "backdrop-blur" src/app/admin/ src/components/admin/` → 0 matches
    - `grep -rn "bg-white/5[^]]" src/app/admin/ src/components/admin/` → 0 matches of old pattern
    - `grep -rn "border-white/10[^]]" src/app/admin/ src/components/admin/` → 0 matches of old pattern (note: border-white/[0.10] with bracket is fine if used intentionally)
    - `grep -rn "text-zinc-" src/app/admin/ src/components/admin/` → should be minimal (some in constants like CATEGORY_LABELS are OK if they're strings, but className uses should be 0)
  - If any banned patterns found, fix them
  - Verify all 16 files were modified by checking git diff

  **Must NOT do**:
  - Do NOT change any logic to fix type errors (only className changes should be needed)
  - Do NOT create new files

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, after all Wave 2 tasks)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 3-10

  **References**:
  - All 16 files listed in "Work Objectives > Concrete Deliverables"
  - Success Criteria section of this plan

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compilation passes
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit
    Expected Result: Exit code 0, no errors
    Evidence: .sisyphus/evidence/task-11-tsc.txt

  Scenario: Next.js build passes
    Tool: Bash
    Steps:
      1. Run: npm run build
    Expected Result: "Compiled successfully" or "✓ Compiled" in output
    Evidence: .sisyphus/evidence/task-11-build.txt

  Scenario: Zero backdrop-blur in admin files
    Tool: Bash (grep)
    Steps:
      1. Run: grep -rn "backdrop-blur" src/app/admin/ src/components/admin/
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-11-no-blur.txt

  Scenario: Zero old bg-white/5 pattern
    Tool: Bash (grep)
    Steps:
      1. Run: grep -rn "bg-white/5[^]]" src/app/admin/ src/components/admin/
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-11-no-old-bg.txt

  Scenario: All 16 files modified
    Tool: Bash (git)
    Steps:
      1. Run: git diff --name-only | wc -l
    Expected Result: At least 16 files changed
    Evidence: .sisyphus/evidence/task-11-file-count.txt
  ```

  **Commit**: YES
  - Message: `style(admin): verify build and clean banned patterns`
  - Pre-commit: `npm run build`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (grep for new patterns, check file diffs). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `npm run build`. Review all changed files for: leftover old patterns (bg-white/10, backdrop-blur-xl, border-white/10), inconsistent new patterns, unused imports. Grep for banned patterns: `grep -rn "backdrop-blur\|bg-white/5\|border-white/10\|bg-zinc-950/80" src/app/admin/ src/components/admin/`. Assert 0 matches.
  Output: `Build [PASS/FAIL] | Banned Patterns [N matches] | VERDICT`

- [x] F3. **Visual QA via Playwright** — `unspecified-high` + `playwright` skill
  Navigate to all 9 admin routes (/admin, /admin/articles, /admin/press-releases, /admin/clients, /admin/stats, /admin/monitoring, /admin/crawl, /admin/settings). Take screenshot of each. Verify: sidebar renders at 240px width, no sticky header, no backdrop-blur visible, background is dark (#09090b). Check interactive states: click a settings toggle, verify selected state styling.
  Output: `Routes [N/N render] | Sidebar [PASS/FAIL] | Header [REMOVED] | VERDICT`
  Evidence: `.sisyphus/evidence/final-qa/`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes (any logic change = REJECT).
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `style(admin): redesign foundation — globals, layout, sidebar`
  - Files: globals.css, admin/layout.tsx, sidebar.tsx
  - Pre-commit: `npx tsc --noEmit`
- **Wave 2**: `style(admin): redesign all pages — Grok/SpaceX/Tesla aesthetic`
  - Files: all 13 page/form files
  - Pre-commit: `npx tsc --noEmit`
- **Wave 3**: `style(admin): verify build and clean banned patterns`
  - Pre-commit: `npm run build`

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit        # Expected: 0 errors
npm run build           # Expected: ✓ Compiled successfully
grep -rn "backdrop-blur" src/app/admin/ src/components/admin/  # Expected: 0 matches
grep -rn "bg-white/5[^]]" src/app/admin/ src/components/admin/  # Expected: 0 matches of old pattern
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] tsc passes
- [x] build passes
- [x] 0 backdrop-blur occurrences
- [x] Consistent design system across all 16 files
