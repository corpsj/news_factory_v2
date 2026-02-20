# 수동 크롤링 — Admin 대시보드에서 옵션 기반 수동 크롤링 + 전체 파이프라인

## TL;DR

> **Quick Summary**: 관리자 대시보드에 수동 크롤링 페이지 추가. 사이트 선택, 날짜 범위, 페이지 수 등 다양한 옵션으로 크롤링 후 임베딩 → 기사 생성까지 전체 파이프라인 실행.
> 
> **Deliverables**:
> - `/admin/crawl` 페이지 (사이트 멀티셀렉트, 날짜 범위, 옵션 폼)
> - `POST /api/admin/crawl` API 엔드포인트
> - 멀티페이지 크롤링 지원 (페이지네이션)
> - 날짜 범위 필터링 (insert 전 필터)
> - 수동 파이프라인 함수 (cron mutex 우회)
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → F1-F4

---

## Context

### Original Request
"수동 크롤링 기능을 추가해줘. 내가 원할때 원하는 기간 범위로 원하는 기관에서 등 다양한 옵션으로 크롤링 가능하게"

### Interview Summary
**Key Discussions**:
- **UI 위치**: 관리자 대시보드 `/admin/crawl` 새 페이지
- **후처리**: 전체 파이프라인 (크롤링 → 임베딩 → 기사 생성)
- **기간 범위**: 날짜 필터링 — 크롤링 후 published_at으로 insert 전 필터
- **기관 선택**: 27개 지자체 중 멀티셀렉트

**Research Findings**:
- `runCrawler()` — 이미 siteIds, limitPerSite, delayMs, siteConcurrency 지원
- `executePipeline()` — in-process mutex로 cron과 충돌 위험 → 직접 단계 호출 필요
- 파서들은 1페이지만 크롤링 — 날짜 범위를 위해 멀티페이지 지원 필요
- Admin UI 패턴: Tailwind CSS v4, dark theme, server component + client component 분리
- `client-actions.tsx` 패턴: useState + fetch POST → 성공/실패 피드백

### Metis Review
**Identified Gaps** (addressed):
- `executePipeline()` mutex 충돌 → 별도 `executeManualCrawl()` 함수 생성 (mutex 우회)
- embed/generate가 전체 pending 항목 처리 → limit 파라미터로 범위 제한
- 날짜 필터링 위치 → insert 전 필터링 (DB에 불필요한 데이터 방지)
- 페이지네이션 URL 패턴이 사이트마다 다름 → SiteConfig에 optional paginationParam
- maxPages 상한 필요 → 최대 5페이지 하드캡
- 파서 수정 불필요 — crawlSite() 레벨에서 페이지 루프 추가

---

## Work Objectives

### Core Objective
관리자가 브라우저에서 사이트 선택, 날짜 범위, 크롤링 옵션을 지정하여 수동 크롤링 + 전체 파이프라인을 실행할 수 있는 기능 추가.

### Concrete Deliverables
- `src/types/crawler.ts` — CrawlOptions 확장 (maxPages, dateRange) + SiteConfig 확장 (paginationParam)
- `src/config/sites.ts` — 27개 사이트에 paginationParam 추가
- `src/components/admin/sidebar.tsx` — "크롤링" 네비게이션 항목 추가
- `src/lib/crawl/crawler.ts` — crawlSite() 멀티페이지 루프 + 날짜 필터링
- `src/lib/pipeline/manual.ts` — executeManualCrawl() 함수 (새 파일)
- `src/app/api/admin/crawl/route.ts` — POST API 엔드포인트 (새 파일)
- `src/app/admin/crawl/page.tsx` — 수동 크롤링 페이지 (새 파일)
- `src/app/admin/crawl/crawl-form.tsx` — 크롤링 폼 클라이언트 컴포넌트 (새 파일)

### Definition of Done
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 통과
- [ ] `/admin/crawl` 페이지에서 사이트 선택 후 크롤링 실행 가능
- [ ] 날짜 범위 필터링 작동 (범위 밖 게시물 insert 안됨)
- [ ] 크롤링 → 임베딩 → 기사 생성 전체 파이프라인 실행
- [ ] 결과가 UI에 표시됨 (사이트별 수집 수, 단계별 처리 수)

### Must Have
- 사이트 멀티셀렉트 (전체 선택/해제 포함)
- 날짜 범위 입력 (시작일/종료일)
- 페이지 수 옵션 (1~5)
- 사이트당 게시물 제한 옵션
- 크롤링 결과 표시 (사이트별 수집 건수)
- 파이프라인 단계별 결과 표시 (크롤링/임베딩/기사생성)
- cron 스케줄과 독립적 실행 (mutex 충돌 없음)

### Must NOT Have (Guardrails)
- WebSocket/SSE 실시간 통신 금지 — 블로킹 요청 + 로딩 스피너
- 기존 `executePipeline()` 수정 금지 — 별도 함수 생성
- 기존 `SiteParser` 타입 시그니처 변경 금지
- 기존 파서 파일 (`gwangju-do.ts` 등) 수정 금지
- 새 npm 의존성 추가 금지 (날짜 피커 등 UI 라이브러리)
- 새 DB 테이블 추가 금지 — 기존 press_releases, articles, crawl_logs 사용
- 기존 cron route (`/api/cron/crawl`) 수정 금지
- `parseWithPattern()` 함수 시그니처 변경 금지
- maxPages > 5 허용 금지 (하드캡)
- 인증 시스템/로그인 추가 금지 — 기존 referer 기반 패턴 유지

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: none
- **QA Policy**: Agent-executed verification via tsc, build, Playwright (UI), curl (API)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Type check**: Bash (`npx tsc --noEmit`)
- **Build**: Bash (`npm run build`)
- **API**: Bash (curl with JSON body)
- **UI**: Playwright (navigate, fill form, click, verify)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — types + config, 3 parallel):
├── Task 1: Extend CrawlOptions and SiteConfig types [quick]
├── Task 2: Add paginationParam to sites.ts [quick]
├── Task 3: Add sidebar nav item [quick]

Wave 2 (After Wave 1 — core logic, 2 parallel):
├── Task 4: Multi-page crawling + date filtering in crawler.ts [deep]
├── Task 5: Create manual pipeline function [quick]

Wave 3 (After Wave 2 — API):
├── Task 6: Create API endpoint POST /api/admin/crawl [unspecified-high]

Wave 4 (After Wave 3 — UI):
├── Task 7: Create admin crawl page + form component [visual-engineering]

Wave 5 (After Wave 4 — verification):
├── Task 8: End-to-end verification [unspecified-high]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
├── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → F1-F4
Parallel Speedup: Wave 1 (3 parallel), Wave 2 (2 parallel), Final (4 parallel)
Max Concurrent: 4 (Final Wave)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 4, 5, 6 |
| 2 | — | 4 |
| 3 | — | 7 |
| 4 | 1, 2 | 6 |
| 5 | 1 | 6 |
| 6 | 4, 5 | 7 |
| 7 | 3, 6 | 8 |
| 8 | 7 | F1-F4 |
| F1-F4 | 8 | — |

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 → `quick`, T2 → `quick`, T3 → `quick`
- **Wave 2**: **2** — T4 → `deep`, T5 → `quick`
- **Wave 3**: **1** — T6 → `unspecified-high`
- **Wave 4**: **1** — T7 → `visual-engineering`
- **Wave 5**: **1** — T8 → `unspecified-high`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` + `playwright`, F4 → `deep`

---

## TODOs

- [ ] 1. Extend CrawlOptions and SiteConfig types

  **What to do**:
  - `src/types/crawler.ts` — CrawlOptions 타입에 추가:
    - `maxPages?: number` — 크롤링할 최대 페이지 수 (기본 1, 최대 5)
    - `dateRange?: { from: string; to: string }` — 날짜 범위 필터 (ISO 형식)
  - `src/types/crawler.ts` — SiteConfig 타입에 추가:
    - `paginationParam?: string` — URL에 추가할 페이지 파라미터명 (예: "page", "pageIndex")
  - `npx tsc --noEmit` 실행하여 기존 코드와 호환 확인

  **Must NOT do**:
  - 기존 CrawlOptions 필드 변경/삭제 금지 (additive only)
  - SiteParser 타입 시그니처 변경 금지
  - SiteParserContext 타입 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/types/crawler.ts:58-63` — 현재 CrawlOptions 정의
  - `src/types/crawler.ts:27-35` — 현재 SiteConfig 정의

  **WHY Each Reference Matters**:
  - CrawlOptions에 optional 필드 추가이므로 기존 호출부(scripts/crawl.ts, crawler.ts, cron route)는 영향 없음
  - SiteConfig에 optional paginationParam 추가이므로 기존 sites.ts 설정에 영향 없음

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript 컴파일 성공
    Tool: Bash
    Preconditions: 타입 수정 완료
    Steps:
      1. `npx tsc --noEmit` 실행
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-1-tsc.txt

  Scenario: 기존 코드 호환성
    Tool: Bash
    Preconditions: 타입 수정 완료
    Steps:
      1. `grep -rn "CrawlOptions" src/ scripts/` — 모든 사용처 확인
      2. `npx tsc --noEmit` — 에러 없음 확인
    Expected Result: 기존 CrawlOptions 사용처에서 타입 에러 없음
    Evidence: .sisyphus/evidence/task-1-compat.txt
  ```

  **Commit**: YES
  - Message: `feat(types): extend CrawlOptions with maxPages and dateRange`
  - Files: `src/types/crawler.ts`

---

- [ ] 2. Add paginationParam to site configs

  **What to do**:
  - `src/config/sites.ts` — 27개 사이트에 `paginationParam` 필드 추가
  - 각 파서 타입별 예상 페이지네이션 파라미터:
    - `gwangju-do` 타입 (gwangju-city, gwangsan, goheung, hampyeong): `"pageIndex"`
    - `gwangju-es` 타입 (donggu, seogu, bukgu, gwangyang): `"nPage"`
    - `jeonnam-do` 타입 (jeonnam-province): `"pageIndex"`
    - `jeonnam-si` 타입 (mokpo, yeosu, naju, boseong, muan): `"pageNo"`
    - 기타 사이트: 일단 설정하지 않음 (undefined → 단일 페이지 유지)
  - **중요**: 실제 사이트에서 테스트 전까지는 추정값. 에이전트는 가능하면 1~2개 사이트의 2페이지 URL을 실제 접속하여 검증할 것
  - `npx tsc --noEmit` 실행

  **Must NOT do**:
  - 기존 사이트 설정(name, listUrl, selectors 등) 변경 금지
  - 파서 파일 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 3)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 4
  - **Blocked By**: None (Task 1의 타입 정의와 동시 진행 가능 — 실제 타입 적용은 Task 1 merge 후)

  **References**:

  **Pattern References**:
  - `src/config/sites.ts:92-100` — 사이트 설정 구조 예시 (gwangju-city)
  - `src/config/sites.ts:1-90` — 셀렉터 상수 정의

  **WHY Each Reference Matters**:
  - 각 사이트 객체에 `paginationParam: "pageIndex"` 등을 추가하는 위치 확인
  - 파서 타입별로 그룹핑하여 동일 패턴 적용

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 사이트 설정에 paginationParam 추가됨
    Tool: Bash
    Preconditions: sites.ts 수정 완료
    Steps:
      1. `grep -c "paginationParam" src/config/sites.ts`
      2. 최소 15개 이상의 사이트에 paginationParam이 설정됨 확인
    Expected Result: 15개 이상 매치
    Evidence: .sisyphus/evidence/task-2-pagination-params.txt

  Scenario: 빌드 호환성
    Tool: Bash
    Steps:
      1. `npx tsc --noEmit`
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-2-tsc.txt
  ```

  **Commit**: YES
  - Message: `feat(config): add paginationParam to site configs`
  - Files: `src/config/sites.ts`

---

- [ ] 3. Add sidebar nav item

  **What to do**:
  - `src/components/admin/sidebar.tsx` — NAV_ITEMS 배열에 새 항목 추가:
    - label: "크롤링"
    - href: "/admin/crawl"
    - icon: 적절한 아이콘 (기존 패턴: 유니코드 심볼 사용, 예: "⟳" 또는 "↻")
  - "모니터링" 항목 바로 아래에 위치시킬 것

  **Must NOT do**:
  - 기존 네비게이션 항목 순서 변경 금지
  - 새로운 컴포넌트 라이브러리 추가 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/admin/sidebar.tsx:7` — NAV_ITEMS 배열 정의
  - `src/components/admin/sidebar.tsx` — 전체 파일 (icon 패턴, href 구조)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 사이드바에 크롤링 항목 추가됨
    Tool: Bash
    Steps:
      1. `grep -n "크롤링" src/components/admin/sidebar.tsx`
      2. `grep -n "/admin/crawl" src/components/admin/sidebar.tsx`
    Expected Result: 두 grep 모두 매치
    Evidence: .sisyphus/evidence/task-3-sidebar.txt

  Scenario: 빌드 통과
    Tool: Bash
    Steps:
      1. `npm run build`
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-3-build.txt
  ```

  **Commit**: YES
  - Message: `feat(admin): add crawl nav item to sidebar`
  - Files: `src/components/admin/sidebar.tsx`

---

- [ ] 4. Multi-page crawling + date filtering in crawler.ts

  **What to do**:
  - `src/lib/crawl/crawler.ts` — `crawlSite()` 함수를 수정하여 멀티페이지 크롤링 지원:
    1. **페이지 루프**: `maxPages` (기본 1) 만큼 반복
       - 페이지 URL 생성: `site.paginationParam`이 있으면 `listUrl` + separator + `paginationParam=pageNum`
       - separator: listUrl에 `?`가 있으면 `&`, 없으면 `?`
       - `paginationParam`이 없으면 1페이지만 크롤링 (기존 동작 유지)
    2. **파서 호출**: 각 페이지의 HTML을 가져와서 기존 파서에 전달 (파서 수정 없음)
    3. **중복 제거**: 페이지 간 중복 article (같은 originId) 제거
    4. **정지 조건**: (a) 페이지에서 0개 article 추출, (b) maxPages 도달, (c) 모든 article이 dateRange.from보다 오래됨
    5. **날짜 필터링**: `options.dateRange`가 있으면 insert 전에 article.date로 필터:
       - `from <= article.date <= to` 범위의 article만 유지
       - 범위 밖 article은 건너뜀 (insert 안함)
    6. **크롤 로그**: 전체 페이지 합산 결과로 기록

  - **maxPages 하드캡**: `Math.min(options.maxPages ?? 1, 5)` — 최대 5 강제

  **Must NOT do**:
  - `parseWithPattern()` 함수 시그니처 변경 금지
  - 기존 파서 파일 수정 금지
  - `insertArticle()` 함수 수정 금지
  - `SiteParserContext` 타입 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `src/lib/crawl/crawler.ts:91-160` — 현재 `crawlSite()` 함수 전체
  - `src/lib/crawl/crawler.ts:32-67` — `insertArticle()` (수정 불가, 호출만)
  - `src/lib/crawl/crawler.ts:69-89` — `writeCrawlLog()` (수정 불가, 호출만)
  - `src/lib/crawl/crawler.ts:18-30` — `pickSites()` (수정 불가)

  **API/Type References**:
  - `src/types/crawler.ts:48-54` — SiteParserContext (listHtml을 교체하면서 파서 재호출)
  - `src/types/crawler.ts:37-46` — ParsedArticle (date 필드로 날짜 필터)

  **WHY Each Reference Matters**:
  - `crawlSite()` 내부에서 listHtml 가져오는 부분을 루프로 감싸야 함
  - 파서는 SiteParserContext.listHtml을 읽으므로, 각 페이지의 HTML을 새 context로 전달
  - ParsedArticle.date가 ISO 형식이므로 문자열 비교로 날짜 필터 가능

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: maxPages > 1로 크롤링 시 여러 페이지 시도
    Tool: Bash
    Preconditions: sites.ts에 paginationParam 설정된 사이트 존재
    Steps:
      1. 인라인 스크립트로 runCrawler({ siteIds: ["gwangju-city"], maxPages: 2, limitPerSite: 20 }) 호출
      2. 결과의 totalFound 확인
    Expected Result: 1페이지보다 더 많은 article 수집 (또는 2페이지가 동일하면 중복 제거)
    Evidence: .sisyphus/evidence/task-4-multipage.txt

  Scenario: dateRange 필터 적용 시 범위 밖 article 제외
    Tool: Bash
    Steps:
      1. 인라인 스크립트로 runCrawler({ siteIds: ["gwangju-city"], dateRange: { from: "2099-01-01", to: "2099-12-31" } }) 호출
      2. 결과 확인: 미래 날짜이므로 0건 insert 예상
    Expected Result: totalInserted = 0 (날짜 범위에 맞는 게시물 없음)
    Evidence: .sisyphus/evidence/task-4-datefilter.txt

  Scenario: paginationParam 없는 사이트는 1페이지만 크롤링
    Tool: Bash
    Steps:
      1. paginationParam이 undefined인 사이트로 maxPages=3 크롤링
      2. 1페이지만 크롤링됨 확인
    Expected Result: 기존 동작과 동일 (1페이지만)
    Evidence: .sisyphus/evidence/task-4-nopagination.txt

  Scenario: TypeScript 컴파일 성공
    Tool: Bash
    Steps:
      1. `npx tsc --noEmit`
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-4-tsc.txt
  ```

  **Commit**: YES
  - Message: `feat(crawl): add multi-page crawling and date range filtering`
  - Files: `src/lib/crawl/crawler.ts`

---

- [ ] 5. Create manual pipeline function

  **What to do**:
  - `src/lib/pipeline/manual.ts` (새 파일) — `executeManualCrawl()` 함수 생성:
    ```typescript
    export type ManualCrawlOptions = {
      siteIds?: string[];
      limitPerSite?: number;
      maxPages?: number;
      dateRange?: { from: string; to: string };
      delayMs?: number;
    };

    export type ManualCrawlResult = {
      success: boolean;
      totalDurationMs: number;
      stages: {
        crawl: { status: string; durationMs: number; detail: object };
        embed: { status: string; durationMs: number; detail: object };
        generate: { status: string; durationMs: number; detail: object };
      };
    };

    export async function executeManualCrawl(options: ManualCrawlOptions): Promise<ManualCrawlResult>
    ```
  - **로직**:
    1. `runCrawler()` 호출 (options 전달)
    2. `embedCollectedPressReleases()` 호출 (limit: 200)
    3. `generateEmbeddedPressReleaseArticles()` 호출 (limit: 200)
    4. 각 단계 결과와 소요 시간 기록
    5. 에러 시 해당 단계 실패로 기록하되 다음 단계 계속 진행
  - **중요**: `executePipeline()`의 `running` mutex를 사용하지 않음. 자체 `manualRunning` flag 사용.
  - Supabase client는 `getSupabaseClient()` 패턴 사용

  **Must NOT do**:
  - `executePipeline()` 수정 금지
  - `src/lib/pipeline/orchestrator.ts` 수정 금지
  - `batch-embed.ts`, `batch-generate.ts` 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/lib/pipeline/orchestrator.ts:1-250` — executePipeline() 전체 (참고만, 수정 불가)
  - `src/lib/crawl/crawler.ts:162` — runCrawler() 시그니처
  - `src/lib/ai/batch-embed.ts:29` — embedCollectedPressReleases() 시그니처
  - `src/lib/ai/batch-generate.ts:138` — generateEmbeddedPressReleaseArticles() 시그니처

  **WHY Each Reference Matters**:
  - orchestrator.ts의 executePipeline()과 동일 패턴이지만 mutex 독립
  - 세 함수를 순차 호출하므로 정확한 시그니처 확인 필요

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript 컴파일 성공
    Tool: Bash
    Steps:
      1. `npx tsc --noEmit`
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-5-tsc.txt

  Scenario: manualRunning flag가 executePipeline의 running과 독립
    Tool: Bash
    Steps:
      1. `grep -n "running" src/lib/pipeline/orchestrator.ts` — 기존 mutex 확인
      2. `grep -n "manualRunning" src/lib/pipeline/manual.ts` — 새 mutex 확인
      3. 두 변수가 서로 다른 파일에 독립적으로 존재함 확인
    Expected Result: 두 파일에 각각 독립된 mutex 변수
    Evidence: .sisyphus/evidence/task-5-mutex.txt
  ```

  **Commit**: YES
  - Message: `feat(pipeline): add manual crawl pipeline function`
  - Files: `src/lib/pipeline/manual.ts`

---

- [ ] 6. Create API endpoint POST /api/admin/crawl

  **What to do**:
  - `src/app/api/admin/crawl/route.ts` (새 파일) — POST 핸들러:
    ```typescript
    export async function POST(request: Request): Promise<NextResponse>
    ```
  - **인증**: `/api/admin/clients/route.ts`의 패턴 따르기 (CRON_SECRET OR same-origin referer 체크)
  - **Request body**:
    ```json
    {
      "siteIds": ["gwangju-city", "mokpo"],  // optional, 없으면 전체
      "limitPerSite": 10,                     // optional, default 5
      "maxPages": 3,                          // optional, default 1, max 5
      "dateRange": {                          // optional
        "from": "2026-02-01",
        "to": "2026-02-19"
      },
      "delayMs": 900                          // optional, default 900
    }
    ```
  - **Validation**:
    - siteIds: 존재하지 않는 ID → 400 에러 + 메시지
    - maxPages: 1~5 범위 강제 (범위 밖이면 clamp)
    - limitPerSite: 1~100 범위 강제
  - **Response**: ManualCrawlResult 객체 반환
  - **에러 처리**: 401 (인증 실패), 400 (잘못된 입력), 409 (이미 실행 중), 500 (서버 에러)

  **Must NOT do**:
  - `/api/cron/crawl/route.ts` 수정 금지
  - GET 메서드 추가 금지 (POST만)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (Sequential)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 4, 5

  **References**:

  **Pattern References**:
  - `src/app/api/admin/clients/route.ts:1-60` — 인증 패턴 (CRON_SECRET OR same-origin)
  - `src/app/api/cron/crawl/route.ts:1-45` — 응답 구조 참고 (수정 불가)

  **API/Type References**:
  - `src/lib/pipeline/manual.ts` — executeManualCrawl() (Task 5에서 생성)
  - `src/config/sites.ts` — SITES 배열 (siteId 검증용)

  **WHY Each Reference Matters**:
  - clients/route.ts의 인증 패턴을 정확히 복제하여 일관성 유지
  - cron/crawl 응답 구조를 참고하되 수정하지 않음

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 인증 없이 요청 → 401
    Tool: Bash
    Steps:
      1. `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/admin/crawl -H "Content-Type: application/json" -d '{}'`
    Expected Result: HTTP 401
    Evidence: .sisyphus/evidence/task-6-auth-fail.txt

  Scenario: 유효한 요청 → 200
    Tool: Bash
    Preconditions: dev server 실행 중
    Steps:
      1. `curl -s -X POST http://localhost:3000/api/admin/crawl -H "Content-Type: application/json" -H "Referer: http://localhost:3000/admin/crawl" -d '{"siteIds":["gwangju-city"],"limitPerSite":1}' | jq '.success'`
    Expected Result: true 또는 false (401이 아닌 정상 응답)
    Evidence: .sisyphus/evidence/task-6-valid-request.txt

  Scenario: 잘못된 siteId → 400
    Tool: Bash
    Steps:
      1. `curl -s -X POST http://localhost:3000/api/admin/crawl -H "Content-Type: application/json" -H "Referer: http://localhost:3000/admin/crawl" -d '{"siteIds":["nonexistent"]}' | jq '.error'`
    Expected Result: 에러 메시지 포함 응답
    Evidence: .sisyphus/evidence/task-6-invalid-site.txt

  Scenario: TypeScript 컴파일 + 빌드
    Tool: Bash
    Steps:
      1. `npx tsc --noEmit && npm run build`
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-6-build.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add manual crawl trigger endpoint`
  - Files: `src/app/api/admin/crawl/route.ts`

---

- [ ] 7. Create admin crawl page + form component

  **What to do**:
  - `src/app/admin/crawl/page.tsx` (새 파일) — 서버 컴포넌트:
    - 페이지 제목 "수동 크롤링"
    - CrawlForm 클라이언트 컴포넌트 렌더링
    - `src/config/sites.ts`에서 SITES 가져와서 props로 전달 (id, name 목록)

  - `src/app/admin/crawl/crawl-form.tsx` (새 파일) — "use client" 컴포넌트:
    - **사이트 선택 영역**:
      - "전체 선택" / "전체 해제" 체크박스
      - 27개 사이트를 지역별 그룹으로 표시:
        - 광주: 광주시, 동구, 서구, 남구, 북구, 광산구
        - 전라남도: 전라남도, 목포시, 여수시, 순천시, 나주시, 광양시
        - 군: 담양군, 곡성군, 구례군, 고흥군, 보성군, 화순군, 장흥군, 강진군, 해남군, 무안군, 함평군, 영광군, 장성군, 완도군, 신안군
      - 각 사이트 체크박스 (체크/해제)

    - **옵션 영역**:
      - 기간: `<input type="date">` × 2 (시작일, 종료일) — optional
      - 페이지 수: `<input type="number" min=1 max=5>` — default 1
      - 사이트당 제한: `<input type="number" min=1 max=100>` — default 10

    - **실행 버튼**: "크롤링 시작" (disabled when loading or 0 sites selected)

    - **로딩 상태**: 버튼 비활성화 + 스피너 + "크롤링 진행 중... (수분 소요될 수 있습니다)"

    - **결과 표시 영역** (크롤링 완료 후):
      - 전체 소요 시간
      - 단계별 카드 (3개):
        - 크롤링: 사이트 수, 발견 건수, 신규 삽입 건수, 소요 시간
        - 임베딩: 처리 건수, 소요 시간
        - 기사 생성: 생성 건수, 실패 건수, 소요 시간
      - 에러 발생 시 에러 메시지 표시 (빨간 배경)

    - **스타일**: 기존 admin 대시보드 패턴 따르기:
      - Dark theme: `bg-zinc-950 text-zinc-100`
      - 카드: `rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl`
      - 버튼: `rounded-lg bg-emerald-600 hover:bg-emerald-500 px-6 py-3 text-white font-medium`
      - 체크박스: 기본 HTML checkbox + label (커스텀 스타일 불필요)
      - 입력: `rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white`

    - **API 호출**: `fetch("/api/admin/crawl", { method: "POST", body: JSON.stringify(formData) })`

  **Must NOT do**:
  - shadcn/ui, react-datepicker 등 외부 UI 라이브러리 사용 금지
  - 기존 admin 페이지 수정 금지
  - WebSocket/SSE 사용 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (Sequential)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 3, 6

  **References**:

  **Pattern References**:
  - `src/app/admin/clients/page.tsx` — 서버 컴포넌트 + 클라이언트 컴포넌트 분리 패턴
  - `src/app/admin/clients/client-actions.tsx` — 폼 + fetch POST 패턴 (가장 중요한 참고)
  - `src/app/admin/monitoring/page.tsx` — 카드 그리드 레이아웃 패턴
  - `src/components/admin/sidebar.tsx` — 네비게이션 구조 확인

  **API/Type References**:
  - `src/config/sites.ts` — SITES 배열 (id, name으로 체크박스 생성)
  - `src/lib/pipeline/manual.ts` — ManualCrawlResult 타입 (결과 표시용)

  **WHY Each Reference Matters**:
  - `client-actions.tsx`는 유일한 기존 폼 패턴 — fetch POST, 로딩 상태, 성공/실패 처리를 동일하게
  - `monitoring/page.tsx`는 카드 그리드 레이아웃 — 결과 표시에 동일 패턴 사용
  - SITES 배열에서 id와 name을 가져와 체크박스 목록 생성

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 페이지 로드 및 기본 렌더링
    Tool: Playwright
    Preconditions: dev server 실행 중
    Steps:
      1. navigate to http://localhost:3000/admin/crawl
      2. assert page title contains "크롤링"
      3. assert 27 checkboxes visible (사이트 선택)
      4. assert date inputs visible (시작일, 종료일)
      5. assert "크롤링 시작" button visible
      6. screenshot
    Expected Result: 페이지가 정상 렌더링되고 모든 요소 존재
    Evidence: .sisyphus/evidence/task-7-page-load.png

  Scenario: 사이드바에서 크롤링 링크 동작
    Tool: Playwright
    Steps:
      1. navigate to http://localhost:3000/admin
      2. click sidebar link containing "크롤링"
      3. assert URL is /admin/crawl
    Expected Result: /admin/crawl로 이동
    Evidence: .sisyphus/evidence/task-7-sidebar-nav.png

  Scenario: 전체 선택/해제 작동
    Tool: Playwright
    Steps:
      1. navigate to /admin/crawl
      2. click "전체 선택" checkbox
      3. assert all 27 site checkboxes checked
      4. click "전체 해제" or uncheck "전체 선택"
      5. assert all unchecked
    Expected Result: 전체 선택/해제 토글 정상 동작
    Evidence: .sisyphus/evidence/task-7-select-all.png

  Scenario: 빌드 통과
    Tool: Bash
    Steps:
      1. `npm run build`
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-7-build.txt
  ```

  **Commit**: YES
  - Message: `feat(admin): add manual crawl page with options form`
  - Files: `src/app/admin/crawl/page.tsx`, `src/app/admin/crawl/crawl-form.tsx`

---

- [ ] 8. End-to-end verification

  **What to do**:
  - 전체 파이프라인 검증:
    1. `npx tsc --noEmit` + `npm run build` 최종 확인
    2. dev server 시작 후 `/admin/crawl` 페이지 접속
    3. 1개 사이트 선택 (gwangju-city), limitPerSite=1, maxPages=1
    4. "크롤링 시작" 클릭
    5. 결과 확인: 크롤링 → 임베딩 → 기사 생성 3단계 모두 표시
    6. API 직접 호출 테스트 (curl)
    7. DB에서 새로 삽입된 press_releases, articles 확인

  **Must NOT do**:
  - 소스 파일 수정 금지 (검증만)
  - 27개 사이트 전체 크롤링 금지 (시간 소모)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4
  - **Blocked By**: Task 7

  **References**:
  - All previous task deliverables

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 빌드 최종 확인
    Tool: Bash
    Steps:
      1. `npx tsc --noEmit && npm run build`
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-8-build.txt

  Scenario: UI에서 전체 플로우 동작
    Tool: Playwright
    Preconditions: dev server + Ollama 실행 중
    Steps:
      1. navigate to /admin/crawl
      2. check "광주시" checkbox
      3. set limitPerSite to 1
      4. click "크롤링 시작"
      5. wait for loading to complete (timeout: 180s)
      6. assert result section visible
      7. assert 크롤링 단계 결과 표시
      8. screenshot
    Expected Result: 3단계 결과 모두 표시됨
    Evidence: .sisyphus/evidence/task-8-e2e-flow.png

  Scenario: API 직접 호출
    Tool: Bash
    Steps:
      1. curl -s -X POST http://localhost:3000/api/admin/crawl -H "Content-Type: application/json" -H "Referer: http://localhost:3000/admin/crawl" -d '{"siteIds":["gwangju-city"],"limitPerSite":1}' | jq '.'
    Expected Result: JSON with success field and stages array
    Evidence: .sisyphus/evidence/task-8-api-test.txt
  ```

  **Commit**: NO (검증만)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + `npm run build`. Review all changed/created files for: `as any`/`@ts-ignore`, empty catches, console.log in production code, commented-out code, unused imports. Verify new types are additive (not breaking). Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` + `playwright` skill
  Start from clean state. Navigate to `/admin/crawl`. Verify: page loads, sidebar has link, site checkboxes work, date inputs work, form submission triggers API, loading state appears, results display. Test with 1 site + limit 1 for fast feedback. Save screenshots.
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1. Check "Must NOT do" compliance: executePipeline() unchanged, parser files unchanged, SiteParser type unchanged, no new npm deps. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Order | Message | Files |
|-------|---------|-------|
| 1 | `feat(types): extend CrawlOptions with maxPages and dateRange` | `src/types/crawler.ts` |
| 2 | `feat(config): add paginationParam to site configs` | `src/config/sites.ts` |
| 3 | `feat(admin): add crawl nav item to sidebar` | `src/components/admin/sidebar.tsx` |
| 4 | `feat(crawl): add multi-page crawling and date range filtering` | `src/lib/crawl/crawler.ts` |
| 5 | `feat(pipeline): add manual crawl pipeline function` | `src/lib/pipeline/manual.ts` |
| 6 | `feat(api): add manual crawl trigger endpoint` | `src/app/api/admin/crawl/route.ts` |
| 7 | `feat(admin): add manual crawl page with options form` | `src/app/admin/crawl/page.tsx`, `src/app/admin/crawl/crawl-form.tsx` |

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit                    # Expected: exit 0
npm run build                       # Expected: exit 0
curl -X POST http://localhost:3000/api/admin/crawl \
  -H "Content-Type: application/json" \
  -H "Referer: http://localhost:3000/admin/crawl" \
  -d '{"siteIds":["gwangju-city"],"limitPerSite":1}' \
  # Expected: { success: true, stages: [...] }
```

### Final Checklist
- [ ] CrawlOptions에 maxPages, dateRange 추가됨
- [ ] SiteConfig에 paginationParam 추가됨
- [ ] 사이드바에 "크롤링" 네비게이션 항목 있음
- [ ] crawlSite()가 멀티페이지 크롤링 지원
- [ ] 날짜 범위 필터링이 insert 전에 적용됨
- [ ] executeManualCrawl() 함수 존재 (executePipeline과 독립)
- [ ] POST /api/admin/crawl 엔드포인트 동작
- [ ] /admin/crawl 페이지 존재하고 폼 동작
- [ ] executePipeline() 미수정
- [ ] 기존 파서 파일 미수정
- [ ] 빌드 통과
