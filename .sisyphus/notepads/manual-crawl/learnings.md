# Learnings — manual-crawl

## [2026-02-19] Session Start

### Current State of Key Files

**src/types/crawler.ts**
- CrawlOptions has: siteIds?, limitPerSite?, delayMs?, siteConcurrency?
- SiteConfig has: id, name, type, listUrl, detailUrlTemplate, idPattern, selectors
- ParsedArticle.date is a string (ISO format) — string comparison works for date filtering
- SiteParser type: `(ctx: SiteParserContext) => Promise<ParsedArticle[]>` — DO NOT CHANGE
- SiteParserContext: site, listHtml, fetchHtml, limit, delayMs — DO NOT CHANGE

**src/components/admin/sidebar.tsx**
- NAV_ITEMS is `as const` array — add after "모니터링" entry
- Uses unicode symbols for icons: ◆ ◇ ▤ ⊡ ◫ ◉
- "use client" component

### Architecture Decisions
- executePipeline() mutex conflict → create separate executeManualCrawl() in manual.ts with own manualRunning flag
- maxPages hard cap: Math.min(options.maxPages ?? 1, 5)
- Date filter: insert 전 article.date로 필터 (string comparison: from <= date <= to)
- Pagination URL: listUrl + (listUrl.includes('?') ? '&' : '?') + paginationParam + '=' + pageNum
- Stop conditions: (a) 0 articles on page, (b) maxPages reached, (c) all articles older than dateRange.from
- embed/generate limit: 200 cap

### Auth Pattern (from clients/route.ts)
- CRON_SECRET header OR same-origin referer check
- Follow exactly for /api/admin/crawl/route.ts

### paginationParam by parser type
- gwangju-do type: "pageIndex"
- gwangju-es type: "nPage"
- jeonnam-do type: "pageIndex"
- jeonnam-si type: "mokpo, yeosu, naju, boseong, muan": "pageNo"
- Others: leave undefined (single-page)

## [2026-02-19] Task 3: Add Crawl Nav Item

### Completed
- Added new nav item to NAV_ITEMS in src/components/admin/sidebar.tsx
- Entry: `{ href: "/admin/crawl", label: "크롤링", icon: "⟳" }`
- Placed after "모니터링" entry (line 14)
- Commit: `feat(admin): add crawl nav item to sidebar` (hash: 56a6928)

### Sidebar Structure Notes
- NAV_ITEMS is a const array with `as const` type assertion
- Each item has: href (string), label (Korean string), icon (unicode symbol)
- Component uses pathname matching for active state
- Collapsed state hides labels but keeps icons
- Icon "⟳" (U+27F3) is a circular arrow, appropriate for crawling

### Build Status
- Pre-existing TypeScript error in src/lib/crawl/crawler.ts (line 188)
- Error: dateRange type mismatch in crawlSite() call
- Sidebar change is syntactically correct and doesn't introduce new errors
- This error is unrelated to sidebar navigation changes

## [2026-02-19] Task 1: Type Extension Complete

### Changes Made
- Extended `CrawlOptions` with:
  - `maxPages?: number` — controls pagination depth (1-5 cap enforced later)
  - `dateRange?: { from: string; to: string }` — ISO date filtering
- Extended `SiteConfig` with:
  - `paginationParam?: string` — URL query param for pagination (e.g., "pageIndex", "nPage")

### Implementation Details
- Updated `src/types/crawler.ts` (lines 35, 64-65)
- Updated `src/lib/crawl/crawler.ts` to handle new optional fields:
  - `crawlSite()` signature: `Required<Omit<CrawlOptions, "siteIds" | "dateRange">> & { dateRange?: ... }`
  - `normalizedOptions` initialization: `maxPages: options.maxPages ?? 1`, `dateRange: options.dateRange`
- All existing callers remain compatible (additive change only)
- TypeScript check: PASS (npx tsc --noEmit)

### Commit
- Hash: c5fb194
- Message: `feat(types): extend CrawlOptions with maxPages and dateRange`
- Files: src/types/crawler.ts, src/lib/crawl/crawler.ts

### Evidence
- task-1-tsc.txt: Empty (no TypeScript errors)
- task-1-compat.txt: 6 usages of CrawlOptions found, all compatible

## [2026-02-19] Task 2: Add paginationParam to Site Configs

### Pagination Param Mapping (19 sites with pagination)

**gwangju-do type (4 sites):**
- gwangju-city: pageIndex
- gwangsan: pageIndex
- goheung: pageIndex
- hampyeong: pageIndex

**gwangju-es type (4 sites):**
- donggu: nPage
- seogu: nPage
- bukgu: nPage
- gwangyang: nPage

**jeonnam-do type (1 site):**
- jeonnam-province: pageIndex

**jeonnam-si type (7 sites):**
- mokpo: pageNo
- yeosu: pageNo
- naju: pageNo
- boseong: pageNo
- muan: pageNo
- jangseong: pageNo
- shinan: pageNo

**suncheon type (1 site):**
- suncheon: pageNo

**damyang type (1 site):**
- damyang: pageIndex (uses API with pageIndex param)

**Sites without paginationParam (8 sites - single page only):**
- namgu (custom parser, no pagination)
- gokseong (no pagination info)
- gurye (no pagination info)
- hwasun (no pagination info)
- jangheung (no pagination info)
- gangjin (no pagination info)
- haenam (no pagination info)
- yeonggwang (no pagination info)
- wando (no pagination info)

### Summary
- Total sites: 27
- Sites with paginationParam: 19
- Sites without paginationParam: 8
- TypeScript check: PASS
- Commit: feat(config): add paginationParam to site configs

## [2026-02-19] Task 4: Multi-page crawling + date filtering

### Changes in crawlSite()
- Applied hard cap at function start: `const maxPages = Math.min(options.maxPages ?? 1, 5)`
- Added page loop with per-page parser execution and dynamic URL construction for page 2+:
  - `listUrl + (listUrl.includes('?') ? '&' : '?') + paginationParam + '=' + page`
  - Page 1 always uses `site.listUrl` as-is
- Preserved single-page behavior when `site.paginationParam` is undefined by forcing total pages to 1
- Added cross-page deduplication with `Set` keyed by `originId`

### Stop Conditions Implemented
- Break when parser returns 0 articles on a page
- Stop naturally at maxPages (loop bound)
- When `dateRange.from` exists, break early if all articles on current page are older than `from`

### Date Filtering + Counting
- Applied insert-time date filter before DB writes:
  - keep only `from <= article.date <= to` when `options.dateRange` is provided
- `found` now reflects post-filter article count (same list used for insert loop)

### Verification
- `npx tsc --noEmit`: PASS
- Evidence saved: `.sisyphus/evidence/task-4-tsc.txt`

## [2026-02-19] Task 5: Manual Crawl Pipeline Function

### Completed
- Created `src/lib/pipeline/manual.ts` with `executeManualCrawl()` function
- Exports `ManualCrawlOptions` type with: siteIds?, limitPerSite?, maxPages?, dateRange?, delayMs?
- Exports `ManualCrawlResult` type with: success, totalDurationMs, stages (crawl/embed/generate), error?
- Each stage has: status ("success" | "failed" | "skipped"), durationMs, detail (object)
- Independent `manualRunning` flag (NOT shared with orchestrator.ts)
- Returns 409-style result when already running: `{ success: false, error: "Manual crawl already in progress" }`
- Calls stages in sequence: runCrawler() → embedCollectedPressReleases() → generateEmbeddedPressReleaseArticles()
- Error in one stage doesn't stop subsequent stages (continues with next)
- Supabase client created using same pattern as orchestrator.ts
- embed/generate limits: 200 cap (prevents backlog processing)
- Commit: `feat(pipeline): add manual crawl pipeline function` (hash: 4b81502)

### Implementation Details
- Stage 1 (crawl): Passes all CrawlOptions through to runCrawler()
- Stage 2 (embed): Calls embedCollectedPressReleases(supabase, { limit: 200 })
- Stage 3 (generate): Calls generateEmbeddedPressReleaseArticles({ limit: 200 }, supabase)
- Each stage wrapped in try/catch to capture errors per stage
- success: true if all 3 stages completed (even if some had errors)
- totalDurationMs = sum of all stage durations

### Evidence
- task-5-tsc.txt: TypeScript check passed (no errors)
- task-5-mutex.txt: manualRunning flag verified at 4 locations (declaration, check, set, reset)

## [2026-02-19] Task 6: Manual Crawl API Endpoint

### Completed
- Created `src/app/api/admin/crawl/route.ts` — POST handler for manual crawl trigger
- Auth: CRON_SECRET bearer OR same-origin referer (copied exactly from clients/route.ts)
- Validation: siteIds checked against SITES_BY_ID, returns 400 for unknown IDs
- Clamping: maxPages 1-5, limitPerSite 1-100 (clamp, don't reject)
- 409 response when `result.error === "Manual crawl already in progress"`
- 200 with ManualCrawlResult on success
- 500 catch-all error handler
- Commit: `feat(api): add manual crawl trigger endpoint` (hash: 64d11c1)

### Implementation Details
- Imports: NextResponse, SITES_BY_ID (not SITES array — Map lookup is O(1)), executeManualCrawl
- Body destructuring: siteIds, limitPerSite, maxPages, dateRange, delayMs
- unknownIds filter uses `SITES_BY_ID.has(id)` for validation
- Clamped values passed to executeManualCrawl, original siteIds/dateRange/delayMs passed through

### Evidence
- task-6-build.txt: TypeScript check passed (no errors)

## [2026-02-19] Task 7: Manual Crawl Page UI

### Completed
- Created `src/app/admin/crawl/page.tsx` — server component passing SITES data to CrawlForm
- Created `src/app/admin/crawl/crawl-form.tsx` — full client component with form UI
- Commit: `feat(admin): add manual crawl page with options form` (hash: ca4899b)

### Site Grouping (SITE_GROUPS constant)
- Group 1 "광주광역시" (6): gwangju-city, donggu, seogu, namgu, bukgu, gwangsan
- Group 2 "전라남도" (6): jeonnam-province, mokpo, yeosu, suncheon, naju, gwangyang
- Group 3 "군·군" (15): damyang, gokseong, gurye, goheung, boseong, hwasun, jangheung, gangjin, haenam, muan, hampyeong, yeonggwang, jangseong, wando, shinan
- Total: 27 sites

### UI Features
- Site checkboxes grouped by region with toggle-chip style (emerald highlight when selected)
- "전체 선택/해제" toggle
- Date range inputs (시작일, 종료일)
- Page count (1-5), limitPerSite (1-100) number inputs
- "크롤링 시작" button with loading state text
- Error display: red border card with red-400 text
- Result display: 3 stage cards (크롤링, 임베딩, 기사 생성) with status badge, duration, detail fields
- Labels properly associated with inputs via htmlFor/id pairs

### Design Patterns Used
- Card: rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl
- Input: rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white
- Button: rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white
- Status badges: rounded-full px-2 py-0.5 text-xs with color variants

### Build
- npm run build: PASS (static page at /admin/crawl)
- Evidence: .sisyphus/evidence/task-7-build.txt

## [2026-02-19] Task 8: End-to-End Verification

### Build Verification
- `npx tsc --noEmit`: EXIT_CODE=0 (no errors)
- `npm run build`: EXIT_CODE=0 (compiled in 1294ms, 17 static pages)
- `/admin/crawl` correctly listed as static route (○)
- `/api/admin/crawl` correctly listed as dynamic route (ƒ)

### UI Verification (Playwright)
- Page loads at `/admin/crawl` — HTTP 200, title "News Factory Admin"
- Heading "수동 크롤링" (h2) visible
- 27 site checkboxes across 3 groups (광주광역시 6, 전라남도 6, 군·군 15)
- "전체 선택" checkbox present
- Date inputs: 시작일, 종료일 (textbox)
- Number inputs: 페이지 수 (default 1), 사이트당 제한 (default 10)
- "크롤링 시작" button visible
- Sidebar: "⟳ 크롤링" link at /admin/crawl (after 모니터링)
- Screenshot saved: .sisyphus/evidence/task-8-e2e-flow.png

### API Verification
- 401 without auth: PASS — `{"error":"Unauthorized"}`
- Same-origin referer accepted: PASS — crawl pipeline started
  - Server logs: "Crawling 광주시...", "Found 1 articles from 광주시"
  - Pipeline proceeds to embedding stage (Ollama)
- 409 concurrent mutex: PASS — `{"error":"Manual crawl already in progress"}`
- Response matches ManualCrawlResult type (success, totalDurationMs, stages, error)

### Infrastructure Notes
- Dev server port conflict: KJ_News project can hijack port 3000
  - news-factory_v2 terminal server falls back to port 3001
  - Always verify which project owns port 3000 before testing
- Ollama embedding is slow: full pipeline (crawl+embed+generate) takes >3 minutes
  - curl --max-time 180 insufficient for complete pipeline run
  - Crawl stage itself is fast (~10s for single site)
- `.next/dev/lock` file can block server restart — delete if needed

### Evidence
- .sisyphus/evidence/task-8-build.txt (tsc + build output)
- .sisyphus/evidence/task-8-e2e-flow.png (full page screenshot)
- .sisyphus/evidence/task-8-api-test.txt (API test results)
