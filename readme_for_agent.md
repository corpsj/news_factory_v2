# news-factory_v2 — Exhaustive Technical Reference for AI Agent Handoff

> **Purpose of this document**: Enable an AI agent to fully understand every module, function, type, constant, database interaction, API contract, error handling pattern, and operational workflow in this project — without needing to read source code. This document IS the source of truth for continuing development.

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Tech Stack & Runtime](#2-tech-stack--runtime)
3. [Architecture Overview](#3-architecture-overview)
4. [Directory Structure (Complete)](#4-directory-structure-complete)
5. [Environment Variables](#5-environment-variables)
6. [Database Schema (Inferred from Source)](#6-database-schema-inferred-from-source)
7. [Type System](#7-type-system)
8. [Configuration: Sites Registry](#8-configuration-sites-registry)
9. [Crawler Engine](#9-crawler-engine)
10. [Parser System](#10-parser-system)
11. [HTTP Client](#11-http-client)
12. [Date Parser](#12-date-parser)
13. [Pipeline Orchestration](#13-pipeline-orchestration)
14. [Manual Pipeline (Admin Crawl)](#14-manual-pipeline-admin-crawl)
15. [AI / Processing Layer](#15-ai--processing-layer)
16. [Authentication System](#16-authentication-system)
17. [Rate Limiting](#17-rate-limiting)
18. [CORS](#18-cors)
19. [Middleware](#19-middleware)
20. [Crawl Monitor Service](#20-crawl-monitor-service)
21. [API Routes (Complete)](#21-api-routes-complete)
22. [Admin Dashboard Pages](#22-admin-dashboard-pages)
23. [Scripts (CLI)](#23-scripts-cli)
24. [GitHub Actions](#24-github-actions)
25. [Data Flow (End-to-End)](#25-data-flow-end-to-end)
26. [Module Dependency Graph](#26-module-dependency-graph)
27. [Error Handling Patterns](#27-error-handling-patterns)
28. [Constants & Magic Values](#28-constants--magic-values)
29. [Development Guide](#29-development-guide)
30. [Known Architectural Decisions](#30-known-architectural-decisions)

---

## 1. Project Identity

- **Name**: news-factory_v2
- **Purpose**: Automated press release aggregation from 27 South Korean local government websites (광주광역시 and 전라남도 region). Crawls official municipal press release pages, stores raw data, generates articles (currently in passthrough mode — copies press release content directly without AI transformation), and serves them via authenticated REST API.
- **Current State**: Production-ready. All AI generation code exists but operates in passthrough mode — `batch-generate.ts` copies press release title/body directly into articles instead of calling OpenRouter for generation. Embedding infrastructure (`embedding.ts`, `batch-embed.ts`) is fully wired and operational.
- **Region Coverage**: Gwangju Metropolitan City (광주광역시) — 6 districts + city hall; Jeonnam Province (전라남도) — 20 municipalities + province office.

---

## 2. Tech Stack & Runtime

| Component | Version / Detail |
|---|---|
| Runtime | Node.js 22+ (uses native `fetch`, no polyfill) |
| Framework | Next.js 16.1.6 (App Router, React Server Components) |
| React | 19.2.3 |
| Language | TypeScript 5.x, `strict: true` in tsconfig |
| Database | Supabase (PostgreSQL with `pgvector` extension for 1024-dim embeddings) |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss` PostCSS plugin |
| Package Manager | npm (lockfile: `package-lock.json`) |
| Bundler | Turbopack (enabled in `next.config.ts` via `turbopack` key) |
| HTML Parsing | Cheerio 1.2.0 (listed in `serverExternalPackages` in next.config.ts) |
| HTTP Client | Axios 1.13.5 (for crawler requests only; API routes use native fetch) |
| Concurrency | p-limit 7.3.0 (ESM-only package) |
| Password Hashing | bcryptjs 3.0.3 |
| Testing | Playwright 1.58.2 (devDependency, no test files currently exist) |

### `next.config.ts`
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ["cheerio"],
  turbopack: {},
};
```

### `tsconfig.json` (key settings)
```json
{
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### `package.json` scripts
```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

### All Production Dependencies
- `@supabase/supabase-js` ^2.95.3
- `axios` ^1.13.5
- `bcryptjs` ^3.0.3
- `cheerio` ^1.2.0
- `next` 16.1.6
- `p-limit` ^7.3.0
- `react` 19.2.3
- `react-dom` 19.2.3

### All Dev Dependencies
- `@playwright/test` ^1.58.2
- `@tailwindcss/postcss` ^4
- `@types/bcryptjs` ^2.4.6
- `@types/node` ^20
- `@types/react` ^19
- `@types/react-dom` ^19
- `eslint` ^9
- `eslint-config-next` 16.1.6
- `playwright` ^1.58.2
- `tailwindcss` ^4
- `typescript` ^5

---

## 3. Architecture Overview

The system has four layers:

```
┌──────────────────────────────────────────────────────────┐
│  TRIGGER LAYER                                           │
│  GitHub Actions cron (3x daily) → scripts/run-pipeline.ts│
│  Admin Dashboard → POST /api/admin/crawl (streaming)     │
│  Cron Route → GET /api/cron/crawl (scheduled)            │
└──────────────┬───────────────────────────────┬────────────┘
               │                               │
┌──────────────▼───────────────┐ ┌─────────────▼────────────┐
│  INGESTION LAYER             │ │  PROCESSING LAYER        │
│  orchestrator.ts             │ │  batch-generate.ts       │
│    → crawler.ts              │ │    → passthrough copy    │
│      → parsers/* (18 types)  │ │  batch-embed.ts          │
│      → http.ts (Axios)       │ │    → embedding.ts        │
│      → date.ts               │ │      → OpenRouter API    │
└──────────────┬───────────────┘ └─────────────┬────────────┘
               │                               │
┌──────────────▼───────────────────────────────▼────────────┐
│  PERSISTENCE LAYER                                        │
│  Supabase PostgreSQL                                      │
│  Tables: press_releases, articles, clients, crawl_logs,   │
│          crawl_settings                                   │
│  Extension: pgvector (1024-dim embeddings)                │
└──────────────┬────────────────────────────────────────────┘
               │
┌──────────────▼────────────────────────────────────────────┐
│  PRESENTATION / DISTRIBUTION LAYER                        │
│  Admin Dashboard (8 pages, cookie auth)                   │
│  Public API v1 (Bearer token auth, rate limited)          │
│  Password page (entry gate)                               │
└───────────────────────────────────────────────────────────┘
```

---

## 4. Directory Structure (Complete)

```
news-factory_v2/
├── .github/
│   └── workflows/
│       └── cron-pipeline.yml              # GitHub Actions: 3x daily cron + manual dispatch
├── docs/
│   ├── api-guide.md                       # External API documentation for clients
│   └── local-server-migration.md          # Migration guide (historical reference)
├── scripts/                               # CLI scripts, all run via `npx tsx scripts/{name}.ts`
│   ├── run-pipeline.ts                    # Full pipeline: crawl → publish (129 lines)
│   ├── crawl.ts                           # Crawl-only mode
│   ├── generate.ts                        # Article generation only
│   ├── embed.ts                           # Embedding generation only
│   ├── list-sites.ts                      # Print all configured sites
│   ├── test-crawl.ts                      # Test a site's list page parsing
│   ├── test-detail.ts                     # Test a specific detail page URL
│   ├── count-pr.ts                        # Count press releases in DB
│   ├── reprocess.ts                       # Re-generate articles from existing PRs
│   ├── reset-articles.ts                  # Delete all articles
│   ├── delete-all-prs.ts                  # Delete all press releases
│   ├── check-crawl-settings.ts            # Print crawl_settings table
│   └── setup-crawl-settings.ts            # Populate crawl_settings from sites.ts
├── src/
│   ├── app/                               # Next.js App Router
│   │   ├── layout.tsx                     # Root layout with Geist font, Tailwind
│   │   ├── page.tsx                       # Root page: redirects to /admin
│   │   ├── globals.css                    # Tailwind v4 imports
│   │   ├── password/
│   │   │   └── page.tsx                   # Login page (client component, 76 lines)
│   │   ├── admin/
│   │   │   ├── layout.tsx                 # Admin layout with sidebar navigation
│   │   │   ├── page.tsx                   # Dashboard home (redirects or overview)
│   │   │   ├── articles/
│   │   │   │   └── page.tsx               # Article list management
│   │   │   ├── press-releases/
│   │   │   │   └── page.tsx               # Press release list management
│   │   │   ├── crawl/
│   │   │   │   └── page.tsx               # Manual crawl trigger UI (streaming)
│   │   │   ├── monitoring/
│   │   │   │   └── page.tsx               # Crawl health monitoring
│   │   │   ├── pipeline/
│   │   │   │   └── page.tsx               # Pipeline run history
│   │   │   ├── clients/
│   │   │   │   └── page.tsx               # API client management
│   │   │   └── settings/
│   │   │       └── page.tsx               # Crawl settings per site
│   │   └── api/
│   │       ├── auth/
│   │       │   └── verify-password/
│   │       │       └── route.ts           # POST: password verification
│   │       ├── cron/
│   │       │   └── crawl/
│   │       │       └── route.ts           # GET: cron-triggered pipeline (98 lines)
│   │       ├── v1/
│   │       │   └── articles/
│   │       │       ├── route.ts           # GET: public article listing (109 lines)
│   │       │       └── [id]/
│   │       │           └── route.ts       # GET: single article by ID
│   │       └── admin/
│   │           ├── crawl/
│   │           │   └── route.ts           # POST: manual crawl with streaming (85 lines)
│   │           ├── crawl-status/
│   │           │   └── route.ts           # GET: current crawl engine status
│   │           ├── crawl-settings/
│   │           │   └── route.ts           # GET/PUT: per-site crawl configuration
│   │           ├── clients/
│   │           │   └── route.ts           # GET/POST: API client management (104 lines)
│   │           ├── articles/
│   │           │   ├── route.ts           # GET: admin article listing
│   │           │   ├── [id]/
│   │           │   │   └── route.ts       # GET/PUT/DELETE: single article CRUD
│   │           │   └── bulk-delete/
│   │           │       └── route.ts       # POST: bulk article deletion
│   │           ├── press-releases/
│   │           │   ├── route.ts           # GET: admin PR listing
│   │           │   ├── [id]/
│   │           │   │   └── route.ts       # GET/PUT/DELETE: single PR CRUD
│   │           │   └── bulk-delete/
│   │           │       └── route.ts       # POST: bulk PR deletion
│   │           ├── monitoring/
│   │           │   └── route.ts           # GET: crawl monitoring data
│   │           ├── pipeline-runs/
│   │           │   └── route.ts           # GET: pipeline execution history
│   │           └── trigger-crawl/
│   │               └── route.ts           # POST: quick manual trigger
│   ├── components/
│   │   └── admin/                         # React components for admin UI
│   │       ├── Sidebar.tsx                # Navigation sidebar (8 menu items)
│   │       └── ...                        # Other admin components
│   ├── config/
│   │   └── sites.ts                       # Site registry: 27 sites, 12 selector configs (375 lines)
│   ├── lib/
│   │   ├── supabase.ts                    # Supabase client factory
│   │   ├── ai/
│   │   │   ├── batch-generate.ts          # Article generation/passthrough (208 lines)
│   │   │   ├── batch-embed.ts             # Batch embedding processor (90 lines)
│   │   │   └── embedding.ts              # OpenRouter embedding API client (122 lines)
│   │   ├── api/
│   │   │   ├── auth.ts                    # Bearer token authentication (153 lines)
│   │   │   ├── cors.ts                    # CORS header utilities (22 lines)
│   │   │   └── rate-limit.ts              # In-memory rate limiter (75 lines)
│   │   ├── crawl/
│   │   │   ├── crawler.ts                 # Core crawl engine (287 lines)
│   │   │   ├── http.ts                    # Axios HTTP client factory (97 lines)
│   │   │   ├── date.ts                    # Korean date string parser (27 lines)
│   │   │   └── parsers/
│   │   │       ├── index.ts               # Parser registry — maps ParserType → SiteParser (40 lines)
│   │   │       ├── common.ts              # Shared parser logic: parseWithPattern() (433 lines)
│   │   │       ├── gwangju-do.ts          # Parser for Gwangju-style DO sites
│   │   │       ├── gwangju-es.ts          # Parser for Gwangju ES-type sites
│   │   │       ├── gwangju-es-nolist.ts   # Parser for ES sites without table list
│   │   │       ├── namgu.ts               # Parser for Namgu district
│   │   │       ├── jeonnam-do.ts          # Parser for Jeonnam province
│   │   │       ├── jeonnam-si.ts          # Parser for Jeonnam city-level sites
│   │   │       ├── suncheon.ts            # Parser for Suncheon city
│   │   │       ├── mokpo.ts               # Parser for Mokpo city
│   │   │       ├── damyang.ts             # Parser for Damyang county
│   │   │       ├── gokseong.ts            # Parser for Gokseong county
│   │   │       ├── gurye.ts               # Parser for Gurye county
│   │   │       ├── boseong.ts             # Parser for Boseong county
│   │   │       ├── hwasun.ts              # Parser for Hwasun county
│   │   │       ├── gangjin.ts             # Parser for Gangjin county
│   │   │       ├── haenam.ts              # Parser for Haenam county
│   │   │       ├── yeonggwang.ts          # Parser for Yeonggwang county
│   │   │       ├── wando.ts               # Parser for Wando county
│   │   │       └── shinan.ts              # Parser for Shinan county
│   │   ├── pipeline/
│   │   │   ├── orchestrator.ts            # Automated pipeline orchestration (215 lines)
│   │   │   └── manual.ts                  # Manual crawl with streaming events (223 lines)
│   │   └── services/
│   │       └── crawl-monitor.ts           # Crawl health monitoring service (307 lines)
│   ├── middleware.ts                       # Cookie-based admin auth guard (26 lines)
│   └── types/
│       ├── article.ts                     # Article-related types and constants
│       ├── crawler.ts                     # Crawler-related types (ParserType, SiteConfig, etc.)
│       └── embedding.ts                   # Embedding types and constants
├── supabase/
│   └── migrations/                        # SQL migration files (apply sequentially)
├── .env.example                           # Environment variable template (8 vars)
├── .gitignore                             # Includes .sisyphus/, supabase/.temp/
├── next.config.ts                         # Next.js configuration
├── package.json                           # Dependencies and scripts
├── postcss.config.mjs                     # PostCSS: @tailwindcss/postcss
├── tsconfig.json                          # TypeScript strict configuration
├── readme_for_human.md                    # Human-readable README (Korean)
└── readme_for_agent.md                    # THIS FILE
```

---

## 5. Environment Variables

Defined in `.env.example`, loaded via Next.js `.env.local` (or `.env` for scripts using `@next/env`):

| Variable | Required | Description | Used By |
|---|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL (e.g., `https://xxx.supabase.co`) | All DB operations |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key (bypasses RLS) | All server-side DB operations |
| `SUPABASE_ANON_KEY` | Yes | Anon/public key | Client-side Supabase (if any) |
| `OPENROUTER_API_KEY` | For embeddings | OpenRouter API authentication | `embedding.ts` |
| `OPENROUTER_MODEL` | No | Model for article generation (currently unused in passthrough mode) | Reserved |
| `OPENROUTER_EMBED_MODEL` | No | Embedding model. Default: `openai/text-embedding-3-small` | `embedding.ts` |
| `CRON_SECRET` | Yes | Bearer token for cron route authentication | `cron/crawl/route.ts`, `admin/crawl/route.ts` |
| `SITE_PASSWORD` | Yes | Plaintext password for admin dashboard login | `verify-password/route.ts` |
| `ALLOW_INSECURE_TLS` | No | Set to `"1"` to disable TLS certificate validation for crawler | `http.ts` |

**Note on `@next/env`**: Scripts in `scripts/` use `loadEnvConfig()` from `@next/env` to load `.env.local` before execution. This means scripts share the same env configuration as the Next.js app.

---

## 6. Database Schema (Inferred from Source)

All tables live in Supabase PostgreSQL. Schema is inferred from actual queries in source code (column names, types, and usage patterns observed in `crawler.ts`, `batch-generate.ts`, `auth.ts`, etc.).

### 6.1 `press_releases`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, auto-generated | Row identifier |
| `origin_id` | text | UNIQUE, NOT NULL | Site-specific dedup key. Format: `{siteId}-{numericId}` (e.g., `gwangju-city-12345`) |
| `source` | text | NOT NULL | Site ID from `sites.ts` (e.g., `"gwangju-city"`) |
| `title` | text | NOT NULL | Original press release title |
| `content` | text | | Full HTML body content |
| `link` | text | | Source URL of the detail page |
| `images` | jsonb | Default `[]` | Array of image URL strings extracted from content |
| `attachments` | jsonb | Default `[]` | Array of attachment objects `{name, url}` |
| `published_at` | timestamptz | | Original publication date parsed from site |
| `status` | text | NOT NULL | Lifecycle state: `'collected'` → `'embedded'` → `'processed'` |
| `embedding` | vector(1024) | Nullable | pgvector embedding from OpenRouter |
| `created_at` | timestamptz | Default `now()` | Row creation timestamp |
| `processed_at` | timestamptz | Nullable | When article generation completed |

**Status lifecycle**:
- `'collected'` — Freshly crawled, not yet processed
- `'embedded'` — Embedding generated, awaiting article creation
- `'processed'` — Article has been created from this PR

**Key queries from source code**:
```sql
-- Duplicate check (crawler.ts → insertArticle)
SELECT id FROM press_releases WHERE origin_id = $1

-- Insert new PR (crawler.ts → insertArticle)
INSERT INTO press_releases (origin_id, source, title, content, link, images, attachments, published_at, status)

-- Update status to processed (crawler.ts → insertArticle, passthrough mode)
UPDATE press_releases SET status = 'processed', processed_at = now() WHERE id = $1

-- Fetch unprocessed for article generation (batch-generate.ts)
SELECT * FROM press_releases WHERE status IN ('collected', 'embedded') ORDER BY published_at ASC LIMIT $1

-- Fetch for embedding (batch-embed.ts)
SELECT * FROM press_releases WHERE status = 'collected' AND embedding IS NULL LIMIT $1

-- Update with embedding (batch-embed.ts)
UPDATE press_releases SET embedding = $1, status = 'embedded' WHERE id = $2
```

### 6.2 `articles`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, auto-generated | Row identifier |
| `press_release_id` | uuid | FK → press_releases.id | Source press release |
| `title` | text | NOT NULL | Article title (in passthrough: same as PR title) |
| `summary` | text | Nullable | Article summary |
| `body` | text | | Article body HTML (in passthrough: cleaned PR content) |
| `category` | text | | Article category. In passthrough mode: always `'press_release'` |
| `source` | text | | Source site name (human readable, e.g., `"광주시청"`) |
| `source_url` | text | | Original press release URL |
| `images` | jsonb | Default `[]` | Image URLs from press release |
| `region` | text | | Geographic region |
| `status` | text | | Article status. Passthrough sets: `'available'` |
| `published_at` | timestamptz | | Publication timestamp |
| `processed_at` | timestamptz | | When processing completed |
| `created_at` | timestamptz | Default `now()` | Row creation timestamp |

**Key queries from source code**:
```sql
-- Insert article (crawler.ts → insertArticle, passthrough mode)
INSERT INTO articles (press_release_id, title, summary, body, category, source, source_url, images, region, status, published_at, processed_at)

-- Public API query (v1/articles/route.ts)
SELECT id, title, summary, body AS content, category, source, source_url, images, published_at, processed_at
FROM articles
WHERE status = $status
  AND ($region IS NULL OR region = $region)
  AND ($category IS NULL OR category = $category)
  AND ($keyword IS NULL OR title ILIKE '%' || $keyword || '%')
  AND ($from IS NULL OR published_at >= $from)
  AND ($to IS NULL OR published_at <= $to)
ORDER BY published_at DESC
LIMIT $limit OFFSET $offset
```

### 6.3 `clients`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, auto-generated | Row identifier |
| `name` | text | NOT NULL | Client display name |
| `api_key_hash` | text | NOT NULL | bcrypt hash of the full API key (cost factor 12) |
| `api_key_prefix` | text | Nullable | First 12 characters of the API key (for fast lookup) |
| `api_key_last4` | text | | Last 4 characters (for display in admin UI) |
| `is_active` | boolean | Default `true` | Whether client can make requests |
| `request_count` | integer | Default `0` | Total requests made (incremented on each auth) |
| `rate_limit` | integer | | Per-minute rate limit (currently unused — in-memory limiter is global) |
| `last_used_at` | timestamptz | Nullable | Last successful API request timestamp |
| `deleted_at` | timestamptz | Nullable | Soft delete timestamp |
| `created_at` | timestamptz | Default `now()` | Row creation timestamp |

**API key format**: `nf_live_{64 hex characters}` (total length: 72 characters)

**Key queries from source code**:
```sql
-- Fast lookup by prefix (auth.ts)
SELECT * FROM clients WHERE api_key_prefix = $prefix AND is_active = true AND deleted_at IS NULL

-- Fallback: scan all clients with null prefix (auth.ts, for legacy keys)
SELECT * FROM clients WHERE api_key_prefix IS NULL AND is_active = true AND deleted_at IS NULL

-- Track usage (auth.ts)
UPDATE clients SET last_used_at = now(), request_count = request_count + 1 WHERE id = $id

-- Admin list (admin/clients/route.ts)
SELECT id, name, api_key_prefix, api_key_last4, is_active, request_count, last_used_at, created_at
FROM clients WHERE deleted_at IS NULL ORDER BY created_at DESC

-- Create client (admin/clients/route.ts)
INSERT INTO clients (name, api_key_hash, api_key_prefix, api_key_last4)
```

### 6.4 `crawl_logs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, auto-generated | Row identifier |
| `site_name` | text | NOT NULL | Site identifier or pipeline stage name |
| `site_url` | text | | Base URL of the crawled site |
| `status` | text | NOT NULL | `'success'`, `'failed'`, or `'partial'` |
| `articles_found` | integer | Default `0` | Total articles discovered on list pages |
| `articles_new` | integer | Default `0` | New articles inserted (not duplicates) |
| `error_message` | text | Nullable | Error details if status is failed |
| `started_at` | timestamptz | | When crawl began |
| `completed_at` | timestamptz | | When crawl finished |
| `created_at` | timestamptz | Default `now()` | Row creation timestamp |

**Special `site_name` values used by orchestrator**:
- `"pipeline:crawl"` — Log entry for the crawl stage of automated pipeline
- `"pipeline:publish"` — Log entry for the publish stage of automated pipeline

**Key queries from source code**:
```sql
-- Write crawl log (crawler.ts → writeCrawlLog)
INSERT INTO crawl_logs (site_name, site_url, status, articles_found, articles_new, error_message, started_at, completed_at)

-- Monitoring: latest log per site (crawl-monitor.ts)
SELECT DISTINCT ON (site_name) * FROM crawl_logs
WHERE site_name NOT LIKE 'pipeline:%'
ORDER BY site_name, completed_at DESC

-- Monitoring: recent logs for statistics (crawl-monitor.ts)
SELECT * FROM crawl_logs
WHERE completed_at >= $periodStart AND site_name NOT LIKE 'pipeline:%'
ORDER BY completed_at DESC
```

### 6.5 `crawl_settings`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | integer | PK | Row identifier (id=1 is the global settings row) |
| `enabled_site_ids` | jsonb | | Array of site ID strings that are enabled for cron crawling |
| `schedule_hours` | jsonb | | Array of integers representing KST hours when cron should run |
| `created_at` | timestamptz | Default `now()` | Row creation timestamp |
| `updated_at` | timestamptz | | Last modification timestamp |

**Key queries from source code**:
```sql
-- Load settings for cron (cron/crawl/route.ts)
SELECT * FROM crawl_settings WHERE id = 1

-- The cron route checks: current KST hour ∈ schedule_hours
-- And filters SITES to only those whose id ∈ enabled_site_ids
```

---

## 7. Type System

### 7.1 `src/types/crawler.ts`

```typescript
// All 18 parser type identifiers
type ParserType =
  | "gwangju-do" | "gwangju-es" | "gwangju-es-nolist" | "namgu"
  | "jeonnam-do" | "jeonnam-si" | "suncheon" | "mokpo"
  | "damyang" | "gokseong" | "gurye" | "boseong"
  | "hwasun" | "gangjin" | "haenam" | "yeonggwang"
  | "wando" | "shinan";

// Selector configuration for HTML parsing
interface SiteSelectorConfig {
  listRow: string;           // CSS selector for list page rows
  listTitle: string;         // CSS selector for title within a row
  listDate?: string;         // CSS selector for date within a row
  detailBody: string;        // CSS selector for article body on detail page
  detailTitle?: string;      // CSS selector for title on detail page
  detailDate?: string;       // CSS selector for date on detail page
  attachmentSelector?: string; // CSS selector for file attachments
}

// Full site configuration
interface SiteConfig {
  id: string;                // Unique identifier (e.g., "gwangju-city")
  name: string;              // Korean display name (e.g., "광주시청")
  type: ParserType;          // Which parser to use
  listUrl: string;           // URL of the press release list page
  detailUrlTemplate?: string; // URL template for detail pages (with {id} placeholder)
  idPattern?: RegExp;        // Regex to extract article ID from URL/href
  selectors: SiteSelectorConfig;
  paginationParam?: string;  // Query parameter name for pagination (e.g., "pageIndex", "nPage")
  region?: string;           // Geographic region identifier
}

// Article extracted from crawling
interface ParsedArticle {
  originId: string;          // Format: "{siteId}-{articleNumericId}"
  title: string;
  content: string;           // HTML body
  link: string;              // Full URL to source
  images: string[];          // Array of image URLs
  attachments: { name: string; url: string }[];
  publishedAt: string;       // ISO date string
  source: string;            // Site ID
  siteName: string;          // Human-readable site name
}

// Context passed to parser functions
interface SiteParserContext {
  site: SiteConfig;
  http: ReturnType<typeof createHttpClient>;
  dateRange?: { from?: string; to?: string };
  limit: number;
  maxPages: number;
  signal?: AbortSignal;
}

// Parser function signature — ALL parsers implement this
type SiteParser = (ctx: SiteParserContext) => Promise<ParsedArticle[]>;

// Options for the crawl engine
interface CrawlOptions {
  siteIds?: string[];        // Subset of sites to crawl (default: all)
  limit?: number;            // Max articles per site (default: 5)
  maxPages?: number;         // Max list pages to traverse (default: 5, capped at 5)
  delayMs?: number;          // Delay between sites (default: 900ms)
  siteConcurrency?: number;  // Max parallel site crawls (default: 5)
  dateRange?: { from?: string; to?: string };
  signal?: AbortSignal;
  httpTimeoutMs?: number;
  httpAttempts?: number;
}

// Result from crawling a single site
interface CrawlSiteResult {
  siteId: string;
  siteName: string;
  status: "success" | "failed" | "partial";
  articlesFound: number;
  articlesNew: number;
  error?: string;
}

// Result from a full crawl run
interface CrawlRunResult {
  sites: CrawlSiteResult[];
  totalFound: number;
  totalNew: number;
  startedAt: Date;
  completedAt: Date;
}

// Dependencies injected into crawler
interface CrawlerDependencies {
  supabase: SupabaseClient;
  http: ReturnType<typeof createHttpClient>;
}
```

### 7.2 `src/types/article.ts`

```typescript
// Valid article categories
const ARTICLE_CATEGORIES = [
  "press_release",  // Used by passthrough mode
  "policy",
  "event",
  "welfare",
  "culture",
  "economy",
  "environment",
  "education",
  "health",
  "traffic",
  "safety",
  "etc"
] as const;

type ArticleCategory = typeof ARTICLE_CATEGORIES[number];

// Press release data shape for article generation
interface PressReleaseForArticleGeneration {
  id: string;
  title: string;
  content: string;
  source: string;
  link: string;
  images: string[];
  attachments: { name: string; url: string }[];
  published_at: string;
}

// Options for batch generation
interface BatchGenerateOptions {
  limit?: number;            // Max PRs to process (default: 500)
  signal?: AbortSignal;
}

// Result from batch generation
interface BatchGenerateResult {
  processed: number;
  failed: number;
  skipped: number;
}
```

### 7.3 `src/types/embedding.ts`

```typescript
const EMBEDDING_DIMENSIONS = 1024;
const DEFAULT_EMBED_MODEL = "openai/text-embedding-3-small";

// Input type for embedding generation
type EmbeddingInput = string;
```

---

## 8. Configuration: Sites Registry

**File**: `src/config/sites.ts` (375 lines)

### Exports

```typescript
// Array of all 27 site configurations
export const SITES: SiteConfig[];

// Map for O(1) lookup by site ID
export const SITES_BY_ID: Map<string, SiteConfig>;
// Constructed as: new Map(SITES.map(s => [s.id, s]))
```

### Selector Configs (12 shared configs)

The file defines 12 reusable `SiteSelectorConfig` objects that are shared across sites with similar HTML structures:

1. **gwangjuDoSelectors** — For Gwangju DO-style sites (table-based list, `#contents` body)
2. **gwangjuEsSelectors** — For Gwangju ES-style sites (table-based list with `.bbs_default`)
3. **gwangjuEsNolistSelectors** — For ES sites that use `div.list` instead of `<table>`
4. **namguSelectors** — Namgu-specific layout
5. **jeonnamDoSelectors** — Jeonnam province layout
6. **jeonnamSiSelectors** — Jeonnam city-level sites
7. **suncheonSelectors** — Suncheon-specific layout
8. **mokpoSelectors** — Mokpo-specific layout
9. **damyangSelectors** — Damyang-specific layout
10. **gokseongSelectors** — Gokseong-specific layout
11. **gureyeSelectors** — Gurye-specific layout
12. **Other site-specific selectors** — defined inline for remaining sites

### Complete Site-to-Parser Mapping (27 sites)

| # | Site ID | Korean Name | Parser Type | Pagination Param | Region |
|---|---------|-------------|-------------|------------------|--------|
| 1 | `gwangju-city` | 광주시청 | `gwangju-do` | `pageIndex` | 광주 |
| 2 | `donggu` | 동구청 | `gwangju-es-nolist` | `nPage` | 광주 |
| 3 | `seogu` | 서구청 | `gwangju-es` | `nPage` | 광주 |
| 4 | `namgu` | 남구청 | `namgu` | _(none)_ | 광주 |
| 5 | `bukgu` | 북구청 | `gwangju-es-nolist` | `nPage` | 광주 |
| 6 | `gwangsan` | 광산구청 | `gwangju-do` | `pageIndex` | 광주 |
| 7 | `jeonnam-province` | 전라남도청 | `jeonnam-do` | `pageIndex` | 전남 |
| 8 | `mokpo` | 목포시청 | `mokpo` | `page` | 전남 |
| 9 | `yeosu` | 여수시청 | `jeonnam-si` | `page` | 전남 |
| 10 | `suncheon` | 순천시청 | `suncheon` | `pageNo` | 전남 |
| 11 | `naju` | 나주시청 | `jeonnam-si` | `page` | 전남 |
| 12 | `gwangyang` | 광양시청 | `gwangju-es` | `nPage` | 전남 |
| 13 | `damyang` | 담양군청 | `damyang` | `pageIndex` | 전남 |
| 14 | `gokseong` | 곡성군청 | `gokseong` | _(none)_ | 전남 |
| 15 | `gurye` | 구례군청 | `gurye` | _(none)_ | 전남 |
| 16 | `goheung` | 고흥군청 | `gwangju-do` | `pageIndex` | 전남 |
| 17 | `boseong` | 보성군청 | `boseong` | `pageNo` | 전남 |
| 18 | `hwasun` | 화순군청 | `hwasun` | _(none)_ | 전남 |
| 19 | `jangheung` | 장흥군청 | `wando` | _(none)_ | 전남 |
| 20 | `gangjin` | 강진군청 | `gangjin` | `pageNo` | 전남 |
| 21 | `haenam` | 해남군청 | `haenam` | `nowPageNum` | 전남 |
| 22 | `muan` | 무안군청 | `jeonnam-si` | `pageNo` | 전남 |
| 23 | `hampyeong` | 함평군청 | `gwangju-do` | `pageIndex` | 전남 |
| 24 | `yeonggwang` | 영광군청 | `yeonggwang` | _(none)_ | 전남 |
| 25 | `jangseong` | 장성군청 | `jeonnam-si` | `pageNo` | 전남 |
| 26 | `wando` | 완도군청 | `wando` | _(none)_ | 전남 |
| 27 | `shinan` | 신안군청 | `shinan` | `pageNo` | 전남 |

**Notes**:
- Sites with no `paginationParam` have pagination handled within the parser itself or use a default mechanism.
- `detailUrlTemplate` uses `{id}` placeholder that gets replaced with the extracted article ID.
- `idPattern` is a RegExp that extracts the numeric ID from the article's href or URL.

---

## 9. Crawler Engine

**File**: `src/lib/crawl/crawler.ts` (287 lines)

### Exports

```typescript
export async function runCrawler(
  options: CrawlOptions,
  dependencies: CrawlerDependencies,
  onSiteComplete?: (result: CrawlSiteResult) => void
): Promise<CrawlRunResult>;
```

### Constants

```typescript
const DEFAULT_LIMIT_PER_SITE = 5;    // Max articles to extract per site per run
const DEFAULT_DELAY_MS = 900;        // Delay between site crawl starts (ms)
const DEFAULT_SITE_CONCURRENCY = 5;  // Max sites crawled in parallel
```

### Internal Functions

#### `pickSites(siteIds?: string[]): SiteConfig[]`
- If `siteIds` provided: filters `SITES_BY_ID` Map to matching IDs, silently skips unknown IDs
- If not provided: returns all sites from `SITES` array

#### `crawlSite(ctx: SiteParserContext, deps: CrawlerDependencies): Promise<CrawlSiteResult>`
1. Looks up parser in `PARSERS` registry by `ctx.site.type`
2. Calls parser function: `parser(ctx)` → returns `ParsedArticle[]`
3. For each parsed article, calls `insertArticle(deps, article)`
4. Counts new inserts vs. duplicates
5. Returns `CrawlSiteResult` with status, counts
6. On error: returns `{ status: "failed", error: error.message }`
7. **Pagination cap**: `maxPages` is capped at 5 regardless of input (`Math.min(maxPages, 5)`)

#### `insertArticle(deps: CrawlerDependencies, article: ParsedArticle): Promise<boolean>`
**This is the critical data insertion function. It does TWO inserts in one flow (passthrough mode):**

1. **Duplicate check**: `SELECT id FROM press_releases WHERE origin_id = $originId`
   - If exists → returns `false` (skip)
2. **Insert press release**: Inserts into `press_releases` with `status: 'processed'` (already set to processed because passthrough creates article immediately)
3. **Insert article** (passthrough): Creates corresponding `articles` row with:
   - `category: 'press_release'`
   - `status: 'available'`
   - `body`: result of `contentToArticleBody(article.content)` (from `batch-generate.ts`)
   - `source`: `article.siteName` (Korean name)
   - `source_url`: `article.link`
   - `images`: `article.images`
   - `published_at`: `article.publishedAt`
   - `processed_at`: `new Date().toISOString()`
4. Returns `true` if successfully inserted

#### `writeCrawlLog(deps: CrawlerDependencies, site: SiteConfig, result: CrawlSiteResult, startedAt: Date): Promise<void>`
- Inserts into `crawl_logs` table:
  - `site_name`: `site.id`
  - `site_url`: `site.listUrl`
  - `status`: result.status
  - `articles_found`: result.articlesFound
  - `articles_new`: result.articlesNew
  - `error_message`: result.error or null
  - `started_at`: startedAt ISO string
  - `completed_at`: `new Date().toISOString()`

### `runCrawler()` Flow

1. Resolves sites via `pickSites(options.siteIds)`
2. Creates `pLimit(siteConcurrency)` concurrency limiter
3. For each site (concurrently within limit):
   a. Creates `SiteParserContext` with resolved options
   b. Records `startedAt`
   c. Calls `crawlSite(ctx, deps)`
   d. Calls `writeCrawlLog(deps, site, result, startedAt)`
   e. Calls `onSiteComplete?.(result)` callback
   f. Waits `delayMs` between site starts (`await new Promise(r => setTimeout(r, delayMs))`)
4. Aggregates all results into `CrawlRunResult`

---

## 10. Parser System

### 10.1 Parser Registry

**File**: `src/lib/crawl/parsers/index.ts` (40 lines)

```typescript
import type { ParserType, SiteParser } from "@/types/crawler";

export const PARSERS: Record<ParserType, SiteParser> = {
  "gwangju-do":        gwangjuDoParser,
  "gwangju-es":        gwangjuEsParser,
  "gwangju-es-nolist": gwangjuEsNolistParser,
  "namgu":             namguParser,
  "jeonnam-do":        jeonnamDoParser,
  "jeonnam-si":        jeonnamSiParser,
  "suncheon":          suncheonParser,
  "mokpo":             mokpoParser,
  "damyang":           damyangParser,
  "gokseong":          gokseongParser,
  "gurye":             guryeParser,
  "boseong":           boseongParser,
  "hwasun":            hwasunParser,
  "gangjin":           gangjinParser,
  "haenam":            haenamParser,
  "yeonggwang":        yeonggwangParser,
  "wando":             wandoParser,
  "shinan":            shinanParser,
};
```

### 10.2 Common Parser Logic

**File**: `src/lib/crawl/parsers/common.ts` (433 lines) — The backbone of all parsing.

#### Main Export: `parseWithPattern()`

```typescript
export async function parseWithPattern(
  ctx: SiteParserContext,
  overrides?: {
    parseListPage?: (html: string, ctx: SiteParserContext) => ListItem[];
    parseDetailPage?: (html: string, url: string, ctx: SiteParserContext) => DetailResult;
    buildListUrl?: (ctx: SiteParserContext, page: number) => string;
    extractArticleId?: (href: string, ctx: SiteParserContext) => string | null;
    buildDetailUrl?: (id: string, ctx: SiteParserContext) => string;
  }
): Promise<ParsedArticle[]>;
```

**Flow**:
1. **Build list URL**: Uses `buildListUrl` override or default (appends `paginationParam` to `site.listUrl`)
2. **Fetch list page**: via `ctx.http.get(url)`
3. **Parse list rows**: Uses `parseListPage` override or default:
   - Load HTML into Cheerio
   - Select rows via `site.selectors.listRow`
   - For each row: extract title (via `listTitle` selector), href, date (via `listDate` selector)
   - Extract article ID from href using `site.idPattern` or `extractArticleId` override
   - Build origin_id as `{siteId}-{articleId}`
4. **Date range filtering**: If `ctx.dateRange` is set, filters articles by `published_at` comparison
5. **Limit enforcement**: Takes at most `ctx.limit` articles
6. **Fetch detail pages**: For each list item:
   - Build detail URL via `buildDetailUrl` override or `detailUrlTemplate`
   - Fetch HTML via `ctx.http.get(detailUrl)`
   - Parse detail page via `parseDetailPage` override or default
7. **Detail page parsing** (default):
   - Extract body HTML via `site.selectors.detailBody`
   - Clean body via `cleanBodyHtml()`
   - Strip noise via `stripNoiseFromBody()`
   - Strip title from body via `stripTitleFromBody()`
   - Extract images via `extractImages()`
   - Extract attachments via `extractAttachments()`
8. **Pagination**: If `articlesFound < limit` and `currentPage < maxPages`, fetches next page
9. **Abort signal**: Checks `ctx.signal?.aborted` before each page fetch

#### `stripNoiseFromBody(html: string): string`
Removes the following patterns from HTML body:
- 공공누리 (Korea Open Government License) badges and related text
- Navigation labels ("이전글", "다음글", "목록" etc.)
- Social media share buttons
- "담당부서", "담당자", "연락처" footer blocks
- Empty paragraphs and divs
- Common government website noise strings

#### `cleanBodyHtml(html: string): string`
- Strips `<script>` and `<style>` tags entirely
- Removes empty elements (elements with no text content)
- Unwraps decorative tags (`<span>`, `<font>`) — keeps their children but removes the wrapper
- Preserves structural HTML (`<p>`, `<div>`, `<table>`, `<ul>`, `<ol>`, `<img>`)

#### `stripTitleFromBody(html: string, title: string): string`
- Checks the first 3 child elements of the body container
- If any element's text content matches the title (exact or trimmed), removes that element
- Prevents title duplication in article body

#### `isNonContentImage(url: string, alt?: string): boolean`
Returns `true` (skip this image) if URL or alt text matches:
- License badges: `gonggong`, `nuri`, `creative_commons`
- SNS icons: `sns`, `facebook`, `twitter`, `kakaostory`, `blog`
- File type icons: `hwp`, `pdf`, `doc`, `xls`, `zip`
- Logo images: `logo`, `emblem`, `ci_`, `symbol`
- QR codes: `qr`, `qrcode`
- Spacer images: `blank`, `spacer`, `pixel`
- Images smaller than threshold (by filename pattern)

#### `extractImages(cheerioRoot: CheerioAPI, bodySelector: string): string[]`
1. Selects all `<img>` tags within the body selector
2. Gets `src` attribute, resolves relative URLs to absolute
3. Filters out non-content images via `isNonContentImage()`
4. Deduplicates by URL
5. Returns array of absolute image URLs

#### `extractAttachments(cheerioRoot: CheerioAPI, selector?: string): {name: string, url: string}[]`
1. Uses custom `attachmentSelector` from site config, or falls back to scanning all `<a>` tags
2. Identifies file links by extension: `.pdf`, `.hwp`, `.hwpx`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.zip`, `.rar`, `.7z`, `.tar`, `.gz`
3. Also matches `download` attribute or `javascript:download` href patterns
4. Returns array of `{name, url}` objects

### 10.3 Site-Specific Parsers

Each parser file exports a single function implementing `SiteParser`. Most parsers call `parseWithPattern(ctx, overrides)` with site-specific overrides. The overrides typically customize:

- **`parseListPage`**: When the site's list HTML structure differs from the default table/row pattern
- **`extractArticleId`**: When the article ID is embedded in a non-standard URL pattern (e.g., JavaScript onclick handlers, query parameters with non-standard names)
- **`buildDetailUrl`**: When the detail page URL construction requires special logic
- **`buildListUrl`**: When pagination uses non-standard URL patterns
- **`parseDetailPage`**: When the detail page has a unique structure

**Example pattern** (most parsers follow this):
```typescript
// src/lib/crawl/parsers/gwangju-do.ts
export const gwangjuDoParser: SiteParser = (ctx) => {
  return parseWithPattern(ctx, {
    // Only override what's different from default
    extractArticleId: (href) => {
      const match = href.match(/articleId=(\d+)/);
      return match ? match[1] : null;
    },
  });
};
```

**Parsers that are more heavily customized** (with significant override logic):
- `namgu.ts` — Completely custom list parsing (no table structure)
- `gokseong.ts` — Custom detail page structure
- `gurye.ts` — Custom URL building and ID extraction
- `haenam.ts` — Custom pagination parameter name (`nowPageNum`)
- `shinan.ts` — Different HTML structure requiring custom overrides

---

## 11. HTTP Client

**File**: `src/lib/crawl/http.ts` (97 lines)

### Export

```typescript
export function createHttpClient(options?: {
  timeoutMs?: number;   // Default: 25000 (25 seconds)
  attempts?: number;    // Default: 3
  signal?: AbortSignal;
}): {
  get: (url: string) => Promise<string>;  // Returns HTML string
};
```

### Implementation Details

- **Library**: Axios with custom configuration
- **User-Agent**: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36`
- **Accept**: `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`
- **Accept-Language**: `ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7`
- **Response Type**: `text` (raw HTML)
- **Response Encoding**: `utf-8`

### HTTPS Agent
```typescript
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 5,
  rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== "1",  // TLS validation toggle
});
```

### Retry Logic

- **Backoff formula**: `1000 * Math.pow(2, attemptIndex)` — 1s, 2s, 4s (exponential)
- **Retry on**:
  - HTTP 5xx status codes
  - HTTP 429 (Too Many Requests)
  - Network errors (connection reset, timeout, DNS failure)
- **No retry on**:
  - `ERR_CANCELED` (from AbortController)
  - HTTP 4xx (except 429)
  - Non-network errors
- **Max retries**: `attempts - 1` (so `attempts=3` means 1 initial + 2 retries)
- **AbortSignal**: Passed through to Axios `signal` option; cancels in-flight requests when abort is triggered

---

## 12. Date Parser

**File**: `src/lib/crawl/date.ts` (27 lines)

### Export

```typescript
export function parseKoreanDate(input: string, fallback?: Date): string;
// Returns: ISO date string (e.g., "2024-03-15T00:00:00.000Z")
```

### Parsing Logic

1. Trims input, removes leading/trailing whitespace
2. Tries regex patterns in order:
   - `YYYY.MM.DD` (e.g., `2024.03.15`)
   - `YYYY-MM-DD` (e.g., `2024-03-15`)
   - `YYYY/MM/DD` (e.g., `2024/03/15`)
3. If a pattern matches: constructs `new Date(year, month-1, day)` and returns `.toISOString()`
4. If no pattern matches: tries `new Date(input)` as fallback
5. If that also fails (NaN): returns `fallback?.toISOString()` or `new Date().toISOString()`

---

## 13. Pipeline Orchestration

**File**: `src/lib/pipeline/orchestrator.ts` (215 lines)

### Exports

```typescript
export async function executePipeline(options?: PipelineOptions): Promise<PipelineResult>;
export function isPipelineRunning(): boolean;
```

### Types

```typescript
interface PipelineStage {
  name: "crawl" | "publish";
  status: "pending" | "running" | "success" | "failed";
  startedAt?: Date;
  completedAt?: Date;
  result?: PipelineStageLog;
}

interface PipelineStageLog {
  articlesFound?: number;
  articlesNew?: number;
  articlesPublished?: number;
  errors: string[];
}

interface PipelineOptions {
  siteIds?: string[];
  limitPerSite?: number;   // Default: 5
  maxPages?: number;       // Default: 5
  delayMs?: number;        // Default: 200
  siteConcurrency?: number; // Default: 15
  publishLimit?: number;    // Default: 500
  dateRange?: { from?: string; to?: string };
}

interface PipelineResult {
  status: "success" | "partial" | "failed";
  stages: PipelineStage[];
  startedAt: Date;
  completedAt: Date;
}
```

### Mutex

```typescript
let running = false;  // Module-level singleton mutex
```

- `executePipeline()` checks `running` at entry. If `true`, throws `"Pipeline is already running"`.
- Sets `running = true` at start, `running = false` in `finally` block.
- `isPipelineRunning()` returns the current value of `running`.

### `executePipeline()` Flow

1. **Mutex check** → throws if already running
2. **Stage 1: Crawl**
   - Creates Supabase client, HTTP client
   - Calls `runCrawler(crawlOptions, { supabase, http })`
   - Writes pipeline log to `crawl_logs` with `site_name: "pipeline:crawl"`
   - Records `articlesFound` and `articlesNew` from result
3. **Stage 2: Publish**
   - Calls `generateEmbeddedPressReleaseArticles({ limit: publishLimit })`
   - Writes pipeline log with `site_name: "pipeline:publish"`
   - Records `articlesPublished` from result
4. **Status resolution**:
   - All stages success → `"success"`
   - Any stage failed → `"failed"`
   - Mixed → `"partial"`
5. **Error handling**: Each stage catches its own errors, records them in `stage.result.errors`, and continues to the next stage. The pipeline does NOT abort on stage failure.

---

## 14. Manual Pipeline (Admin Crawl)

**File**: `src/lib/pipeline/manual.ts` (223 lines)

### Export

```typescript
export async function executeManualCrawl(
  options?: ManualCrawlOptions,
  onProgress?: (event: PipelineEvent) => void
): Promise<PipelineResult>;
```

### Constants

```typescript
const PIPELINE_DEADLINE_MS = 50_000;  // 50 second hard deadline (for Vercel/serverless)
```

### Mutex

```typescript
let manualRunning = false;  // Separate from orchestrator mutex
```

### `PipelineEvent` Union Type (Streaming Protocol)

The `onProgress` callback receives these event types, which are serialized as NDJSON (newline-delimited JSON) to the client:

```typescript
type PipelineEvent =
  | { type: "pipeline_start"; data: { siteCount: number; startedAt: string } }
  | { type: "stage_start"; data: { stage: string; siteCount?: number } }
  | { type: "site_complete"; data: {
      siteId: string;
      siteName: string;
      status: string;
      articlesFound: number;
      articlesNew: number;
      error?: string;
    }}
  | { type: "stage_complete"; data: {
      stage: string;
      totalFound?: number;
      totalNew?: number;
      totalPublished?: number;
      duration: number;  // milliseconds
    }}
  | { type: "pipeline_complete"; data: {
      status: string;
      totalFound: number;
      totalNew: number;
      totalPublished: number;
      duration: number;
    }}
  | { type: "error"; data: { message: string; stage?: string } };
```

### `executeManualCrawl()` Flow

1. **Mutex check** → throws if already running
2. Creates `AbortController` with timeout set to `PIPELINE_DEADLINE_MS` (50s)
3. Emits `pipeline_start` event
4. **Stage 1: Crawl**
   - Emits `stage_start` with `stage: "crawl"`
   - Calls `runCrawler()` with:
     - `httpTimeoutMs: 8_000` (shorter than default for manual runs)
     - `httpAttempts: 1` (no retries for speed)
     - `signal`: from AbortController
     - `onSiteComplete`: callback that emits `site_complete` events
   - Emits `stage_complete` with `stage: "crawl"`
5. **Deadline check**: If remaining time < 5 seconds, skips publish stage
6. **Stage 2: Publish** (if time allows)
   - Emits `stage_start` with `stage: "publish"`
   - Calls `generateEmbeddedPressReleaseArticles()`
   - Emits `stage_complete` with `stage: "publish"`
7. Emits `pipeline_complete` event
8. Releases mutex in `finally` block

**Why 50 second deadline?**: Designed for serverless execution environments (e.g., Vercel) where functions have time limits. The manual crawl from admin dashboard uses this path.

---

## 15. AI / Processing Layer

### 15.1 Batch Article Generation (Passthrough Mode)

**File**: `src/lib/ai/batch-generate.ts` (208 lines)

#### Exports

```typescript
export async function generateEmbeddedPressReleaseArticles(
  options?: BatchGenerateOptions,
  client?: SupabaseClient
): Promise<BatchGenerateResult>;

export async function generateSingleArticle(
  pressReleaseId: string,
  client?: SupabaseClient,
  options?: { signal?: AbortSignal }
): Promise<boolean>;

export function contentToArticleBody(html: string): string;
```

#### `generateEmbeddedPressReleaseArticles()` Flow

1. Creates Supabase client if not provided
2. Fetches unprocessed PRs:
   ```sql
   SELECT * FROM press_releases
   WHERE status IN ('collected', 'embedded')
   ORDER BY published_at ASC
   LIMIT $limit
   ```
3. For each PR: calls `savePassthroughArticle(supabase, pr)`
4. `savePassthroughArticle()`:
   - Calls `contentToArticleBody(pr.content)` to clean HTML
   - Inserts into `articles` table:
     ```typescript
     {
       press_release_id: pr.id,
       title: pr.title,
       body: cleanedBody,
       category: "press_release",
       source: pr.source,       // site ID
       source_url: pr.link,
       images: pr.images,
       status: "available",
       published_at: pr.published_at,
       processed_at: new Date().toISOString(),
     }
     ```
   - Updates PR: `SET status = 'processed', processed_at = now()`
5. Returns `{ processed, failed, skipped }` counts

#### `contentToArticleBody(html: string): string`

1. Calls `stripNoiseFromBody(html)` (from `parsers/common.ts`)
2. Loads into Cheerio
3. Extracts all `<p>` elements' text content
4. Deduplicates paragraphs (removes exact text duplicates)
5. Filters out empty paragraphs
6. Wraps each in `<p>` tags
7. Returns joined HTML string

**IMPORTANT**: This function does NOT call any AI API. It simply cleans and reformats the press release HTML. The "AI" in the filename is historical — the system was designed for AI generation but currently operates in passthrough mode.

#### `generateSingleArticle()` Flow

1. Fetches single PR by ID from `press_releases`
2. Calls `savePassthroughArticle()` for that PR
3. Returns `true` on success, `false` on failure

### 15.2 Embedding Generation

**File**: `src/lib/ai/embedding.ts` (122 lines)

#### Export

```typescript
export async function generateEmbedding(input: EmbeddingInput): Promise<number[]>;
// Returns: Array of 1024 floating-point numbers
```

#### Implementation

- **API Endpoint**: `https://openrouter.ai/api/v1/embeddings`
- **Method**: POST
- **Headers**:
  - `Authorization: Bearer ${OPENROUTER_API_KEY}`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "model": "openai/text-embedding-3-small",  // or OPENROUTER_EMBED_MODEL env
    "input": "<truncated input text>",
    "dimensions": 1024
  }
  ```
- **Input truncation**: If `input.length > 28000`, truncates to 28000 characters
- **Response parsing**: Extracts `response.data[0].embedding` (array of floats)

#### Retry Logic

```typescript
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;  // Base delay
const TIMEOUT_MS = 45000;      // Fetch timeout
```

- **Retry conditions** (matches any):
  - Response body contains `"No successful provider"`
  - HTTP 429 (rate limited)
  - HTTP 5xx (server error)
  - Error message contains: `"fetch failed"`, `"ECONNRESET"`, `"ETIMEDOUT"`
- **Backoff**: Linear — `RETRY_DELAY_MS * (retryIndex + 1)` → 1500ms, 3000ms
- **AbortController**: Each attempt creates its own `AbortController` with `TIMEOUT_MS` timeout
- **Non-retryable errors**: All other errors throw immediately

### 15.3 Batch Embedding

**File**: `src/lib/ai/batch-embed.ts` (90 lines)

#### Export

```typescript
export async function embedCollectedPressReleases(
  supabase: SupabaseClient,
  options?: { limit?: number; signal?: AbortSignal }
): Promise<{ embedded: number; failed: number }>;
```

#### Flow

1. Fetches PRs needing embedding:
   ```sql
   SELECT id, title, content FROM press_releases
   WHERE status = 'collected' AND embedding IS NULL
   ORDER BY created_at ASC
   LIMIT $limit
   ```
2. For each PR:
   - Concatenates `title + "\n\n" + content` as embedding input
   - Calls `generateEmbedding(input)`
   - Updates PR:
     ```sql
     UPDATE press_releases SET embedding = $vector, status = 'embedded' WHERE id = $id
     ```
3. Checks `signal?.aborted` between each PR
4. Returns `{ embedded, failed }` counts

---

## 16. Authentication System

The project has **three distinct authentication mechanisms**:

### 16.1 Admin Dashboard (Cookie-Based)

**Flow**:
1. User navigates to any `/admin/*` page
2. `middleware.ts` checks for cookie `site_access` with value `"nf2_site_access_granted"`
3. If missing → redirect to `/password`
4. User enters password on `/password` page
5. Client POSTs to `/api/auth/verify-password` with `{ password: string }`
6. Server compares against `SITE_PASSWORD` env variable
7. On success → sets `site_access` cookie, responds 200
8. Client calls `router.push("/admin")` + `router.refresh()`

**Cookie details**:
- Name: `site_access`
- Value: `"nf2_site_access_granted"`
- No explicit expiration (session cookie)

### 16.2 Public API v1 (Bearer Token)

**File**: `src/lib/api/auth.ts` (153 lines)

#### Export

```typescript
export async function authenticateRequest(
  request: Request,
  client?: SupabaseClient
): Promise<AuthResult>;

export function isAuthError(result: AuthResult): result is AuthError;

type AuthResult = AuthenticatedClient | AuthError;

interface AuthenticatedClient {
  id: string;
  name: string;
  is_active: boolean;
}

interface AuthError {
  error: string;
  status: number;  // 401 or 403
}
```

#### Authentication Flow (Two-Phase Lookup)

1. Extract `Authorization` header → expects format `Bearer {api_key}`
2. If missing or malformed → `{ error: "Missing or invalid Authorization header", status: 401 }`
3. **Phase 1 — Fast prefix lookup**:
   - Extract first 12 characters of the provided key as `prefix`
   - Query: `SELECT * FROM clients WHERE api_key_prefix = $prefix AND is_active = true AND deleted_at IS NULL`
   - If found: `bcrypt.compare(providedKey, client.api_key_hash)`
   - If match → authenticated
4. **Phase 2 — Fallback scan** (for legacy keys without prefix):
   - Query: `SELECT * FROM clients WHERE api_key_prefix IS NULL AND is_active = true AND deleted_at IS NULL`
   - Loop through all results, `bcrypt.compare()` each
   - If match found → authenticated AND backfills prefix:
     ```sql
     UPDATE clients SET api_key_prefix = $prefix WHERE id = $id
     ```
5. No match in either phase → `{ error: "Invalid API key", status: 401 }`
6. Client found but `is_active = false` → `{ error: "Client is deactivated", status: 403 }`

#### Post-Authentication (on success)

```sql
UPDATE clients SET last_used_at = now(), request_count = request_count + 1 WHERE id = $clientId
```

This runs asynchronously (fire-and-forget) — does not block the API response.

### 16.3 Cron Route (Shared Secret)

- Header: `Authorization: Bearer {CRON_SECRET}`
- Simple string comparison: `request.headers.get("authorization") === \`Bearer ${process.env.CRON_SECRET}\``
- Used by: GitHub Actions cron job, admin crawl route (as alternative auth)

---

## 17. Rate Limiting

**File**: `src/lib/api/rate-limit.ts` (75 lines)

### Exports

```typescript
export function checkRateLimit(clientId: string): NextResponse | null;
// Returns: null = OK, NextResponse = 429 rejection

export function getRateLimitHeaders(clientId: string): Record<string, string>;
// Returns: { "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset" }
```

### Implementation

```typescript
const WINDOW_MS = 60_000;      // 1 minute sliding window
const MAX_REQUESTS = 100;      // Requests per window per client

// In-memory storage
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Cleanup interval: 300_000ms (5 minutes)
// Timer is unref'd so it doesn't prevent process exit
```

### `checkRateLimit()` Logic

1. Look up `clientId` in `rateLimitMap`
2. If not found or window expired: create new entry `{ count: 1, resetAt: Date.now() + WINDOW_MS }`
3. If within window: increment `count`
4. If `count > MAX_REQUESTS`: return 429 NextResponse with:
   - Body: `{ error: "Rate limit exceeded" }`
   - Header: `Retry-After: {seconds until reset}`
   - Rate limit headers (see below)
5. If within limit: return `null` (proceed)

### `getRateLimitHeaders()` Response Headers

```typescript
{
  "X-RateLimit-Limit": "100",
  "X-RateLimit-Remaining": String(MAX_REQUESTS - count),
  "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000))  // Unix timestamp
}
```

**Important**: Rate limiting is **in-memory** and **per-process**. It resets when the server restarts. In a multi-instance deployment, each instance has its own independent rate limit state.

---

## 18. CORS

**File**: `src/lib/api/cors.ts` (22 lines)

### Exports

```typescript
export function withCors(response: NextResponse): NextResponse;
// Adds CORS headers to existing response and returns it

export function corsPreflightResponse(): NextResponse;
// Returns new 204 No Content response with CORS headers
```

### CORS Headers Applied

```typescript
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400"  // 24 hours preflight cache
}
```

### Usage Pattern in API Routes

```typescript
// In GET handler:
return withCors(NextResponse.json(data));

// In OPTIONS handler:
export async function OPTIONS() {
  return corsPreflightResponse();
}
```

---

## 19. Middleware

**File**: `src/middleware.ts` (26 lines)

### Logic

```typescript
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes — they have their own auth
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Skip password page (it's the login page itself)
  if (pathname.startsWith("/password")) {
    return NextResponse.next();
  }

  // Check cookie
  const accessToken = request.cookies.get("site_access")?.value;
  if (accessToken !== "nf2_site_access_granted") {
    return NextResponse.redirect(new URL("/password", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Key behaviors**:
- All non-API, non-password pages require the `site_access` cookie
- The root page (`/`) redirects to `/admin` (handled by `src/app/page.tsx`), which then requires auth
- Static assets and Next.js internals are excluded via the matcher pattern

---

## 20. Crawl Monitor Service

**File**: `src/lib/services/crawl-monitor.ts` (307 lines)

### Exports

```typescript
export async function getAllSiteCrawlStatus(
  client?: SupabaseClient
): Promise<SiteCrawlStatus[]>;

export async function getCrawlStatistics(
  period: "daily" | "weekly" | "monthly",
  client?: SupabaseClient
): Promise<CrawlStatistics>;

export function classifyFailureReason(errorMessage?: string | null): FailureReason;
```

### Types

```typescript
type HealthStatus = "healthy" | "warning" | "critical" | "unknown";
type FailureReason = "network_error" | "structure_change" | "server_maintenance" | "unknown";

interface SiteCrawlStatus {
  siteId: string;
  siteName: string;
  health: HealthStatus;
  lastSuccess?: {
    completedAt: string;
    articlesFound: number;
    articlesNew: number;
  };
  lastFailure?: {
    completedAt: string;
    errorMessage: string;
    failureReason: FailureReason;
  };
  consecutiveFailures: number;
  totalRuns: number;
  successRate: number;  // 0-1 float
}

interface SiteStatistics {
  siteId: string;
  siteName: string;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  totalArticlesFound: number;
  totalArticlesNew: number;
  averageArticlesPerRun: number;
}

interface CrawlStatistics {
  period: string;
  startDate: string;
  endDate: string;
  sites: SiteStatistics[];
  summary: {
    totalRuns: number;
    totalSuccess: number;
    totalFailures: number;
    overallSuccessRate: number;
    totalArticlesFound: number;
    totalArticlesNew: number;
  };
}
```

### `getAllSiteCrawlStatus()` Implementation

1. Fetches all `crawl_logs` entries where `site_name NOT LIKE 'pipeline:%'`
2. Groups logs by `site_name`
3. For each site:
   - Finds latest log entry (by `completed_at`)
   - Finds latest successful log
   - Finds latest failed log
   - Counts consecutive failures from most recent backwards
   - Calculates success rate as `successCount / totalRuns`
4. **Health classification**:
   ```typescript
   const CONSECUTIVE_FAILURE_THRESHOLD = 3;
   if (consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD) → "critical"
   else if (consecutiveFailures > 0) → "warning"
   else if (hasAnyRuns) → "healthy"
   else → "unknown"
   ```

### `classifyFailureReason()` Implementation

Matches error message patterns:
- **`network_error`**: `"ECONNREFUSED"`, `"ETIMEDOUT"`, `"ENOTFOUND"`, `"ECONNRESET"`, `"fetch failed"`, `"timeout"`, `"network"`
- **`structure_change`**: `"selector"`, `"parse"`, `"element"`, `"null"`, `"undefined"`, `"Cannot read"`, `"is not a function"`
- **`server_maintenance`**: `"503"`, `"502"`, `"maintenance"`, `"temporarily"`, `"unavailable"`
- **`unknown`**: Default when no pattern matches

### `getCrawlStatistics()` Implementation

1. Determines period start date:
   - `"daily"` → last 24 hours
   - `"weekly"` → last 7 days
   - `"monthly"` → last 30 days
2. Fetches `crawl_logs` within period, excluding `pipeline:%` entries
3. Groups by site, calculates per-site statistics
4. Aggregates into summary

---

## 21. API Routes (Complete)

### 21.1 `GET /api/cron/crawl`

**File**: `src/app/api/cron/crawl/route.ts` (98 lines)

**Purpose**: Entry point for automated pipeline execution (called by GitHub Actions or any cron system).

**Configuration**:
```typescript
export const maxDuration = 300;      // 5 minute timeout
export const dynamic = "force-dynamic";
```

**Authentication**: Bearer token matching `CRON_SECRET` env variable.

**Flow**:
1. Validate `Authorization: Bearer {CRON_SECRET}` header
2. Check `isPipelineRunning()` → 409 if already running
3. Load `crawl_settings` from DB (id=1):
   - `enabled_site_ids`: array of site IDs to crawl
   - `schedule_hours`: array of KST hours when crawl is allowed
4. Get current KST hour: `new Date().getUTCHours() + 9) % 24`
5. If current hour not in `schedule_hours` → skip with 200 response
6. Filter `SITES` to only enabled site IDs
7. Call `executePipeline({ siteIds, ... })`
8. **Response codes**:
   - `200`: Success or skipped (not scheduled hour)
   - `207`: Partial success (some sites failed)
   - `401`: Invalid auth
   - `409`: Pipeline already running
   - `500`: Pipeline failure

**Response body**:
```json
{
  "status": "success" | "partial" | "skipped" | "error",
  "message": "string",
  "result": { /* PipelineResult */ }
}
```

### 21.2 `GET /api/v1/articles`

**File**: `src/app/api/v1/articles/route.ts` (109 lines)

**Purpose**: Public API for consuming articles.

**Authentication**: Bearer token (via `authenticateRequest()`).

**Query Parameters**:

| Parameter | Type | Default | Validation | Description |
|---|---|---|---|---|
| `region` | string | - | None | Filter by region |
| `category` | string | - | None | Filter by article category |
| `keyword` | string | - | Sanitized: strips `%_,.()"\\` | Search in title (ILIKE) |
| `from` | string | - | ISO date | Published after this date |
| `to` | string | - | ISO date | Published before this date |
| `status` | string | `"available"` | None | Filter by article status |
| `limit` | number | `20` | Clamped to 1-100 | Results per page |
| `offset` | number | `0` | Min 0 | Pagination offset |

**Response** (200):
```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "string",
      "summary": "string | null",
      "content": "string (HTML body)",
      "category": "string",
      "source": "string (site name)",
      "source_url": "string (original URL)",
      "images": ["url1", "url2"],
      "published_at": "ISO timestamp",
      "processed_at": "ISO timestamp"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

**Note**: The `body` column from DB is returned as `content` in the API response (aliased in SELECT).

**Response headers include**: Rate limit headers via `getRateLimitHeaders()` + CORS headers via `withCors()`.

**Error responses**:
- `401`: Missing or invalid API key
- `429`: Rate limit exceeded (with `Retry-After` header)
- `500`: Server error

### 21.3 `POST /api/admin/crawl`

**File**: `src/app/api/admin/crawl/route.ts` (85 lines)

**Purpose**: Manual crawl trigger from admin dashboard with real-time streaming progress.

**Authentication**: Two methods accepted (OR logic):
1. `Authorization: Bearer {CRON_SECRET}` header
2. Same-origin request: checks `Referer` or `Origin` header for `localhost` or `admin`

**Request body**:
```json
{
  "siteIds": ["gwangju-city", "seogu"],  // optional, defaults to all
  "dateRange": {                          // optional
    "from": "2024-01-01",
    "to": "2024-12-31"
  },
  "delayMs": 500                          // optional, default 200
}
```

**Constants**:
```typescript
const DEFAULT_MAX_PAGES = 2;      // Lower than automated pipeline (2 vs 5)
const DEFAULT_LIMIT_PER_SITE = 5;
```

**Validation**: If `siteIds` provided, each is validated against `SITES_BY_ID` map. Unknown IDs → 400 error.

**Response**: Streaming `application/x-ndjson` (newline-delimited JSON).

Each line is a JSON object matching the `PipelineEvent` union type:
```
{"type":"pipeline_start","data":{"siteCount":27,"startedAt":"2024-..."}}\n
{"type":"stage_start","data":{"stage":"crawl","siteCount":27}}\n
{"type":"site_complete","data":{"siteId":"gwangju-city","siteName":"광주시청","status":"success","articlesFound":5,"articlesNew":3}}\n
...
{"type":"stage_complete","data":{"stage":"crawl","totalFound":135,"totalNew":42,"duration":30000}}\n
{"type":"pipeline_complete","data":{"status":"success","totalFound":135,"totalNew":42,"totalPublished":42,"duration":45000}}\n
```

**Implementation**: Uses `ReadableStream` with `TextEncoder` to push NDJSON events as they occur. The `onProgress` callback from `executeManualCrawl()` writes each event to the stream.

### 21.4 `GET /api/admin/clients` & `POST /api/admin/clients`

**File**: `src/app/api/admin/clients/route.ts` (104 lines)

#### GET — List All Clients

**Response** (200):
```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "string",
      "api_key_prefix": "nf_live_abcd",
      "api_key_last4": "ef12",
      "is_active": true,
      "request_count": 42,
      "last_used_at": "ISO timestamp | null",
      "created_at": "ISO timestamp"
    }
  ]
}
```

**Note**: `api_key_hash` is explicitly excluded from the SELECT query for security.

#### POST — Create New Client

**Request body**:
```json
{
  "name": "My Application"
}
```

**Key generation**:
```typescript
const rawKey = `nf_live_${crypto.randomBytes(32).toString("hex")}`;
// Result: "nf_live_" + 64 hex chars = 72 chars total
const hash = await bcrypt.hash(rawKey, 12);  // Cost factor 12
const prefix = rawKey.substring(0, 12);      // "nf_live_abcd"
const last4 = rawKey.substring(rawKey.length - 4);  // Last 4 hex chars
```

**Response** (201):
```json
{
  "client": {
    "id": "uuid",
    "name": "My Application",
    "api_key": "nf_live_abcdef...(72 chars)...1234",
    "api_key_prefix": "nf_live_abcd",
    "api_key_last4": "1234"
  }
}
```

**IMPORTANT**: The full `api_key` is returned ONLY in this creation response. It is never stored in plaintext and cannot be retrieved again. If lost, a new key must be generated.

### 21.5 `POST /api/auth/verify-password`

**Purpose**: Validates admin dashboard login.

**Request body**:
```json
{ "password": "string" }
```

**Logic**:
1. Compare `password` against `SITE_PASSWORD` env variable (direct string comparison, NOT bcrypt)
2. On match: Set cookie `site_access = "nf2_site_access_granted"`, respond 200
3. On mismatch: respond 401

**Response** (200):
```json
{ "success": true }
```

**Cookie set on response**:
```typescript
response.cookies.set("site_access", "nf2_site_access_granted", {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});
```

### 21.6 Other Admin API Routes

These routes follow standard CRUD patterns. All require same-origin or CRON_SECRET auth:

| Route | Method | Description |
|---|---|---|
| `/api/admin/articles` | GET | List articles with pagination/filters |
| `/api/admin/articles/[id]` | GET/PUT/DELETE | Single article CRUD |
| `/api/admin/articles/bulk-delete` | POST | Delete multiple articles by IDs |
| `/api/admin/press-releases` | GET | List press releases with pagination/filters |
| `/api/admin/press-releases/[id]` | GET/PUT/DELETE | Single press release CRUD |
| `/api/admin/press-releases/bulk-delete` | POST | Delete multiple PRs by IDs |
| `/api/admin/crawl-status` | GET | Returns `{ isRunning: boolean }` |
| `/api/admin/crawl-settings` | GET/PUT | Read/update crawl settings (enabled sites, schedule hours) |
| `/api/admin/monitoring` | GET | Returns crawl health data via `getAllSiteCrawlStatus()` |
| `/api/admin/pipeline-runs` | GET | Returns recent pipeline execution logs |
| `/api/admin/trigger-crawl` | POST | Quick trigger (non-streaming alternative to `/api/admin/crawl`) |

---

## 22. Admin Dashboard Pages

The admin dashboard is a Next.js App Router application with 8 pages, all protected by cookie authentication via middleware.

| Path | Purpose |
|---|---|
| `/admin` | Dashboard home — overview or redirect |
| `/admin/articles` | List, search, filter, and bulk-delete articles |
| `/admin/press-releases` | List, search, filter, and bulk-delete press releases |
| `/admin/crawl` | Manual crawl trigger with real-time streaming progress (NDJSON) |
| `/admin/monitoring` | Crawl health dashboard showing per-site health status |
| `/admin/pipeline` | Pipeline run history from `crawl_logs` |
| `/admin/clients` | API client management (create, view, deactivate) |
| `/admin/settings` | Per-site crawl settings (enable/disable, schedule) |

**Layout**: `admin/layout.tsx` provides a sidebar navigation component (`Sidebar.tsx`) with links to all 8 pages.

**Password Page** (`/password`): Client-side React component that:
1. Renders a password input form
2. POSTs to `/api/auth/verify-password`
3. On success: `router.push("/admin")` + `router.refresh()`
4. On failure: shows error message

---

## 23. Scripts (CLI)

All scripts live in `scripts/` and are executed via `npx tsx scripts/{name}.ts`.

Scripts use `@next/env`'s `loadEnvConfig()` to load environment variables from `.env.local`.

### 23.1 `run-pipeline.ts` (Main Pipeline Script, 129 lines)

**Purpose**: Full pipeline execution: crawl → publish. This is what GitHub Actions calls.

**CLI Arguments**:

| Argument | Type | Default | Description |
|---|---|---|---|
| `--sites` | string (comma-separated) | All sites | Site IDs to crawl |
| `--limit` | number | 5 | Max articles per site |
| `--max-pages` | number | 5 | Max list pages per site |
| `--date-from` | string | - | Start date filter (ISO) |
| `--date-to` | string | - | End date filter (ISO) |
| `--delay` | number | 200 | Delay between sites (ms) |
| `--publish-limit` | number | 500 | Max articles to publish |
| `--concurrency` | number | 15 | Parallel site crawl limit |
| `--quiet` | flag | false | Suppress detailed output |

**Example**:
```bash
npx tsx scripts/run-pipeline.ts --sites gwangju-city,seogu --limit 10 --max-pages 3
```

**Implementation**: Parses args, constructs `PipelineOptions`, calls `executePipeline()`.

### 23.2 Other Scripts

| Script | Purpose | Key Details |
|---|---|---|
| `crawl.ts` | Crawl only (no article generation) | Calls `runCrawler()` directly |
| `generate.ts` | Generate articles from existing PRs | Calls `generateEmbeddedPressReleaseArticles()` |
| `embed.ts` | Generate embeddings for collected PRs | Calls `embedCollectedPressReleases()` |
| `list-sites.ts` | Print all configured sites | Reads from `SITES` array, prints table |
| `test-crawl.ts` | Test a site's list page parsing | Takes site ID as arg, crawls without inserting |
| `test-detail.ts` | Test parsing a specific detail page URL | Takes URL as arg, runs parser, prints result |
| `count-pr.ts` | Count press releases in DB | Simple `SELECT count(*) FROM press_releases` |
| `reprocess.ts` | Re-generate articles | Resets PR status, re-runs generation |
| `reset-articles.ts` | Delete all articles | `DELETE FROM articles` |
| `delete-all-prs.ts` | Delete all press releases | `DELETE FROM press_releases` (cascades to articles) |
| `check-crawl-settings.ts` | Print crawl_settings | Reads and prints DB settings |
| `setup-crawl-settings.ts` | Initialize crawl_settings | Populates from `sites.ts` config |

---

## 24. GitHub Actions

**File**: `.github/workflows/cron-pipeline.yml`

### Cron Schedule

```yaml
on:
  schedule:
    - cron: "0 21 * * *"   # UTC 21:00 = KST 06:00
    - cron: "0 3 * * *"    # UTC 03:00 = KST 12:00
    - cron: "0 9 * * *"    # UTC 09:00 = KST 18:00
  workflow_dispatch:
    inputs:
      siteIds:
        description: "Comma-separated site IDs (empty = all)"
        required: false
      maxPages:
        description: "Max pages per site"
        required: false
        default: "5"
      limitPerSite:
        description: "Max articles per site"
        required: false
        default: "5"
      dateFrom:
        description: "Start date (YYYY-MM-DD)"
        required: false
      dateTo:
        description: "End date (YYYY-MM-DD)"
        required: false
```

### Workflow Steps

```yaml
jobs:
  crawl:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
      OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
      CRON_SECRET: ${{ secrets.CRON_SECRET }}
      ALLOW_INSECURE_TLS: "1"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npx tsx scripts/run-pipeline.ts ${{ /* args from inputs */ }}
```

**IMPORTANT**: The GitHub Actions workflow runs the pipeline **directly** via `npx tsx scripts/run-pipeline.ts`, NOT via HTTP webhook to `/api/cron/crawl`. This is a deliberate choice — running locally avoids serverless function timeout limits.

The `/api/cron/crawl` route exists as an alternative trigger mechanism (e.g., for external cron services that can only make HTTP requests).

---

## 25. Data Flow (End-to-End)

### Automated Pipeline (GitHub Actions)

```
GitHub Actions cron (3x daily at KST 06:00, 12:00, 18:00)
  │
  ▼
npx tsx scripts/run-pipeline.ts
  │ loadEnvConfig() → reads .env.local
  │ Parse CLI arguments
  │
  ▼
executePipeline(options)                          [orchestrator.ts]
  │ Mutex check (let running = false → true)
  │
  ├─── Stage 1: CRAWL ─────────────────────────────────────────
  │    │
  │    ▼
  │    runCrawler(options, {supabase, http})       [crawler.ts]
  │    │ pickSites(siteIds) → SiteConfig[]
  │    │ pLimit(siteConcurrency=15) → concurrency limiter
  │    │
  │    │ For each site (parallel, max 15):
  │    │   ├─ Create SiteParserContext
  │    │   ├─ Lookup parser: PARSERS[site.type]     [parsers/index.ts]
  │    │   ├─ parser(ctx)                           [parsers/*.ts]
  │    │   │   └─ parseWithPattern(ctx, overrides)  [parsers/common.ts]
  │    │   │       ├─ Fetch list page via http.get()  [http.ts]
  │    │   │       ├─ Cheerio parse → extract rows
  │    │   │       ├─ For each row: extract title, href, date
  │    │   │       ├─ Extract article ID via idPattern or override
  │    │   │       ├─ Date range filter
  │    │   │       ├─ Limit enforcement
  │    │   │       ├─ Fetch detail pages via http.get()
  │    │   │       ├─ cleanBodyHtml() → stripNoiseFromBody()
  │    │   │       ├─ extractImages() → filter isNonContentImage()
  │    │   │       ├─ extractAttachments()
  │    │   │       └─ Return ParsedArticle[]
  │    │   │
  │    │   ├─ For each ParsedArticle:
  │    │   │   └─ insertArticle(deps, article)
  │    │   │       ├─ SELECT origin_id → duplicate check
  │    │   │       ├─ INSERT press_releases (status='processed')
  │    │   │       ├─ contentToArticleBody() → clean HTML
  │    │   │       └─ INSERT articles (category='press_release', status='available')
  │    │   │
  │    │   ├─ writeCrawlLog() → INSERT crawl_logs
  │    │   └─ delay(delayMs=200) between sites
  │    │
  │    └─ Write pipeline log: site_name="pipeline:crawl"
  │
  ├─── Stage 2: PUBLISH ────────────────────────────────────────
  │    │
  │    ▼
  │    generateEmbeddedPressReleaseArticles({limit: 500})  [batch-generate.ts]
  │    │ SELECT press_releases WHERE status IN ('collected','embedded')
  │    │ (In current flow, most PRs are already 'processed' by insertArticle,
  │    │  so this typically processes 0 records in passthrough mode)
  │    │
  │    └─ Write pipeline log: site_name="pipeline:publish"
  │
  └─── Release mutex (running = false)
```

### Manual Pipeline (Admin Dashboard)

```
Admin clicks "Start Crawl" in /admin/crawl
  │
  ▼
POST /api/admin/crawl  (request body: {siteIds?, dateRange?, delayMs?})
  │ Auth check (CRON_SECRET or same-origin)
  │ Validate siteIds against SITES_BY_ID
  │
  ▼
ReadableStream response (application/x-ndjson)
  │
  ▼
executeManualCrawl(options, onProgress)            [manual.ts]
  │ Mutex check (let manualRunning)
  │ AbortController with 50s deadline
  │ Emit: pipeline_start
  │
  ├─── Crawl stage (same as automated, but with):
  │    httpTimeoutMs: 8000 (vs default 25000)
  │    httpAttempts: 1 (vs default 3)
  │    signal: AbortController.signal
  │    Each site_complete → NDJSON line pushed to stream
  │
  ├─── Check remaining time (< 5s → skip publish)
  │
  ├─── Publish stage (if time allows)
  │
  └─── Emit: pipeline_complete
       Stream closes
```

---

## 26. Module Dependency Graph

```
src/app/api/cron/crawl/route.ts
  ├── src/lib/pipeline/orchestrator.ts
  │     ├── src/lib/crawl/crawler.ts
  │     │     ├── src/lib/crawl/parsers/index.ts
  │     │     │     ├── src/lib/crawl/parsers/common.ts
  │     │     │     │     ├── src/lib/crawl/date.ts
  │     │     │     │     └── (cheerio)
  │     │     │     └── src/lib/crawl/parsers/*.ts (18 parsers)
  │     │     │           └── src/lib/crawl/parsers/common.ts
  │     │     ├── src/lib/crawl/http.ts
  │     │     │     └── (axios)
  │     │     ├── src/lib/ai/batch-generate.ts
  │     │     │     └── src/lib/crawl/parsers/common.ts (stripNoiseFromBody)
  │     │     ├── src/config/sites.ts
  │     │     └── src/lib/supabase.ts
  │     └── src/lib/ai/batch-generate.ts
  └── src/config/sites.ts

src/app/api/admin/crawl/route.ts
  ├── src/lib/pipeline/manual.ts
  │     ├── src/lib/crawl/crawler.ts (same tree as above)
  │     └── src/lib/ai/batch-generate.ts
  └── src/config/sites.ts

src/app/api/v1/articles/route.ts
  ├── src/lib/api/auth.ts
  │     ├── (bcryptjs)
  │     └── src/lib/supabase.ts
  ├── src/lib/api/rate-limit.ts
  ├── src/lib/api/cors.ts
  └── src/lib/supabase.ts

src/app/api/admin/clients/route.ts
  ├── (bcryptjs)
  ├── (crypto)
  └── src/lib/supabase.ts

src/middleware.ts
  └── (next/server)

src/lib/ai/batch-embed.ts
  ├── src/lib/ai/embedding.ts
  │     └── (fetch → OpenRouter API)
  └── src/lib/supabase.ts

src/lib/services/crawl-monitor.ts
  ├── src/config/sites.ts
  └── src/lib/supabase.ts
```

---

## 27. Error Handling Patterns

### 27.1 Crawler Error Handling

- **Site-level isolation**: Each site crawl is wrapped in try/catch. A single site failure does NOT affect other sites.
- **Error propagation**: Site errors are captured in `CrawlSiteResult.error` and logged to `crawl_logs` with `status: "failed"`.
- **HTTP errors**: Handled by Axios retry logic in `http.ts`. After all retries exhausted, error bubbles up to `crawlSite()`.
- **Abort signal**: Checked before each page fetch. When aborted, the current site finishes but no more pages are fetched.

### 27.2 Pipeline Error Handling

- **Stage isolation**: Each pipeline stage (crawl, publish) has its own try/catch. Stage failure is recorded but pipeline continues to next stage.
- **Mutex safety**: The `running` flag is always released in a `finally` block, preventing deadlocks even on uncaught exceptions.
- **Result classification**:
  - All stages succeed → `"success"`
  - Any stage fails → overall result is `"partial"` or `"failed"`

### 27.3 API Error Handling

- **Authentication errors**: Return appropriate HTTP status (401 unauthorized, 403 forbidden)
- **Validation errors**: Return 400 with descriptive error message
- **Rate limiting**: Returns 429 with `Retry-After` header
- **Server errors**: Caught at route level, return 500 with generic message (no stack traces leaked)

### 27.4 Embedding Error Handling

- **Retryable errors**: Automatically retried up to 2 times with linear backoff
- **Non-retryable errors**: Thrown immediately, caught by batch processor
- **Batch level**: Failed embeddings increment `failed` counter, processing continues with remaining PRs

---

## 28. Constants & Magic Values

### Crawler Defaults
| Constant | Value | Location | Description |
|---|---|---|---|
| `DEFAULT_LIMIT_PER_SITE` | `5` | `crawler.ts` | Max articles per site per crawl |
| `DEFAULT_DELAY_MS` | `900` | `crawler.ts` | Delay between site crawls |
| `DEFAULT_SITE_CONCURRENCY` | `5` | `crawler.ts` | Parallel site crawl limit |
| Max pages cap | `5` | `crawler.ts` | Hard cap on `maxPages` parameter |

### Pipeline Defaults
| Constant | Value | Location | Description |
|---|---|---|---|
| `limitPerSite` | `5` | `orchestrator.ts` | Default crawl limit |
| `maxPages` | `5` | `orchestrator.ts` | Default max pages |
| `delayMs` | `200` | `orchestrator.ts` | Default inter-site delay |
| `siteConcurrency` | `15` | `orchestrator.ts` | Default parallel sites |
| `publishLimit` | `500` | `orchestrator.ts` | Default article generation limit |

### Manual Pipeline
| Constant | Value | Location | Description |
|---|---|---|---|
| `PIPELINE_DEADLINE_MS` | `50_000` | `manual.ts` | 50 second hard deadline |
| `httpTimeoutMs` | `8_000` | `manual.ts` | Shorter HTTP timeout for manual runs |
| `httpAttempts` | `1` | `manual.ts` | No retries for manual runs |
| Skip threshold | `5000` | `manual.ts` | Skip publish if < 5s remaining |
| `DEFAULT_MAX_PAGES` | `2` | `admin/crawl/route.ts` | Lower page limit for manual crawl |

### HTTP Client
| Constant | Value | Location | Description |
|---|---|---|---|
| Default timeout | `25_000` | `http.ts` | 25 second request timeout |
| Default attempts | `3` | `http.ts` | 1 initial + 2 retries |
| Backoff base | `1000` | `http.ts` | 1s × 2^attempt |
| `maxSockets` | `5` | `http.ts` | HTTPS agent connection pool |

### Embedding
| Constant | Value | Location | Description |
|---|---|---|---|
| `EMBEDDING_DIMENSIONS` | `1024` | `types/embedding.ts` | pgvector dimension count |
| `DEFAULT_EMBED_MODEL` | `"openai/text-embedding-3-small"` | `types/embedding.ts` | Default OpenRouter model |
| `TIMEOUT_MS` | `45_000` | `embedding.ts` | Per-request timeout |
| `MAX_RETRIES` | `2` | `embedding.ts` | Retry count |
| `RETRY_DELAY_MS` | `1_500` | `embedding.ts` | Base retry delay |
| Max input length | `28_000` | `embedding.ts` | Character truncation limit |

### Rate Limiting
| Constant | Value | Location | Description |
|---|---|---|---|
| `WINDOW_MS` | `60_000` | `rate-limit.ts` | 1 minute window |
| `MAX_REQUESTS` | `100` | `rate-limit.ts` | Requests per window |
| Cleanup interval | `300_000` | `rate-limit.ts` | 5 minute stale entry cleanup |

### Authentication
| Constant | Value | Location | Description |
|---|---|---|---|
| Cookie name | `"site_access"` | `middleware.ts` | Admin auth cookie |
| Cookie value | `"nf2_site_access_granted"` | `middleware.ts` | Valid token value |
| API key prefix length | `12` | `auth.ts` | Characters stored for fast lookup |
| bcrypt cost factor | `12` | `admin/clients/route.ts` | Hash computation cost |
| API key format | `nf_live_{64 hex}` | `admin/clients/route.ts` | Total 72 characters |

### Crawl Monitor
| Constant | Value | Location | Description |
|---|---|---|---|
| `CONSECUTIVE_FAILURE_THRESHOLD` | `3` | `crawl-monitor.ts` | Failures before "critical" status |

### CORS
| Constant | Value | Location | Description |
|---|---|---|---|
| Allowed origin | `*` | `cors.ts` | All origins allowed |
| Allowed methods | `GET, OPTIONS` | `cors.ts` | Read-only access |
| Max age | `86400` | `cors.ts` | 24 hour preflight cache |

---

## 29. Development Guide

### Initial Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd news-factory_v2

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, CRON_SECRET, SITE_PASSWORD
# Optional: OPENROUTER_API_KEY (needed for embeddings only)

# 4. Apply database migrations
# Run SQL files from supabase/migrations/ sequentially in Supabase SQL editor

# 5. Initialize crawl settings
npx tsx scripts/setup-crawl-settings.ts

# 6. Start development server
npm run dev
```

### Adding a New Site

1. **Define site config** in `src/config/sites.ts`:
   - Add to `SITES` array with unique `id`, `name`, `type`, `listUrl`, `selectors`, etc.
   - If the site's HTML structure matches an existing parser type → reuse that type
   - If unique structure → create new parser (step 2)

2. **Create parser** (if needed) in `src/lib/crawl/parsers/{name}.ts`:
   ```typescript
   import type { SiteParser } from "@/types/crawler";
   import { parseWithPattern } from "./common";

   export const myParser: SiteParser = (ctx) => {
     return parseWithPattern(ctx, {
       // Override only what differs from default behavior
       extractArticleId: (href) => { /* custom logic */ },
     });
   };
   ```

3. **Register parser** in `src/lib/crawl/parsers/index.ts`:
   - Add import and entry in `PARSERS` record

4. **Add parser type** to `ParserType` union in `src/types/crawler.ts`

5. **Test**:
   ```bash
   npx tsx scripts/test-crawl.ts my-new-site
   ```

### Testing a Parser Change

```bash
# Test list page parsing for a specific site
npx tsx scripts/test-crawl.ts gwangju-city

# Test detail page parsing for a specific URL
npx tsx scripts/test-detail.ts "https://..."

# Run full crawl for a specific site (inserts into DB)
npx tsx scripts/crawl.ts --sites gwangju-city --limit 3
```

### Build & Deploy

```bash
# Type check + build
npm run build
# Produces: .next/ directory

# Start production server
npm start
# Listens on port 3000 by default
```

---

## 30. Known Architectural Decisions

### 30.1 Passthrough Mode (No AI Generation)

The system was designed for AI-powered article generation via OpenRouter, but currently operates in **passthrough mode**:
- `insertArticle()` in `crawler.ts` creates both the press release AND article in one step
- The article body is a cleaned copy of the press release content
- `category` is always `"press_release"`
- The "publish" stage in the pipeline typically processes 0 records (PRs are already `'processed'` after crawling)
- All AI generation code paths exist and are functional — switching from passthrough to AI mode would require modifying `insertArticle()` to NOT create articles, and instead let `batch-generate.ts` handle article creation with AI calls

### 30.2 Dual Mutex System

Two independent mutexes exist:
- `orchestrator.ts`: `let running = false` — for automated pipeline (`executePipeline()`)
- `manual.ts`: `let manualRunning = false` — for manual crawl (`executeManualCrawl()`)

These are independent — an automated pipeline and a manual crawl can technically run simultaneously. This is by design: manual crawls have a 50s deadline and are considered lower-impact.

### 30.3 In-Memory Rate Limiting

Rate limiting uses a `Map` in process memory, not database storage. This means:
- Rate limits reset on server restart
- In multi-instance deployments, each instance has independent rate limits
- This is acceptable for the current single-instance deployment model

### 30.4 GitHub Actions Runs Script Directly

The cron pipeline runs `npx tsx scripts/run-pipeline.ts` directly, NOT via HTTP to the API. This avoids serverless timeout limits and provides more reliable execution. The `/api/cron/crawl` endpoint exists as an alternative trigger for external cron services.

### 30.5 Press Release Status Lifecycle

In passthrough mode, the status lifecycle is simplified:
- Crawled → `'processed'` (skips `'collected'` and `'embedded'` states)
- If embedding is run separately via `scripts/embed.ts`, status goes: `'collected'` → `'embedded'`
- The `batch-generate.ts` picks up both `'collected'` and `'embedded'` statuses

### 30.6 Cookie-Based Admin Auth

Admin authentication uses a simple cookie with a hardcoded token value (`"nf2_site_access_granted"`). This is intentionally simple — the admin dashboard is for internal use only. The password comparison uses direct string matching against `SITE_PASSWORD` env variable (not bcrypt).

### 30.7 No Test Suite

Despite having Playwright as a devDependency, no test files currently exist in the project. The test infrastructure is set up but unused. Testing is done manually via the `test-crawl.ts` and `test-detail.ts` scripts.

---

_End of technical reference. This document covers every module, function, type, constant, database interaction, API contract, and operational workflow in the news-factory_v2 project._
