# Learnings — image-pipeline-fix

## 2026-02-19 — Initial Context

### File Structure
- `src/types/article.ts` — PressReleaseForArticleGeneration type (lines 13-20)
- `src/lib/ai/batch-generate.ts` — Core pipeline file (180 lines)
- `scripts/seed.ts` — Supabase client pattern reference

### Exact Code State (Pre-Fix)
**article.ts:13-20** — Missing `images: string[]`:
```ts
export type PressReleaseForArticleGeneration = {
  id: string; source: string; title: string;
  content: string; link: string; published_at: string;
  // MISSING: images: string[]
};
```

**batch-generate.ts:43** — Missing images in select:
`.select("id,source,title,content,link,published_at")`

**batch-generate.ts:65** — Hardcoded empty images:
`images: [],`

**batch-generate.ts:100** — Missing images in select:
`.select("id,source,title,content,link,published_at,status")`

### Supabase Client Pattern (from seed.ts)
```ts
const supabase = createClient(
  requiredEnv("SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
);
```
- Use `dotenv` or rely on tsx auto-loading `.env.local`
- `requiredEnv(name)` pattern: check process.env[name], exit(1) if missing

### DB Schema (from migrations)
- `press_releases.images` — `jsonb NOT NULL DEFAULT '[]'`
- `articles.images` — `jsonb NOT NULL DEFAULT '[]'`
- `articles.press_release_id` — FK to press_releases.id

### Guardrails (CRITICAL)
- DO NOT modify: prompts.ts, ollama.ts, API routes, parser files, crawler.ts
- `images` MUST be `string[]` (NOT optional, NOT nullable)
- DO NOT add images to `GeneratedArticle` type

## 2026-02-19 — Task 3: Backfill Images Script

### Completed
- Created `scripts/backfill-images.ts` (153 lines)
- Follows exact patterns from `audit-images.ts` and `seed.ts`:
  - Custom `loadEnvLocal()` function for .env.local loading
  - `requiredEnv()` helper for env validation
  - Supabase client with service key auth
  - Proper error handling and exit codes

### Script Logic
1. Fetch all articles with `id, press_release_id, images`
2. Filter to articles where `images.length === 0`
3. Get unique press_release_ids from filtered articles
4. Fetch all relevant press_releases in single query (efficient batching)
5. Build lookup map: `Map<press_release_id, images>`
6. For each empty-image article:
   - Get images from press_release via lookup
   - If images.length > 0: UPDATE article.images
   - If images.length === 0: SKIP (no-op safety check)
7. Print: `Updated N articles with images from press_releases`
8. Print: `Skipped M articles (no images in source press_release)`

### Execution Results
```
Total articles: 23
Articles with empty images: 23
Updated 18 articles with images from press_releases
Skipped 5 articles (no images in source press_release)
```

### Evidence
- Output saved: `.sisyphus/evidence/task-3-backfill-result.txt`
- Commit: `8ff66a2 chore(scripts): add image backfill script for existing articles`

### Key Implementation Details
- Used Option 1 (client-side filtering) for empty array detection: `Array.isArray(a.images) && a.images.length === 0`
- Efficient batching: fetch all articles once, then all press_releases in single query
- Type-safe: interfaces for Article and PressRelease
- Safe: skips articles where press_release has no images (no-op condition)

## 2026-02-19 — Task 4: End-to-End Verification

### Results
- **Build**: PASS — Next.js 16.1.6, exit 0, no TS errors
- **DB**: 18/23 articles have images, 10/10 cross-checks match PR images, 0 mismatches
- **API**: Both route.ts and [id]/route.ts have images in select + response mapping
- **Pipeline**: press_releases.images → batch-generate.ts → articles.images → API ✅

### Evidence Files
- `.sisyphus/evidence/task-4-final-build.txt`
- `.sisyphus/evidence/task-4-api-check.txt`
- `.sisyphus/evidence/task-4-db-verify.txt`
- `.sisyphus/evidence/task-4-summary.txt`

### VERDICT: PASS — Full pipeline verified end-to-end

## 2026-02-19 — F4: Scope Fidelity Findings

### Task Commit Scope (HEAD~3..HEAD)
- `4d02d75` changed only `src/types/article.ts` and `src/lib/ai/batch-generate.ts`
- `720173b` created only `scripts/audit-images.ts`
- `8ff66a2` created only `scripts/backfill-images.ts`
- Combined changed files are exactly the 4 planned files (no extra files in the 3 task commits)

### Must-NOT-Have Check Notes
- `src/lib/ai/prompts.ts`: no `images` references found
- `src/lib/ai/ollama.ts`: no `images` references found
- `git diff HEAD~4 -- src/app/api/v1/`: no API route changes in the last 4 commits
- `git diff HEAD~4 -- src/lib/crawl/crawler.ts`: no crawler changes in the last 4 commits
- `git diff HEAD~4 -- src/lib/crawl/parsers/`: non-empty due to parser edits in the 4th most recent commit (`ad0db62`), not in the 3 task commits
