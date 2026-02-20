# Image Pipeline Fix — press_releases 이미지를 articles로 전달

## TL;DR

> **Quick Summary**: 크롤링으로 수집한 이미지 URL이 기사 생성 단계에서 버려지고 있음. 4개 파일의 코드 수정 + 기존 데이터 backfill로 해결.
> 
> **Deliverables**:
> - 기사 생성 시 보도자료 이미지를 articles 테이블로 passthrough
> - 기존 articles 데이터에 이미지 backfill
> - DB 이미지 현황 진단 스크립트
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → F1-F4

---

## Context

### Original Request
"이 뉴스팩토리가 클라이언트 언론사 홈페이지에 기사를 보내는 프로세스에서 부족한 점들을 찾아서 개선해줘. 크롤링 시에 이미지를 가져오지 않고 있는것. 내보내는 기사에서 이미지(이미지 링크)를 포함하지 않는 것."

### Interview Summary
**Key Discussions**:
- 파이프라인 전체 분석 완료: crawl → press_releases → generate → articles → API
- 크롤러 파서 코드는 이미지 추출 로직이 이미 존재함 (common.ts:extractImages)
- DB 스키마도 양쪽 테이블 모두 `images jsonb` 컬럼 있음
- API도 이미 `images` 필드를 반환하도록 구현됨
- **핵심 버그**: 기사 생성 단계에서 images를 SELECT하지 않고, 저장 시 `[]`로 하드코딩

**Research Findings**:
- `batch-generate.ts:42` — `select("id,source,title,content,link,published_at")` → images 미포함
- `batch-generate.ts:65` — `images: []` 하드코딩
- `article.ts:13-20` — `PressReleaseForArticleGeneration` 타입에 images 필드 없음
- 파서들(common.ts, namgu.ts, damyang.ts)은 모두 이미지 추출 로직 포함
- API routes는 이미 images 반환 구현 완료

### Metis Review
**Identified Gaps** (addressed):
- images 타입을 `string[]` (required)로 추가해야 함 — optional이면 안됨 (DB가 NOT NULL)
- backfill 시 press_releases.images가 빈 배열인 경우 no-op 처리 필요
- 코드 배포 후 backfill 실행 순서 중요 (race condition 방지)
- seed.ts도 images: []로 하드코딩 — 일관성 이슈이나 scope 외

---

## Work Objectives

### Core Objective
기사 생성 파이프라인에서 보도자료 이미지 URL을 articles 테이블로 passthrough하여 API 응답에 포함되도록 수정.

### Concrete Deliverables
- `src/types/article.ts` — PressReleaseForArticleGeneration에 images 필드 추가
- `src/lib/ai/batch-generate.ts` — 3곳 수정 (select 2곳 + insert 1곳)
- `scripts/backfill-images.ts` — 기존 articles에 이미지 backfill 스크립트
- `scripts/audit-images.ts` — press_releases 이미지 현황 진단 스크립트

### Definition of Done
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 통과
- [ ] 새로 생성되는 articles에 source press_release의 images가 포함됨
- [ ] 기존 articles에 backfill 완료

### Must Have
- images passthrough (press_releases → articles)
- 기존 데이터 backfill
- 빌드 통과

### Must NOT Have (Guardrails)
- AI 프롬프트(prompts.ts)에 이미지 추가 금지 — 텍스트 전용 LLM, 이미지는 메타데이터
- GeneratedArticle 타입에 images 추가 금지 — LLM 출력과 무관
- API routes 수정 금지 — 이미 정상 작동
- 파서 파일 수정 금지 — 이미지 추출 로직 이미 존재
- crawler.ts 수정 금지 — 이미 images 저장 중
- 이미지 다운로드/호스팅/CDN 구축 금지
- 이미지 메타데이터(alt, width, height) 추가 금지 — API 계약 변경
- 이미지 URL 유효성 검사 금지 — 별도 작업
- 테스트 인프라 추가 금지 — 기존 테스트 프레임워크 없음
- images를 optional 타입(`images?: string[]`)으로 만들기 금지 — DB가 NOT NULL

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: none
- **QA Policy**: Agent-executed verification via tsc, build, DB query

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Type check**: Use Bash (`npx tsc --noEmit`)
- **Build**: Use Bash (`npm run build`)
- **DB verification**: Use Bash (node/tsx with Supabase client)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — code fix + diagnostic script):
├── Task 1: Fix image passthrough in generation pipeline [quick]
├── Task 2: Create image audit script [quick]

Wave 2 (After Wave 1 — backfill + verification):
├── Task 3: Create and run backfill script [quick]
├── Task 4: End-to-end verification [quick]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
├── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 3 → Task 4 → F1-F4
Parallel Speedup: Task 1 & 2 parallel, F1-F4 parallel
Max Concurrent: 2 (Wave 1), 4 (Final)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 3, 4 |
| 2 | — | 4 |
| 3 | 1 | 4 |
| 4 | 1, 2, 3 | F1-F4 |
| F1-F4 | 4 | — |

### Agent Dispatch Summary

- **Wave 1**: **2** — T1 → `quick`, T2 → `quick`
- **Wave 2**: **2** — T3 → `quick`, T4 → `unspecified-high`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Fix image passthrough in generation pipeline

  **What to do**:
  - `src/types/article.ts` line 13-20: `PressReleaseForArticleGeneration` 타입에 `images: string[]` 필드 추가 (required, NOT optional)
  - `src/lib/ai/batch-generate.ts` line 42-43: `fetchEmbeddedPressReleases`의 select에 `images` 추가 → `select("id,source,title,content,link,images,published_at")`
  - `src/lib/ai/batch-generate.ts` line 98-101: `generateSingleArticle`의 select에 `images` 추가 → `select("id,source,title,content,link,images,published_at,status")`
  - `src/lib/ai/batch-generate.ts` line 60-70: `saveGeneratedArticle`에서 `images: []`를 `images: pressRelease.images`로 변경
  - `npx tsc --noEmit` 실행하여 타입 에러 없음 확인
  - `npm run build` 실행하여 빌드 성공 확인

  **Must NOT do**:
  - prompts.ts, ollama.ts, GeneratedArticle 타입 수정 금지
  - images를 optional(`images?:`)이나 nullable(`images: string[] | null`)로 만들기 금지
  - API routes 수정 금지
  - 파서 파일 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 4개 파일의 간단한 수정 (타입 필드 추가, select 문자열 수정, 변수 참조 변경)
  - **Skills**: []
    - 추가 스킬 불필요 — 순수 TypeScript 수정
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: UI 작업 없음
    - `playwright`: 브라우저 테스트 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3, Task 4
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/lib/ai/batch-generate.ts:40-53` — fetchEmbeddedPressReleases: 수정할 select 쿼리 위치
  - `src/lib/ai/batch-generate.ts:55-75` — saveGeneratedArticle: `images: []` 하드코딩 위치 (line 65)
  - `src/lib/ai/batch-generate.ts:91-136` — generateSingleArticle: 두번째 select 쿼리 위치 (line 100)

  **API/Type References**:
  - `src/types/article.ts:13-20` — PressReleaseForArticleGeneration 타입 정의
  - `src/types/article.ts:36-43` — GeneratedArticle 타입 (수정하면 안됨! 참고만)

  **External References**:
  - DB 스키마: `supabase/migrations/20260212000000_initial_schema.sql:4-18` — press_releases.images jsonb NOT NULL DEFAULT '[]'

  **WHY Each Reference Matters**:
  - `batch-generate.ts`가 이미지 passthrough의 핵심 파일 — select 2곳 + insert 1곳 수정
  - `article.ts`의 타입이 변경되면 이를 사용하는 `rag.ts`와 `ollama.ts`가 영향받지만, 둘 다 images 필드를 참조하지 않으므로 안전
  - DB 스키마 확인으로 images가 NOT NULL임을 증명 → optional 타입 불필요

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript 컴파일 성공
    Tool: Bash
    Preconditions: Task 1의 모든 코드 수정 완료
    Steps:
      1. `npx tsc --noEmit` 실행
      2. exit code 확인
    Expected Result: exit code 0, 에러 출력 없음
    Failure Indicators: exit code non-zero, "error TS" 메시지 출력
    Evidence: .sisyphus/evidence/task-1-tsc-check.txt

  Scenario: 빌드 성공
    Tool: Bash
    Preconditions: tsc 통과
    Steps:
      1. `npm run build` 실행
      2. exit code 확인
    Expected Result: exit code 0, "Build completed" 또는 유사 메시지
    Failure Indicators: exit code non-zero, 빌드 에러
    Evidence: .sisyphus/evidence/task-1-build.txt

  Scenario: 타입 변경이 기존 코드를 깨뜨리지 않음
    Tool: Bash
    Preconditions: article.ts 수정 완료
    Steps:
      1. `grep -n "PressReleaseForArticleGeneration" src/lib/ai/rag.ts src/lib/ai/ollama.ts src/lib/ai/batch-generate.ts`
      2. 각 파일에서 images 필드가 destructuring되거나 참조되지 않음을 확인
      3. `npx tsc --noEmit` 다시 실행
    Expected Result: images 필드를 참조하는 곳은 batch-generate.ts의 saveGeneratedArticle뿐
    Failure Indicators: rag.ts나 ollama.ts에서 타입 에러 발생
    Evidence: .sisyphus/evidence/task-1-type-safety.txt
  ```

  **Commit**: YES
  - Message: `fix(generate): pass through images from press_releases to articles`
  - Files: `src/types/article.ts`, `src/lib/ai/batch-generate.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 2. Create image audit script

  **What to do**:
  - `scripts/audit-images.ts` 생성 — press_releases 테이블의 이미지 현황을 source별로 조회
  - 쿼리: `SELECT source, COUNT(*) as total, COUNT(*) FILTER (WHERE images != '[]'::jsonb) as with_images FROM press_releases GROUP BY source ORDER BY source`
  - 결과를 테이블 형태로 출력 (source, total, with_images, percentage)
  - 실행하여 현재 이미지 현황 파악

  **Must NOT do**:
  - DB 데이터 수정 금지 (읽기만)
  - 파서 파일 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 스크립트 생성, DB 조회만
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1)
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `scripts/seed.ts` — Supabase client 설정 패턴 (`loadEnvConfig`, `createClient`, `requiredEnv`)
  - `scripts/crawl.ts` — CLI 스크립트 구조 패턴

  **API/Type References**:
  - DB 스키마: `supabase/migrations/20260212000000_initial_schema.sql:4-18` — press_releases 테이블 구조

  **WHY Each Reference Matters**:
  - `seed.ts` 패턴을 따르면 Supabase 클라이언트 설정을 일관되게 유지
  - DB 스키마로 정확한 컬럼명과 타입 확인

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 이미지 현황 조회 성공
    Tool: Bash
    Preconditions: .env.local에 SUPABASE_URL, SUPABASE_SERVICE_KEY 설정됨
    Steps:
      1. `npx tsx scripts/audit-images.ts` 실행
      2. 출력 확인
    Expected Result: source별 총 보도자료 수와 이미지 보유 수가 테이블로 출력됨
    Failure Indicators: 에러 발생, 빈 출력
    Evidence: .sisyphus/evidence/task-2-audit-result.txt

  Scenario: 이미지 없는 source가 있을 수 있음 (정상)
    Tool: Bash
    Preconditions: audit 실행 완료
    Steps:
      1. 출력에서 with_images가 0인 source 확인
      2. 해당 source의 정부 사이트가 실제로 이미지 없는 텍스트 전용 보도자료인지 판단
    Expected Result: 일부 source는 이미지가 0일 수 있음 — 이는 코드 버그가 아닌 원본 데이터 특성
    Failure Indicators: 모든 source의 이미지가 0인 경우 → 파서 이미지 추출 로직 문제 가능성
    Evidence: .sisyphus/evidence/task-2-audit-analysis.txt
  ```

  **Commit**: YES
  - Message: `chore(scripts): add image audit script for press_releases`
  - Files: `scripts/audit-images.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 3. Create and run backfill script

  **What to do**:
  - `scripts/backfill-images.ts` 생성 — 기존 articles의 images를 source press_releases에서 가져와 업데이트
  - 로직:
    1. articles 테이블에서 `images = '[]'::jsonb`인 레코드의 `id`와 `press_release_id` 조회
    2. 각 article에 대해 press_releases에서 `images` 조회
    3. press_releases.images가 비어있지 않은 경우에만 articles.images 업데이트
    4. 업데이트 건수 출력
  - `scripts/seed.ts` 패턴 따르기 (Supabase client, error handling, logging)
  - 실행하여 backfill 완료

  **Must NOT do**:
  - press_releases.images가 빈 배열인 경우 업데이트하지 않기 (no-op 방지)
  - articles 테이블의 images 외 다른 컬럼 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 스크립트 생성 + 실행
  - **Skills**: []
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (Sequential after Task 1)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1 (코드 수정이 먼저 배포되어야 race condition 방지)

  **References**:

  **Pattern References**:
  - `scripts/seed.ts` — Supabase client 설정 패턴
  - `src/lib/ai/batch-generate.ts:55-75` — saveGeneratedArticle의 insert 패턴

  **API/Type References**:
  - DB 스키마: `supabase/migrations/20260212000000_initial_schema.sql:20-32` — articles 테이블, press_release_id FK

  **WHY Each Reference Matters**:
  - `seed.ts` 패턴으로 일관된 스크립트 구조
  - articles.press_release_id FK로 원본 press_release 조인 가능

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Backfill 실행 성공
    Tool: Bash
    Preconditions: Task 1 코드 수정 완료, .env.local 설정됨
    Steps:
      1. `npx tsx scripts/backfill-images.ts` 실행
      2. 출력에서 업데이트 건수 확인
    Expected Result: "Updated N articles with images from press_releases" 형태 메시지 출력
    Failure Indicators: 에러 발생, 0건 업데이트 (press_releases에 이미지가 있는 경우)
    Evidence: .sisyphus/evidence/task-3-backfill-result.txt

  Scenario: No-op 안전성 — 이미지 없는 press_release는 건너뜀
    Tool: Bash
    Preconditions: backfill 실행 완료
    Steps:
      1. DB에서 press_releases.images가 '[]'인 press_release에 연결된 articles 확인
      2. 해당 articles의 images도 '[]'인지 확인
    Expected Result: press_releases에 이미지가 없으면 articles도 빈 배열 유지
    Failure Indicators: press_releases.images가 빈데 articles.images가 변경됨
    Evidence: .sisyphus/evidence/task-3-noop-check.txt
  ```

  **Commit**: YES
  - Message: `chore(scripts): add image backfill script for existing articles`
  - Files: `scripts/backfill-images.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 4. End-to-end verification

  **What to do**:
  - 전체 파이프라인 검증:
    1. press_releases에 이미지가 있는 레코드 확인 (audit 결과 활용)
    2. 새 article 생성 시 images가 포함되는지 확인 (가능하면 실제 생성, 아니면 코드 경로 검증)
    3. API 응답에 images 필드가 포함되는지 확인
    4. backfill 후 기존 articles에 images가 채워졌는지 확인
  - `npm run build` 최종 확인

  **Must NOT do**:
  - Ollama 실행 불필요 — passthrough 검증은 DB 레벨에서 가능
  - API 서버 실행 불필요 — 코드 검증 + DB 쿼리로 충분

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 여러 단계를 종합적으로 검증하는 통합 테스트
  - **Skills**: []
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Tasks 1, 2, 3)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **Pattern References**:
  - `scripts/verify-sites.ts` — 검증 스크립트 패턴
  - `src/app/api/v1/articles/route.ts:84-95` — API 응답에서 images 매핑 확인

  **API/Type References**:
  - `src/app/api/v1/articles/route.ts:45` — select에 images 포함 확인
  - `src/app/api/v1/articles/[id]/route.ts:43` — 단일 article에서도 images 포함 확인

  **WHY Each Reference Matters**:
  - API route 코드가 이미 images를 반환하므로 추가 수정 불필요함을 확인

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 빌드 최종 확인
    Tool: Bash
    Preconditions: 모든 코드 수정 완료
    Steps:
      1. `npm run build` 실행
    Expected Result: exit code 0
    Failure Indicators: 빌드 에러
    Evidence: .sisyphus/evidence/task-4-final-build.txt

  Scenario: DB에서 articles.images 확인
    Tool: Bash
    Preconditions: backfill 완료
    Steps:
      1. Supabase 쿼리: `SELECT a.id, a.title, a.images, pr.images as pr_images FROM articles a JOIN press_releases pr ON a.press_release_id = pr.id WHERE pr.images != '[]'::jsonb LIMIT 5`
      2. articles.images와 pr.images가 일치하는지 확인
    Expected Result: articles.images = press_releases.images (동일한 배열)
    Failure Indicators: articles.images가 여전히 빈 배열
    Evidence: .sisyphus/evidence/task-4-db-verify.txt

  Scenario: API 코드 경로 확인 (서버 실행 없이)
    Tool: Bash
    Preconditions: 코드 수정 완료
    Steps:
      1. `grep -n "images" src/app/api/v1/articles/route.ts src/app/api/v1/articles/\[id\]/route.ts`
      2. select와 response 모두에 images 포함 확인
    Expected Result: 각 파일에서 images가 select 및 response mapping에 포함됨
    Failure Indicators: images가 빠진 곳이 있음
    Evidence: .sisyphus/evidence/task-4-api-check.txt
  ```

  **Commit**: NO (검증만)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + `npm run build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify `images` field is `string[]` (not optional, not nullable).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Run audit script, verify output. Run backfill script, verify output. Query DB to confirm articles.images matches press_releases.images. Verify `npm run build` passes. Save evidence to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance: prompts.ts unchanged, ollama.ts unchanged, API routes unchanged, parser files unchanged. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Order | Message | Files |
|-------|---------|-------|
| 1 | `fix(generate): pass through images from press_releases to articles` | `src/types/article.ts`, `src/lib/ai/batch-generate.ts` |
| 2 | `chore(scripts): add image audit script for press_releases` | `scripts/audit-images.ts` |
| 3 | `chore(scripts): add image backfill script for existing articles` | `scripts/backfill-images.ts` |

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit           # Expected: exit 0
npm run build              # Expected: exit 0
npx tsx scripts/audit-images.ts    # Expected: source별 이미지 현황 출력
npx tsx scripts/backfill-images.ts # Expected: N articles updated
```

### Final Checklist
- [ ] PressReleaseForArticleGeneration에 `images: string[]` 추가됨
- [ ] fetchEmbeddedPressReleases select에 images 포함됨
- [ ] generateSingleArticle select에 images 포함됨
- [ ] saveGeneratedArticle에서 pressRelease.images 사용
- [ ] audit-images.ts 생성 및 실행 완료
- [ ] backfill-images.ts 생성 및 실행 완료
- [ ] prompts.ts 미수정
- [ ] ollama.ts 미수정
- [ ] API routes 미수정
- [ ] 파서 파일 미수정
- [ ] 빌드 통과
