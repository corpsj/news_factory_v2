# Admin Dashboard UI 완성도 개선 (UI Polish)

## TL;DR

> **Quick Summary**: 기존 Grok/SpaceX/Tesla 디자인을 유지하면서 모바일 반응형, 페이지네이션, loading/error 상태, 인터랙티브 피드백, 스페이싱 통일, 빈 상태를 개선하여 dashboard 완성도를 높임.
>
> **Deliverables**:
> - 모바일 반응형 sidebar + layout (hamburger toggle)
> - 테이블 overflow-x-auto + grid 반응형
> - articles/press-releases 페이지네이션 UI
> - loading.tsx + error.tsx 파일 추가
> - 전체 interactive 피드백 (focus-visible, active, cursor-pointer)
> - 스페이싱/패딩 통일
> - empty state 개선
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: T1 → T2 → T3 → T6 → T10 → T12 → F1-F4

---

## Context

### Original Request
"비효율적인 ui를 찾아서 개선해. 전체 ui의 완성도를 개선하는 작업이야. pc와 모바일 모두 ulw"

### Interview Summary
**Key Discussions**:
- 5개 explore agent 병렬 분석: responsive, typography, UX patterns, layout, Playwright visual QA
- 모든 16개 admin 파일 직접 코드 리뷰 완료
- Playwright PC/모바일 스크린샷 16장 촬영 → 6개 모바일 overflow 이슈 확인

**Research Findings**:
- Mobile Readiness: 3/10 — `ml-60` 고정, sidebar 숨김 없음
- Pagination: 서버 로직 있음, UI 컨트롤 0개
- loading/error.tsx: 0개 파일
- focus-visible: input 5개만, 나머지 0
- active states: 0개
- 스페이싱: mb-6/mb-8 혼용, p-4/p-5/p-6/p-8 혼용

### Metis Review
**Identified Gaps** (addressed):
- Mobile sidebar: CSS-only `hidden md:flex` + sidebar.tsx 내부 toggle state로 해결
- Pagination: URL-based `<a>` links로 Server Component 유지
- loading.tsx scope: shared admin + data-heavy 개별 파일
- Dashboard pipeline flex overflow: `flex-wrap` 추가
- Pagination filter 보존: `?category=X&page=N`
- layout.tsx는 Server Component 유지 필수

---

## Work Objectives

### Core Objective
기존 Grok/SpaceX/Tesla 다크 테마 미학을 유지하면서 admin dashboard의 모바일 대응, UX 완성도, 시각적 일관성을 프로덕션 수준으로 끌어올림.

### Concrete Deliverables
- 모바일 반응형 sidebar (hamburger toggle + overlay)
- layout.tsx `ml-0 md:ml-60` 반응형
- 테이블 3개 overflow-x-auto 추가
- monitoring summary `grid-cols-2 sm:grid-cols-4`
- dashboard pipeline `flex-wrap`
- articles + press-releases 페이지네이션 UI
- admin/loading.tsx (shared skeleton)
- admin/error.tsx (에러 바운더리)
- 전체 focus-visible + active + cursor-pointer
- 스페이싱 표준화 (mb-8 헤더, p-6 카드)
- empty state 텍스트 개선

### Definition of Done
- [ ] `npm run build` → exit 0
- [ ] Playwright 375x812: sidebar 숨김, 콘텐츠 전폭, horizontal overflow 0
- [ ] Playwright 1280x800: sidebar 보임, ml-60 offset
- [ ] `grep -rn "mb-6" src/app/admin/*/page.tsx` → 0 matches (모두 mb-8로 통일됨)
- [ ] Pagination: /admin/articles?page=2 → 정상 동작, filter 보존

### Must Have
- 모바일에서 sidebar hidden, hamburger toggle 작동
- 테이블 모바일에서 수평 스크롤 가능
- articles/press-releases 20건 초과 시 pagination UI 표시
- 모든 button에 focus-visible ring + cursor-pointer
- 페이지 헤더 mb-8 통일
- loading skeleton 표시 (admin 전역)

### Must NOT Have (Guardrails)
- layout.tsx에 `"use client"` 추가 금지 — Server Component 유지
- npm 의존성 추가 금지 (UI 라이브러리 없음)
- `<Button>`, `<Card>`, `<Table>` 같은 wrapper 컴포넌트 생성 금지 — inline Tailwind 유지
- API routes (`/api/*`) 수정 금지
- Supabase client 생성 패턴 변경 금지
- 색상 팔레트 변경 금지 (white/[0.06], #09090b 등 기존 Grok aesthetic 보존)
- font-size 변경 금지 (text-[28px], text-[11px] 등 의도적 커스텀 값)
- `transition-colors` 외 애니메이션 추가 금지 (slide-in, fade-in 등)
- Server Component를 Client Component로 변환 금지 (error.tsx 제외)
- 테스트 파일 작성 금지 (className 변경은 unit test 불필요)
- 다크 모드 토글 추가 금지

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None (className changes + new files)
- **Framework**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Build**: Use Bash — `npm run build`, `npx tsc --noEmit`
- **Pattern Check**: Use Bash (grep) — banned patterns, consistency checks

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — spacing + interactive feedback, MAX PARALLEL):
├── Task 1: Spacing standardization (mb-8, p-6 통일) [quick]
├── Task 2: Interactive feedback — focus-visible + active + cursor-pointer [quick]
├── Task 3: Empty state enhancement [quick]
└── Task 4: Dashboard pipeline flex-wrap [quick]

Wave 2 (Layout — mobile responsive, SEQUENTIAL):
├── Task 5: Mobile sidebar toggle + layout responsive [visual-engineering]
├── Task 6: Table overflow-x-auto + monitoring grid [quick]
└── Task 7: Client-actions + detail page mobile tweaks [quick]

Wave 3 (Features — new files + pagination):
├── Task 8: loading.tsx skeleton files [quick]
├── Task 9: error.tsx boundary file [quick]
└── Task 10: Pagination UI (articles + press-releases) [unspecified-high]

Wave 4 (Verification):
├── Task 11: Build + banned pattern verification [quick]
└── Task 12: Playwright mobile + desktop visual sweep [unspecified-high]

Wave FINAL (Review — 4 parallel):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Mobile + Desktop QA via Playwright (unspecified-high + playwright)
└── F4: Scope fidelity check (deep)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1 | — | T11 | 1 |
| T2 | — | T11 | 1 |
| T3 | — | T11 | 1 |
| T4 | — | T11 | 1 |
| T5 | — | T6, T7, T12 | 2 |
| T6 | T5 | T11, T12 | 2 |
| T7 | T5 | T11 | 2 |
| T8 | — | T11 | 3 |
| T9 | — | T11 | 3 |
| T10 | — | T11, T12 | 3 |
| T11 | T1-T10 | F1-F4 | 4 |
| T12 | T5, T6, T10 | F1-F4 | 4 |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks — T1-T4 → all `quick`
- **Wave 2**: 3 tasks — T5 → `visual-engineering`, T6-T7 → `quick`
- **Wave 3**: 3 tasks — T8-T9 → `quick`, T10 → `unspecified-high`
- **Wave 4**: 2 tasks — T11 → `quick`, T12 → `unspecified-high` + `playwright`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` + `playwright`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [ ] 1. Spacing Standardization — 페이지 헤더 mb-8, 스탯 카드 p-6, 버튼 py-2.5 통일

  **What to do**:
  - 모든 admin 페이지 헤더의 `mb-6`을 `mb-8`로 통일 (articles, press-releases, clients, settings 4개 파일)
  - stats 페이지의 summary 카드 `p-5`를 `p-6`으로 변경 (3개 카드)
  - crawl-form.tsx의 submit 버튼 `py-3`을 `py-2.5`로 변경 (settings/client-actions와 통일)
  - dashboard page.tsx의 stat 카드는 이미 `p-6` → 변경 불필요 확인

  **Must NOT do**:
  - font-size 변경 금지 (text-[28px], text-[11px] 등은 그대로)
  - 색상 변경 금지
  - p-8 (디테일 페이지 카드)은 변경하지 않음 — 디테일 페이지는 의도적으로 넓은 패딩
  - p-4 (서브카드, 내부 패널)은 변경하지 않음 — 계층 구분용

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: className 문자열 치환 작업, 로직 변경 없음
  - **Skills**: []
    - 없음: 순수 텍스트 교체, 특수 스킬 불필요
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 디자인 판단 불필요, 값이 이미 확정됨

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: T11 (build verify)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/app/admin/page.tsx:70` — `mb-8` 이미 적용된 정상 패턴 (dashboard 헤더)
  - `src/app/admin/page.tsx:83` — `p-6` 이미 적용된 정상 패턴 (dashboard stat 카드)
  - `src/app/admin/settings/settings-form.tsx:257` — `py-2.5` 정상 패턴 (설정 저장 버튼)

  **Files to modify** (exact lines):
  - `src/app/admin/articles/page.tsx:76` — `mb-6` → `mb-8`
  - `src/app/admin/press-releases/page.tsx:64` — `mb-6` → `mb-8`
  - `src/app/admin/clients/page.tsx:36` — `mb-6` → `mb-8`
  - `src/app/admin/settings/page.tsx:39` — `mb-6` → `mb-8`
  - `src/app/admin/stats/page.tsx:78` — `p-5` → `p-6` (3개 stat 카드 div)
  - `src/app/admin/stats/page.tsx:82` — `p-5` → `p-6`
  - `src/app/admin/stats/page.tsx:86` — `p-5` → `p-6`
  - `src/app/admin/crawl/crawl-form.tsx:254` — `py-3` → `py-2.5`

  **WHY Each Reference Matters**:
  - dashboard page.tsx는 이미 mb-8 + p-6를 사용 → 이것이 표준 패턴이므로 나머지를 맞춤
  - settings-form의 py-2.5는 프라이머리 버튼 표준 → crawl-form만 py-3으로 돌출

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 모든 페이지 헤더가 mb-8으로 통일됨
    Tool: Bash (grep)
    Preconditions: 모든 파일 수정 완료
    Steps:
      1. grep -rn "mb-6" src/app/admin/articles/page.tsx src/app/admin/press-releases/page.tsx src/app/admin/clients/page.tsx src/app/admin/settings/page.tsx
      2. 결과가 0 matches여야 함
      3. grep -rn "mb-8" src/app/admin/articles/page.tsx src/app/admin/press-releases/page.tsx src/app/admin/clients/page.tsx src/app/admin/settings/page.tsx
      4. 각 파일에 1개 이상 match
    Expected Result: mb-6 → 0 matches, mb-8 → 4+ matches
    Failure Indicators: mb-6이 1개 이상 남아있음
    Evidence: .sisyphus/evidence/task-1-spacing-grep.txt

  Scenario: stats 카드 패딩 p-6 통일
    Tool: Bash (grep)
    Preconditions: stats/page.tsx 수정 완료
    Steps:
      1. grep -n "p-5" src/app/admin/stats/page.tsx
      2. 결과가 0 matches여야 함
      3. grep -n "p-6" src/app/admin/stats/page.tsx
      4. 3개 이상 match (summary 카드 3개 + distribution 카드 1개)
    Expected Result: p-5 → 0 matches, p-6 → 4 matches
    Failure Indicators: p-5가 남아있음
    Evidence: .sisyphus/evidence/task-1-stats-padding-grep.txt

  Scenario: crawl 버튼 py-2.5 통일
    Tool: Bash (grep)
    Preconditions: crawl-form.tsx 수정 완료
    Steps:
      1. grep -n "py-3" src/app/admin/crawl/crawl-form.tsx
      2. 결과가 0 matches여야 함
    Expected Result: py-3 → 0 matches
    Failure Indicators: py-3이 남아있음
    Evidence: .sisyphus/evidence/task-1-crawl-button-grep.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `style(admin): standardize spacing — mb-8 headers, p-6 stat cards, py-2.5 buttons`
  - Files: `articles/page.tsx, press-releases/page.tsx, clients/page.tsx, settings/page.tsx, stats/page.tsx, crawl-form.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 2. Interactive Feedback — focus-visible + active + cursor-pointer 전체 적용

  **What to do**:
  - 모든 `<button>` 요소에 `focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]` 추가
  - 모든 `<button>` 요소에 `active:scale-[0.98]` 추가
  - 명시적 `cursor-pointer` 없는 클릭 가능 요소에 추가:
    - filter `<a>` 태그 (articles, press-releases 카테고리/상태 필터)
    - sidebar nav `<Link>` 태그들
    - monitoring site cards `<a>` 태그
    - 테이블 행 내 `<Link>` 태그 (articles, press-releases)
    - detail page back `<Link>` 태그
  - 단, `<a>` 태그와 `<Link>` 태그에는 `active:scale-[0.98]` 적용하지 않음 — 버튼만
  - `disabled:` 상태가 있는 버튼에는 `active:scale-[0.98]`이 `disabled:` 뒤에 오지 않도록 주의 → disabled 시 scale 안되어야 하므로 `disabled:active:scale-100` 또는 disabled 상태에서는 자동으로 무시됨 (HTML disabled는 active를 트리거하지 않으므로 OK)

  **Must NOT do**:
  - `transition-colors` 외 transition/animation 추가 금지 — `active:scale-[0.98]`는 transition 없이 즉시 적용 (Tailwind default)
  - hover 상태 변경 금지 (이미 완성됨)
  - 색상 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: className 문자열 추가 작업, 반복적 패턴 적용
  - **Skills**: []
    - 없음: AST-grep이나 LSP 불필요, 단순 문자열 추가
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 값이 확정됨, 디자인 판단 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: T11 (build verify)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/app/admin/crawl/crawl-form.tsx:139,162` — 기존 `cursor-pointer` 패턴 참고
  - `src/app/admin/crawl/crawl-form.tsx:204` — 기존 `focus:border-white/[0.15] focus:outline-none` 패턴 (input용, 우리는 button/link에 focus-visible:ring 사용)

  **Files to modify** (모든 button/interactive 요소 포함 파일):
  - `src/components/admin/sidebar.tsx:40` — nav Link에 `cursor-pointer` + `focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]`
  - `src/app/admin/articles/page.tsx:84,96` — filter `<a>` 태그에 `cursor-pointer` + focus-visible
  - `src/app/admin/articles/page.tsx:132` — table Link에 `cursor-pointer`
  - `src/app/admin/press-releases/page.tsx:76` — filter `<a>` 태그에 `cursor-pointer` + focus-visible
  - `src/app/admin/press-releases/page.tsx:114` — table Link에 `cursor-pointer`
  - `src/app/admin/clients/client-actions.tsx:70,90,97` — 3개 button에 focus-visible + active:scale-[0.98] + cursor-pointer
  - `src/app/admin/clients/client-actions.tsx:57` — 닫기 button에 focus-visible + active:scale-[0.98] + cursor-pointer
  - `src/app/admin/crawl/crawl-form.tsx:254` — submit button에 focus-visible + active:scale-[0.98]
  - `src/app/admin/settings/settings-form.tsx:159,162` — 전체 선택/해제 button에 focus-visible + active:scale-[0.98] + cursor-pointer
  - `src/app/admin/settings/settings-form.tsx:208,240,253` — hour/site/전체선택/저장 buttons에 focus-visible + active:scale-[0.98] + cursor-pointer
  - `src/app/admin/monitoring/page.tsx:264` — site card `<a>` 태그에 `cursor-pointer` + focus-visible
  - `src/app/admin/articles/[id]/page.tsx:85` — back Link에 `cursor-pointer` + focus-visible
  - `src/app/admin/articles/[id]/page.tsx:133,145` — 원본보기/보도자료 link에 `cursor-pointer`
  - `src/app/admin/press-releases/[id]/page.tsx:67` — back Link에 `cursor-pointer` + focus-visible
  - `src/app/admin/press-releases/[id]/page.tsx:124,169` — 원본보기/첨부파일 link에 `cursor-pointer`
  - `src/app/admin/stats/page.tsx` — interactive 요소 없음, 스킵

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 모든 button에 focus-visible ring 적용 확인
    Tool: Bash (grep)
    Preconditions: 모든 파일 수정 완료
    Steps:
      1. grep -rn "focus-visible:ring-2" src/app/admin/ src/components/admin/
      2. 최소 15개 이상 match (sidebar links + filter tags + buttons)
    Expected Result: 15+ matches across modified files
    Failure Indicators: 10 미만 matches
    Evidence: .sisyphus/evidence/task-2-focus-visible-grep.txt

  Scenario: 모든 button에 active:scale 적용 확인
    Tool: Bash (grep)
    Preconditions: 모든 파일 수정 완료
    Steps:
      1. grep -rn "active:scale" src/app/admin/ src/components/admin/
      2. 모든 <button> 요소에 적용됨 (최소 8개: client-actions 4개, crawl-form 1개, settings-form 4개)
    Expected Result: 8+ matches (buttons only, not links)
    Failure Indicators: 5 미만 matches
    Evidence: .sisyphus/evidence/task-2-active-scale-grep.txt

  Scenario: cursor-pointer 적용 확인
    Tool: Bash (grep)
    Preconditions: 모든 파일 수정 완료
    Steps:
      1. grep -rn "cursor-pointer" src/app/admin/ src/components/admin/ | wc -l
      2. 결과가 20 이상
    Expected Result: 20+ matches
    Failure Indicators: 15 미만 matches
    Evidence: .sisyphus/evidence/task-2-cursor-pointer-grep.txt

  Scenario: TypeScript 컴파일 에러 없음
    Tool: Bash
    Preconditions: 모든 파일 수정 완료
    Steps:
      1. npx tsc --noEmit
    Expected Result: exit code 0, no errors
    Failure Indicators: 컴파일 에러 출력
    Evidence: .sisyphus/evidence/task-2-tsc.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `style(admin): add focus-visible rings, active:scale, and cursor-pointer across all interactive elements`
  - Files: `sidebar.tsx, articles/page.tsx, press-releases/page.tsx, client-actions.tsx, crawl-form.tsx, settings-form.tsx, monitoring/page.tsx, articles/[id]/page.tsx, press-releases/[id]/page.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 3. Empty State Enhancement — 테이블 빈 상태 텍스트 개선

  **What to do**:
  - articles/page.tsx의 empty state: `데이터 없음` → `아직 생성된 기사가 없습니다` + 하위에 `크롤링을 먼저 실행해 주세요` 안내 텍스트
  - press-releases/page.tsx의 empty state: `데이터 없음` → `수집된 보도자료가 없습니다` + 하위에 `크롤링을 실행하면 자동으로 수집됩니다` 안내 텍스트
  - clients/page.tsx의 empty state: 이미 `등록된 클라이언트가 없습니다` → 추가 안내: `위 '새 클라이언트 등록' 버튼으로 등록해 주세요`
  - 유니코드 아이콘 추가: 각 empty state에 큰 아이콘 표시
    - articles: `▤` (기존 dashboard 아이콘 재사용)
    - press-releases: `◇` (기존 dashboard 아이콘 재사용)
    - clients: `⊡` (기존 dashboard 아이콘 재사용)
  - 구조: `<td colSpan={N}>` 안에 아이콘(text-4xl) + 주 메시지(text-sm) + 안내 메시지(text-xs, mt-1)

  **Must NOT do**:
  - CTA 버튼(링크) 추가 금지 — 안내 텍스트만
  - 색상 변경 금지 — 기존 text-white/20 유지
  - 새로운 컴포넌트 생성 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSX 텍스트 교체, 3개 파일 각 1곳씩
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 콘텐츠 변경만, 디자인 판단 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: T11 (build verify)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/app/admin/page.tsx:46-49` — STAT_CARDS의 icon 필드에서 유니코드 아이콘 패턴: `◇`, `▤`, `⊡`, `◫`
  - `src/app/admin/clients/page.tsx:56` — 기존 empty state 구조: `<td colSpan={3} className="px-5 py-16 text-center text-white/20">`

  **Files to modify**:
  - `src/app/admin/articles/page.tsx:118-123` — empty state `<tr>` 내부 교체
  - `src/app/admin/press-releases/page.tsx:98-103` — empty state `<tr>` 내부 교체
  - `src/app/admin/clients/page.tsx:54-59` — empty state `<tr>` 내부 교체

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: articles empty state 개선 확인
    Tool: Bash (grep)
    Preconditions: articles/page.tsx 수정 완료
    Steps:
      1. grep -n "아직 생성된 기사가 없습니다" src/app/admin/articles/page.tsx
      2. 1 match
      3. grep -n "크롤링을 먼저 실행해 주세요" src/app/admin/articles/page.tsx
      4. 1 match
    Expected Result: 두 텍스트 모두 존재
    Failure Indicators: 이전 "데이터 없음" 텍스트가 남아있음
    Evidence: .sisyphus/evidence/task-3-empty-state-grep.txt

  Scenario: 이전 "데이터 없음" 텍스트 제거 확인
    Tool: Bash (grep)
    Preconditions: 모든 파일 수정 완료
    Steps:
      1. grep -rn "데이터 없음" src/app/admin/articles/page.tsx src/app/admin/press-releases/page.tsx
      2. 0 matches
    Expected Result: "데이터 없음" 완전 제거
    Failure Indicators: 1개 이상 match
    Evidence: .sisyphus/evidence/task-3-old-text-grep.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `style(admin): improve empty state messages with icons and guidance text`
  - Files: `articles/page.tsx, press-releases/page.tsx, clients/page.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 4. Dashboard Pipeline flex-wrap — 모바일 overflow 방지

  **What to do**:
  - `src/app/admin/page.tsx:99`의 파이프라인 상태 `div`에 `flex-wrap` 추가
  - 현재: `<div className="mt-4 flex items-center gap-4">`
  - 변경: `<div className="mt-4 flex flex-wrap items-center gap-4">`
  - 이것만으로 모바일에서 파이프라인 4단계가 줄바꿈됨

  **Must NOT do**:
  - 파이프라인 아이콘/텍스트 변경 금지
  - 색상 변경 금지
  - gap 값 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 className에 1단어 추가
  - **Skills**: []
  - **Skills Evaluated but Omitted**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: T11 (build verify)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Files to modify**:
  - `src/app/admin/page.tsx:99` — `flex items-center` → `flex flex-wrap items-center`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: flex-wrap 추가 확인
    Tool: Bash (grep)
    Preconditions: page.tsx 수정 완료
    Steps:
      1. grep -n "flex-wrap" src/app/admin/page.tsx
      2. 1 match (파이프라인 div)
    Expected Result: flex-wrap 존재
    Failure Indicators: 0 matches
    Evidence: .sisyphus/evidence/task-4-flex-wrap-grep.txt

  Scenario: TypeScript 컴파일 에러 없음
    Tool: Bash
    Preconditions: 수정 완료
    Steps:
      1. npx tsc --noEmit
    Expected Result: exit code 0
    Failure Indicators: 에러 출력
    Evidence: .sisyphus/evidence/task-4-tsc.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `style(admin): add flex-wrap to dashboard pipeline for mobile`
  - Files: `page.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 5. Mobile Sidebar Toggle + Layout Responsive — 모바일 반응형 핵심

  **What to do**:
  
  **sidebar.tsx 변경 (핵심):**
  - `aside` 태그에 `hidden md:flex` 추가하여 모바일에서 숨김
  - 새로운 state: `const [open, setOpen] = useState(false)` 추가
  - 햄버거 버튼 추가: `fixed top-0 left-0 z-50 md:hidden` — `h-16` 높이에 맞춤, 3-line 햄버거 아이콘 (유니코드 `☰` 또는 div 3개)
  - 모바일 오버레이: `open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/60 md:hidden" />`
  - 모바일 사이드바: `open && <aside className="fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-white/[0.06] bg-[#09090b] md:hidden">` — 기존 sidebar와 동일 구조
  - nav Link 클릭 시 `setOpen(false)` 호출하여 사이드바 닫기
  - 데스크톱 `aside`는 `hidden md:flex`로 md 이상에서만 표시
  - **중요**: 기존 aside의 className에서 `flex`를 `hidden md:flex`로 변경

  **layout.tsx 변경:**
  - `<main className="ml-60 min-h-screen">` → `<main className="ml-0 md:ml-60 min-h-screen">`
  - `<div className="mx-auto max-w-6xl px-10 py-10">` → `<div className="mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-10">`
  - **layout.tsx에 `"use client"` 추가 금지** — Server Component 유지
  - layout.tsx는 import와 JSX만 변경, 로직 추가 없음

  **Must NOT do**:
  - layout.tsx에 `"use client"` 추가 금지
  - layout.tsx에 state/hook 추가 금지
  - CSS animation (slide-in 등) 추가 금지 — 즉시 표시/숨김
  - sidebar의 색상/폰트/아이콘 변경 금지
  - 새 컴포넌트 파일 생성 금지 — sidebar.tsx 내부에서 모두 처리

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 반응형 레이아웃 + 모바일 인터랙션은 프론트엔드 전문성 필요
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 모바일 반응형 레이아웃 + overlay 패턴에 대한 전문 판단 필요
  - **Skills Evaluated but Omitted**:
    - `playwright`: 구현 단계에서 불필요, T12에서 전체 QA 수행

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 2 시작점, T6/T7이 이 작업에 의존)
  - **Parallel Group**: Wave 2 (T6, T7은 T5 완료 후 병렬)
  - **Blocks**: T6, T7, T11, T12
  - **Blocked By**: None (Wave 1과 독립적이지만, Wave 2로 분류 — Wave 1과 동시 실행 가능)

  **References**:

  **Pattern References**:
  - `src/components/admin/sidebar.tsx:17-60` — 현재 전체 sidebar 구조 (이 파일을 수정)
  - `src/app/admin/layout.tsx:14-22` — 현재 layout 구조 (이 파일을 수정)

  **External References**:
  - `hidden md:flex` 패턴: Tailwind responsive visibility — 768px 기준

  **WHY Each Reference Matters**:
  - sidebar.tsx의 기존 aside 구조를 정확히 복제하여 모바일 버전 생성
  - layout.tsx의 ml-60을 조건부로 만들어 모바일에서 전폭 사용

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 데스크톱에서 sidebar 항상 보임
    Tool: Playwright
    Preconditions: dev server running at localhost:3000
    Steps:
      1. 브라우저를 1280x800으로 설정
      2. http://localhost:3000/admin 으로 이동
      3. aside 요소가 visible인지 확인 (selector: "aside")
      4. main 요소의 ml이 ml-60 (240px) offset인지 확인
      5. 스크린샷 촬영
    Expected Result: sidebar visible, main content offset by 240px
    Failure Indicators: sidebar 안보임, main이 0px에서 시작
    Evidence: .sisyphus/evidence/task-5-desktop-sidebar.png

  Scenario: 모바일에서 sidebar 숨김 + 햄버거 표시
    Tool: Playwright
    Preconditions: dev server running at localhost:3000
    Steps:
      1. 브라우저를 375x812로 설정
      2. http://localhost:3000/admin 으로 이동
      3. aside 요소가 hidden인지 확인
      4. 햄버거 버튼이 visible인지 확인 (md:hidden이므로 모바일에서만)
      5. main 요소의 ml이 0인지 확인
      6. 스크린샷 촬영
    Expected Result: sidebar hidden, hamburger visible, main full-width
    Failure Indicators: sidebar 보임, 햄버거 안보임, 콘텐츠 잘림
    Evidence: .sisyphus/evidence/task-5-mobile-sidebar-closed.png

  Scenario: 모바일 햄버거 클릭 시 sidebar 오버레이 표시
    Tool: Playwright
    Preconditions: 375x812 viewport
    Steps:
      1. http://localhost:3000/admin 으로 이동
      2. 햄버거 버튼 클릭
      3. overlay (bg-black/60) 표시 확인
      4. sidebar (w-60) 표시 확인
      5. nav items 모두 클릭 가능 확인
      6. 스크린샷 촬영
    Expected Result: overlay + sidebar visible, nav items accessible
    Failure Indicators: sidebar 안열림, overlay 없음
    Evidence: .sisyphus/evidence/task-5-mobile-sidebar-open.png

  Scenario: 모바일 nav 클릭 시 sidebar 닫힘
    Tool: Playwright
    Preconditions: 375x812, sidebar open
    Steps:
      1. 햄버거 클릭으로 sidebar 열기
      2. "기사" nav link 클릭
      3. sidebar가 닫히는지 확인 (aside hidden)
      4. /admin/articles로 이동 확인
    Expected Result: sidebar closes, navigates to /admin/articles
    Failure Indicators: sidebar 열려있음, 네비게이션 실패
    Evidence: .sisyphus/evidence/task-5-mobile-nav-close.png

  Scenario: layout.tsx에 "use client" 없음 확인
    Tool: Bash (grep)
    Steps:
      1. grep -n "use client" src/app/admin/layout.tsx
      2. 0 matches
    Expected Result: "use client" 없음 — Server Component 유지
    Failure Indicators: "use client" 발견
    Evidence: .sisyphus/evidence/task-5-layout-server-component.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(admin): add mobile responsive sidebar with hamburger toggle`
  - Files: `sidebar.tsx, layout.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 6. Table Overflow + Monitoring Grid — 모바일 테이블/그리드 반응형

  **What to do**:
  
  **테이블 overflow-x-auto 추가 (3개 파일):**
  - articles/page.tsx: 테이블 wrapper `<div className="overflow-hidden rounded-xl ...">` → `<div className="overflow-x-auto rounded-xl ...">`로 변경 (overflow-hidden을 overflow-x-auto로 교체)
  - press-releases/page.tsx: 동일하게 `overflow-hidden` → `overflow-x-auto`
  - clients/page.tsx: 동일하게 `overflow-hidden` → `overflow-x-auto`
  - 테이블에 `min-w-[640px]` 추가하여 모바일에서 테이블이 축소되지 않고 스크롤되도록

  **monitoring summary grid 반응형:**
  - `src/app/admin/monitoring/page.tsx:223` — `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`
  - 모바일에서 summary 카드 4개가 2x2 그리드로 표시

  **Must NOT do**:
  - 테이블 컬럼 숨기기 금지 — 모든 컬럼 유지, 스크롤로 해결
  - 테이블 구조(thead/tbody/tr/td) 변경 금지
  - 색상/폰트 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: className 교체/추가, 4개 파일 각 1-2곳
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 값이 확정됨

  **Parallelization**:
  - **Can Run In Parallel**: YES (T5 완료 후, T7과 병렬)
  - **Parallel Group**: Wave 2 (with Task 7, after Task 5)
  - **Blocks**: T11, T12
  - **Blocked By**: T5 (layout responsive 완료 후 테이블 overflow 확인 가능)

  **References**:

  **Pattern References**:
  - `src/app/admin/articles/page.tsx:107` — 현재 `overflow-hidden` 패턴
  - `src/app/admin/monitoring/page.tsx:223` — 현재 `grid-cols-4` 패턴
  - `src/app/admin/monitoring/page.tsx:254` — site cards grid는 이미 `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` → 정상, 변경 불필요

  **Files to modify**:
  - `src/app/admin/articles/page.tsx:107` — `overflow-hidden` → `overflow-x-auto` + table에 `min-w-[640px]`
  - `src/app/admin/press-releases/page.tsx:87` — `overflow-hidden` → `overflow-x-auto` + table에 `min-w-[640px]`
  - `src/app/admin/clients/page.tsx:44` — `overflow-hidden` → `overflow-x-auto` + table에 `min-w-[640px]`
  - `src/app/admin/monitoring/page.tsx:223` — `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 테이블 wrapper에 overflow-x-auto 적용 확인
    Tool: Bash (grep)
    Preconditions: 3개 파일 수정 완료
    Steps:
      1. grep -n "overflow-x-auto" src/app/admin/articles/page.tsx src/app/admin/press-releases/page.tsx src/app/admin/clients/page.tsx
      2. 3 matches (각 파일 1개)
      3. grep -n "overflow-hidden" src/app/admin/articles/page.tsx src/app/admin/press-releases/page.tsx src/app/admin/clients/page.tsx
      4. 0 matches (모두 교체됨)
    Expected Result: overflow-x-auto 3개, overflow-hidden 0개
    Failure Indicators: overflow-hidden 남아있음
    Evidence: .sisyphus/evidence/task-6-overflow-grep.txt

  Scenario: monitoring summary grid 반응형 확인
    Tool: Bash (grep)
    Preconditions: monitoring/page.tsx 수정 완료
    Steps:
      1. grep -n "grid-cols-2 sm:grid-cols-4" src/app/admin/monitoring/page.tsx
      2. 1 match
    Expected Result: responsive grid class 존재
    Failure Indicators: 여전히 grid-cols-4만 있음
    Evidence: .sisyphus/evidence/task-6-monitoring-grid-grep.txt

  Scenario: 모바일 375px에서 테이블 수평 스크롤 가능
    Tool: Playwright
    Preconditions: dev server, 375x812 viewport
    Steps:
      1. http://localhost:3000/admin/articles 이동
      2. 테이블 wrapper의 scrollWidth > clientWidth 확인
      3. 수평 스크롤 동작 확인
      4. 스크린샷 촬영
    Expected Result: 테이블이 잘리지 않고 스크롤 가능
    Failure Indicators: 테이블 잘림 또는 overflow hidden
    Evidence: .sisyphus/evidence/task-6-mobile-table-scroll.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(admin): add table overflow-x-auto and responsive monitoring grid`
  - Files: `articles/page.tsx, press-releases/page.tsx, clients/page.tsx, monitoring/page.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 7. Client-actions + Detail Page Mobile Tweaks — 나머지 모바일 미세 조정

  **What to do**:

  **client-actions.tsx 모바일 레이아웃:**
  - `src/app/admin/clients/client-actions.tsx:78` — form state의 `<div className="flex items-center gap-2">` → `<div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">`
  - 모바일에서 input + 등록 + 취소가 세로 배치

  **clients/page.tsx 헤더 모바일:**
  - `src/app/admin/clients/page.tsx:36` — `<div className="mb-8 flex items-center justify-between">` → `<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">`
  - 모바일에서 "클라이언트" 타이틀과 "새 클라이언트 등록" 버튼이 세로 배치

  **detail page back link 터치 타겟 확대:**
  - `src/app/admin/articles/[id]/page.tsx:84-89` — back link `<Link>` 에 `inline-block py-2` 추가 (터치 영역 확대)
  - `src/app/admin/press-releases/[id]/page.tsx:66-71` — 동일

  **detail page 메타 grid 모바일:**
  - `src/app/admin/articles/[id]/page.tsx:116` — `grid-cols-2 gap-4` 는 이미 모바일 OK (`sm:grid-cols-4`), 변경 불필요 확인
  - `src/app/admin/press-releases/[id]/page.tsx:89` — 동일, 변경 불필요

  **Must NOT do**:
  - detail page의 p-8 카드 패딩 변경 금지
  - 색상/폰트 변경 금지
  - 새 컴포넌트 생성 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: className 추가/변경, 4개 파일 각 1곳씩
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 값이 확정됨

  **Parallelization**:
  - **Can Run In Parallel**: YES (T5 완료 후, T6과 병렬)
  - **Parallel Group**: Wave 2 (with Task 6, after Task 5)
  - **Blocks**: T11
  - **Blocked By**: T5

  **References**:

  **Pattern References**:
  - `src/app/admin/clients/client-actions.tsx:78` — 현재 flex layout
  - `src/app/admin/clients/page.tsx:36` — 현재 헤더 layout
  - `src/app/admin/articles/[id]/page.tsx:84-89` — 현재 back link
  - `src/app/admin/press-releases/[id]/page.tsx:66-71` — 현재 back link

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: client-actions form이 모바일에서 세로 배치
    Tool: Bash (grep)
    Preconditions: client-actions.tsx 수정 완료
    Steps:
      1. grep -n "flex-col" src/app/admin/clients/client-actions.tsx
      2. 1+ match
      3. grep -n "sm:flex-row" src/app/admin/clients/client-actions.tsx
      4. 1+ match
    Expected Result: flex-col + sm:flex-row 패턴 존재
    Failure Indicators: flex-col 없음
    Evidence: .sisyphus/evidence/task-7-client-actions-grep.txt

  Scenario: clients 헤더 모바일 세로 배치
    Tool: Bash (grep)
    Preconditions: clients/page.tsx 수정 완료
    Steps:
      1. grep -n "flex-col" src/app/admin/clients/page.tsx
      2. 1+ match
    Expected Result: flex-col 존재
    Failure Indicators: flex-col 없음
    Evidence: .sisyphus/evidence/task-7-clients-header-grep.txt

  Scenario: detail page back link 터치 타겟 확대
    Tool: Bash (grep)
    Preconditions: detail pages 수정 완료
    Steps:
      1. grep -n "inline-block py-2" src/app/admin/articles/[id]/page.tsx
      2. 1 match
      3. grep -n "inline-block py-2" src/app/admin/press-releases/[id]/page.tsx
      4. 1 match
    Expected Result: 두 파일 모두 py-2 터치 타겟
    Failure Indicators: py-2 없음
    Evidence: .sisyphus/evidence/task-7-back-link-grep.txt

  Scenario: 모바일 375px에서 clients 페이지 레이아웃 정상
    Tool: Playwright
    Preconditions: dev server, 375x812 viewport
    Steps:
      1. http://localhost:3000/admin/clients 이동
      2. 헤더와 "새 클라이언트 등록" 버튼이 세로 배치인지 확인
      3. 수평 overflow 없는지 확인 (document.documentElement.scrollWidth <= window.innerWidth)
      4. 스크린샷 촬영
    Expected Result: 세로 배치, overflow 없음
    Failure Indicators: 가로 overflow, 요소 잘림
    Evidence: .sisyphus/evidence/task-7-mobile-clients.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(admin): mobile tweaks for client-actions and detail page back links`
  - Files: `client-actions.tsx, clients/page.tsx, articles/[id]/page.tsx, press-releases/[id]/page.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 8. Loading Skeleton — admin/loading.tsx 생성

  **What to do**:
  - `src/app/admin/loading.tsx` 신규 파일 생성
  - Server Component (기본값 — `"use client"` 불필요)
  - 기존 다크 테마에 맞는 pulse skeleton 구현:
    - 상단 헤더 영역: `h-8 w-48` rounded bar + `h-4 w-32 mt-2` bar (text-[28px] + subtitle 모방)
    - 중간 그리드: `grid gap-5 sm:grid-cols-2 xl:grid-cols-4` — 4개 카드 skeleton (`h-28 rounded-xl`)
    - 하단 테이블 영역: `h-12 rounded-xl` (테이블 헤더) + 5개 `h-16 rounded-lg` (행)
  - 모든 skeleton bar: `animate-pulse bg-white/[0.06] rounded-lg`
  - 전체 wrapper: `<div>` (layout.tsx가 이미 padding 제공)
  - Next.js App Router는 loading.tsx를 해당 route segment의 `<Suspense fallback>` 으로 자동 사용

  **Must NOT do**:
  - `"use client"` 추가 금지 — Server Component로 유지
  - Shimmer 효과, CSS keyframe, 복잡한 애니메이션 금지 — `animate-pulse`만 사용
  - 기존 Grok 색상 외 색상 사용 금지
  - 개별 페이지별 loading.tsx 생성 금지 — 공유 1개만

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 신규 파일 생성, 정적 JSX
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: skeleton 디자인이 확정됨

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10)
  - **Blocks**: T11
  - **Blocked By**: None (Wave 1/2와 독립, 하지만 Wave 3로 분류)

  **References**:

  **Pattern References**:
  - `src/app/admin/page.tsx:79` — `grid gap-5 sm:grid-cols-2 xl:grid-cols-4` — dashboard 카드 그리드 패턴 (skeleton에서 동일 구조 모방)
  - `src/app/admin/page.tsx:83` — `rounded-xl border border-white/[0.06] bg-white/[0.03]` — 카드 스타일 (skeleton에서 `bg-white/[0.06]`로 사용)

  **External References**:
  - Next.js App Router loading.tsx: 자동 Suspense boundary로 작동

  **WHY Each Reference Matters**:
  - dashboard의 grid 구조를 모방하여 CLS(Content Layout Shift)를 최소화
  - skeleton의 배경색은 `bg-white/[0.06]`으로 기존 border 색과 동일 수준

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: loading.tsx 파일 존재 + 올바른 구조
    Tool: Bash (grep)
    Preconditions: 파일 생성 완료
    Steps:
      1. test -f src/app/admin/loading.tsx && echo "EXISTS" || echo "MISSING"
      2. grep -n "animate-pulse" src/app/admin/loading.tsx
      3. 3+ matches (헤더, 카드, 테이블 각각)
      4. grep -n "use client" src/app/admin/loading.tsx
      5. 0 matches (Server Component)
    Expected Result: 파일 존재, animate-pulse 3+, use client 0
    Failure Indicators: 파일 없음, animate-pulse 부족
    Evidence: .sisyphus/evidence/task-8-loading-grep.txt

  Scenario: build 시 loading.tsx 정상 컴파일
    Tool: Bash
    Steps:
      1. npx tsc --noEmit
    Expected Result: exit code 0
    Failure Indicators: 타입 에러
    Evidence: .sisyphus/evidence/task-8-tsc.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(admin): add loading.tsx skeleton for admin routes`
  - Files: `src/app/admin/loading.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 9. Error Boundary — admin/error.tsx 생성

  **What to do**:
  - `src/app/admin/error.tsx` 신규 파일 생성
  - **`"use client"` 필수** — Next.js error.tsx는 반드시 Client Component
  - Props: `{ error: Error & { digest?: string }; reset: () => void }`
  - UI 구조:
    - 중앙 정렬 container: `flex min-h-[60vh] flex-col items-center justify-center`
    - 에러 아이콘: 유니코드 `⚠` (text-4xl text-red-400)
    - 제목: `문제가 발생했습니다` (text-lg font-medium text-white)
    - 에러 메시지: `error.message` (text-sm text-white/40, 최대 2줄 truncate)
    - 두 개 버튼:
      1. `다시 시도` — `onClick={() => reset()}`, primary style: `rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] active:scale-[0.98] cursor-pointer`
      2. `대시보드로 돌아가기` — `<a href="/admin">`, secondary style: `rounded-lg border border-white/[0.08] px-5 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white cursor-pointer`
    - 버튼 wrapper: `mt-6 flex gap-3`

  **Must NOT do**:
  - console.error 외 로깅 추가 금지
  - 에러 리포팅 서비스 연동 금지
  - 복잡한 에러 분류 금지 (단순 메시지 표시)
  - 색상 팔레트 벗어나는 색상 사용 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 신규 파일 생성, 정적 JSX + reset callback
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: UI 구조가 완전히 확정됨

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 10)
  - **Blocks**: T11
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/app/admin/clients/client-actions.tsx:70` — primary button style 패턴: `rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90`
  - `src/app/admin/clients/client-actions.tsx:57` — secondary button style 패턴: `rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white`

  **External References**:
  - Next.js App Router error.tsx: 반드시 "use client", `error` + `reset` props

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: error.tsx 파일 존재 + "use client" + reset 함수
    Tool: Bash (grep)
    Preconditions: 파일 생성 완료
    Steps:
      1. test -f src/app/admin/error.tsx && echo "EXISTS" || echo "MISSING"
      2. head -1 src/app/admin/error.tsx | grep "use client"
      3. 1 match
      4. grep -n "reset()" src/app/admin/error.tsx
      5. 1+ match
      6. grep -n "다시 시도" src/app/admin/error.tsx
      7. 1 match
      8. grep -n "대시보드로 돌아가기" src/app/admin/error.tsx
      9. 1 match
    Expected Result: 파일 존재, use client, reset, 두 버튼 텍스트
    Failure Indicators: 파일 없음, use client 없음
    Evidence: .sisyphus/evidence/task-9-error-grep.txt

  Scenario: TypeScript 컴파일 에러 없음
    Tool: Bash
    Steps:
      1. npx tsc --noEmit
    Expected Result: exit code 0
    Failure Indicators: 타입 에러
    Evidence: .sisyphus/evidence/task-9-tsc.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(admin): add error.tsx boundary with retry and dashboard link`
  - Files: `src/app/admin/error.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 10. Pagination UI — articles + press-releases 페이지네이션 컨트롤

  **What to do**:

  **articles/page.tsx에 pagination UI 추가:**
  - 테이블 `</div>` 닫는 태그 아래에 pagination JSX 추가
  - 서버에서 이미 `page` param + `total` + `limit=20` 로직 있음 → UI 컨트롤만 추가
  - `totalPages = Math.ceil(total / 20)`
  - `currentPage = Number(params.page ?? "1")`
  - pagination 표시 조건: `totalPages > 1`
  - UI 구조:
    ```
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-white/30">{total}건 중 {offset+1}-{Math.min(offset+limit, total)}</p>
      <div className="flex items-center gap-1">
        {currentPage > 1 && <a href={buildPageUrl(currentPage - 1)} className="...">이전</a>}
        {pageNumbers.map(n => <a href={buildPageUrl(n)} className="...">n</a>)}
        {currentPage < totalPages && <a href={buildPageUrl(currentPage + 1)} className="...">다음</a>}
      </div>
    </div>
    ```
  - `buildPageUrl` 함수: 기존 filter params 보존 + page 변경
    - articles: `?category=${currentCategory}&page=${n}` (category 없으면 `?page=${n}`)
    - press-releases: `?status=${currentStatus}&page=${n}` (status 없으면 `?page=${n}`)
  - 페이지 번호 생략: totalPages > 7이면 `1 ... (current-1) current (current+1) ... totalPages` 패턴
  - 스타일:
    - 현재 페이지: `rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs text-white`
    - 다른 페이지: `rounded-lg px-3 py-1.5 text-xs text-white/30 hover:bg-white/[0.04] hover:text-white/60 transition-colors cursor-pointer`
    - 이전/다음: 동일 스타일 + `focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]`
    - `...`: `px-2 text-xs text-white/20` (클릭 불가)

  **press-releases/page.tsx에 동일한 pagination UI 추가:**
  - 구조 동일, filter param이 `status` (category 대신)
  - `buildPageUrl`: `?status=${currentStatus}&page=${n}`

  **Must NOT do**:
  - Server Component를 Client Component로 변환 금지 — URL-based `<a>` navigation 사용
  - `useRouter`, `useSearchParams` 등 클라이언트 훅 사용 금지
  - limit (20) 변경 금지
  - 기존 데이터 fetching 로직 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: JSX 추가량이 많고, filter param 보존 로직 + 페이지 번호 생략 알고리즘이 필요
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 로직이 핵심이지 디자인이 아님

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9)
  - **Blocks**: T11, T12
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/app/admin/articles/page.tsx:44-62` — 기존 page/offset/limit/category 로직 (이 로직 위에 UI 추가)
  - `src/app/admin/articles/page.tsx:81-104` — filter `<a>` 태그 스타일 (pagination도 동일 스타일 사용)
  - `src/app/admin/press-releases/page.tsx:32-50` — 기존 page/offset/limit/status 로직
  - `src/app/admin/press-releases/page.tsx:71-84` — filter `<a>` 태그 스타일

  **API/Type References**:
  - `src/app/admin/articles/page.tsx:62` — `total` 반환 (pagination에서 totalPages 계산용)
  - `src/app/admin/press-releases/page.tsx:50` — `total` 반환

  **WHY Each Reference Matters**:
  - 기존 filter `<a>` 스타일을 그대로 재사용하여 시각적 일관성 유지
  - 기존 page/offset 로직은 변경하지 않고, UI 컨트롤만 추가
  - filter param 보존이 핵심 — `?category=economy&page=2` 형태

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: articles 페이지에 pagination UI 존재
    Tool: Bash (grep)
    Preconditions: articles/page.tsx 수정 완료
    Steps:
      1. grep -n "이전" src/app/admin/articles/page.tsx
      2. 1 match (이전 버튼)
      3. grep -n "다음" src/app/admin/articles/page.tsx
      4. 1 match (다음 버튼)
      5. grep -n "totalPages" src/app/admin/articles/page.tsx
      6. 1+ matches
    Expected Result: 이전/다음 버튼 + totalPages 계산 존재
    Failure Indicators: 이전/다음 텍스트 없음
    Evidence: .sisyphus/evidence/task-10-articles-pagination-grep.txt

  Scenario: press-releases 페이지에 pagination UI 존재
    Tool: Bash (grep)
    Preconditions: press-releases/page.tsx 수정 완료
    Steps:
      1. grep -n "이전" src/app/admin/press-releases/page.tsx
      2. 1 match
      3. grep -n "다음" src/app/admin/press-releases/page.tsx
      4. 1 match
    Expected Result: 이전/다음 버튼 존재
    Failure Indicators: 텍스트 없음
    Evidence: .sisyphus/evidence/task-10-pr-pagination-grep.txt

  Scenario: filter param 보존 확인 (articles)
    Tool: Playwright
    Preconditions: dev server, 데이터 20건 이상 필요 (없으면 grep으로 URL 패턴 확인)
    Steps:
      1. http://localhost:3000/admin/articles?category=economy 이동
      2. page 2 링크가 있으면 href에 "category=economy" 포함 확인
      3. grep -n "category=" src/app/admin/articles/page.tsx | grep "page=" → URL에 둘 다 포함
    Expected Result: pagination link에 category param 보존
    Failure Indicators: page URL에 category 누락
    Evidence: .sisyphus/evidence/task-10-filter-preserve.txt

  Scenario: totalPages <= 1일 때 pagination 숨김
    Tool: Bash (grep)
    Preconditions: 수정 완료
    Steps:
      1. grep -n "totalPages > 1" src/app/admin/articles/page.tsx
      2. 1 match (조건부 렌더링)
    Expected Result: pagination은 2페이지 이상일 때만 표시
    Failure Indicators: 조건 없이 항상 표시
    Evidence: .sisyphus/evidence/task-10-pagination-condition.txt

  Scenario: TypeScript 컴파일 에러 없음
    Tool: Bash
    Steps:
      1. npx tsc --noEmit
    Expected Result: exit code 0
    Failure Indicators: 에러 출력
    Evidence: .sisyphus/evidence/task-10-tsc.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(admin): add URL-based pagination UI with filter param preservation`
  - Files: `articles/page.tsx, press-releases/page.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 11. Build + Banned Pattern Verification — 전체 빌드 + 금지 패턴 검증

  **What to do**:
  - `npm run build` 실행 → exit code 0 확인
  - `npx tsc --noEmit` 실행 → exit code 0 확인
  - 금지 패턴 grep 검증:
    1. `grep -rn '"use client"' src/app/admin/layout.tsx` → 0 matches
    2. `grep -rn "mb-6" src/app/admin/articles/page.tsx src/app/admin/press-releases/page.tsx src/app/admin/clients/page.tsx src/app/admin/settings/page.tsx` → 0 matches
    3. `grep -rn "overflow-hidden" src/app/admin/articles/page.tsx src/app/admin/press-releases/page.tsx src/app/admin/clients/page.tsx` → 0 matches (테이블 wrapper)
    4. `grep -rn "p-5" src/app/admin/stats/page.tsx` → 0 matches
    5. `grep -rn "py-3" src/app/admin/crawl/crawl-form.tsx` → 0 matches
    6. `grep -rn "cursor-pointer" src/app/admin/ src/components/admin/ | wc -l` → 20 이상
    7. `grep -rn "focus-visible:ring" src/app/admin/ src/components/admin/ | wc -l` → 15 이상
    8. `grep -rn "active:scale" src/app/admin/ src/components/admin/ | wc -l` → 8 이상
  - 모든 검증 결과를 evidence 파일에 저장
  - 실패 시 해당 태스크로 돌아가서 수정 지시

  **Must NOT do**:
  - 코드 수정 금지 — 검증만 수행
  - 실패 시 직접 수정하지 않고 리포트만

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: bash 명령어 실행 + 결과 기록
  - **Skills**: []
  - **Skills Evaluated but Omitted**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: NO (모든 이전 태스크 완료 후)
  - **Parallel Group**: Wave 4 (with Task 12, but T11 first)
  - **Blocks**: F1-F4
  - **Blocked By**: T1-T10 (모두)

  **References**:

  **Files to verify**: 모든 admin 파일 (T1-T10에서 수정된 파일 전체)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: npm run build 성공
    Tool: Bash
    Steps:
      1. npm run build
    Expected Result: exit code 0, "Compiled successfully" 또는 유사 성공 메시지
    Failure Indicators: 빌드 에러, exit code != 0
    Evidence: .sisyphus/evidence/task-11-build.txt

  Scenario: 모든 금지 패턴 0 matches
    Tool: Bash (grep)
    Steps:
      1. 위 8개 grep 명령어 순서대로 실행
      2. 각 결과를 evidence에 기록
    Expected Result: 금지 패턴 모두 0 matches, 필수 패턴 threshold 충족
    Failure Indicators: 금지 패턴 1개 이상 발견
    Evidence: .sisyphus/evidence/task-11-banned-patterns.txt
  ```

  **Commit**: NO (검증만)

- [ ] 12. Playwright Visual Sweep — 모바일 + 데스크톱 전체 스크린샷 QA

  **What to do**:
  - 9개 admin 라우트를 375x812 (모바일) + 1280x800 (데스크톱)에서 스크린샷 촬영
  - 라우트 목록:
    1. `/admin` (대시보드)
    2. `/admin/articles` (기사 목록)
    3. `/admin/press-releases` (보도자료 목록)
    4. `/admin/clients` (클라이언트)
    5. `/admin/stats` (통계)
    6. `/admin/monitoring` (모니터링)
    7. `/admin/crawl` (크롤링)
    8. `/admin/settings` (설정)
    9. `/admin/articles/{첫번째 ID}` 또는 `/admin/press-releases/{첫번째 ID}` (디테일 페이지 1개)
  - 각 라우트에서 검증:
    - **모바일**: sidebar 숨겨져 있는지, 수평 overflow 없는지 (`document.documentElement.scrollWidth <= window.innerWidth`), 콘텐츠 전폭 사용
    - **데스크톱**: sidebar 보이는지, ml-60 offset, 정상 렌더링
  - 모바일 sidebar 토글 테스트:
    - 햄버거 클릭 → sidebar 열림 확인 → nav 클릭 → sidebar 닫힘 확인
  - pagination 테스트 (데이터 있을 경우):
    - articles/press-releases에서 page 2 링크 클릭 → URL에 page=2 확인
  - 모든 스크린샷을 `.sisyphus/evidence/task-12/` 에 저장
  - 검증 결과 요약 리포트 생성

  **Must NOT do**:
  - 코드 수정 금지 — 스크린샷 + 검증만
  - 네트워크 요청 차단/모킹 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Playwright 자동화 + 복잡한 검증 로직
  - **Skills**: [`playwright`]
    - `playwright`: 브라우저 자동화, 스크린샷, DOM assertion 필수
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 검증만 수행, 구현 아님

  **Parallelization**:
  - **Can Run In Parallel**: YES (T11과 병렬 가능 — T11은 build, T12는 visual)
  - **Parallel Group**: Wave 4 (with Task 11)
  - **Blocks**: F1-F4
  - **Blocked By**: T5, T6, T10 (모바일 sidebar + 테이블 overflow + pagination 필요)

  **References**:

  **Pattern References**:
  - `.sisyphus/evidence/ui-audit/` — Phase 7 research에서 촬영한 기존 스크린샷 (before/after 비교 가능)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 모바일 9개 라우트 수평 overflow 없음
    Tool: Playwright
    Preconditions: dev server, 375x812 viewport
    Steps:
      1. 각 9개 라우트 순회
      2. document.documentElement.scrollWidth <= window.innerWidth 확인
      3. 실패 시 해당 라우트 + scrollWidth 값 기록
      4. 각 라우트 스크린샷 촬영
    Expected Result: 9/9 라우트 overflow 없음
    Failure Indicators: 1개 이상 라우트에서 scrollWidth > innerWidth
    Evidence: .sisyphus/evidence/task-12/mobile-{route-name}.png

  Scenario: 데스크톱 sidebar 항상 보임
    Tool: Playwright
    Preconditions: dev server, 1280x800 viewport
    Steps:
      1. 각 9개 라우트 순회
      2. aside 요소 visible 확인
      3. 각 라우트 스크린샷 촬영
    Expected Result: 9/9 라우트에서 sidebar visible
    Failure Indicators: sidebar hidden
    Evidence: .sisyphus/evidence/task-12/desktop-{route-name}.png

  Scenario: 모바일 sidebar 토글 동작
    Tool: Playwright
    Preconditions: 375x812 viewport
    Steps:
      1. /admin 이동
      2. 햄버거 버튼 클릭
      3. sidebar 표시 확인
      4. "기사" nav link 클릭
      5. sidebar 닫힘 확인
      6. URL /admin/articles 확인
    Expected Result: toggle 정상 작동, 네비게이션 정상
    Failure Indicators: sidebar 안열림, 안닫힘, 네비게이션 실패
    Evidence: .sisyphus/evidence/task-12/mobile-sidebar-toggle.png

  Scenario: pagination UI 존재 확인
    Tool: Playwright
    Preconditions: articles 또는 press-releases에 데이터 존재
    Steps:
      1. /admin/articles 이동 (1280x800)
      2. "이전" 또는 "다음" 텍스트가 DOM에 존재하는지 확인 (데이터 20건 이상 시)
      3. 스크린샷 촬영
    Expected Result: 데이터 20건 이상 시 pagination UI 보임
    Failure Indicators: 20건 이상인데 pagination 없음
    Evidence: .sisyphus/evidence/task-12/desktop-articles-pagination.png
  ```

  **Commit**: NO (검증만)

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + `npm run build`. Review all changed files for: leftover old patterns, inconsistent tokens, unused imports. Grep for banned patterns.
  Output: `Build [PASS/FAIL] | Banned Patterns [N matches] | VERDICT`

- [ ] F3. **Mobile + Desktop QA via Playwright** — `unspecified-high` + `playwright` skill
  Navigate to all 9 admin routes at 375x812 AND 1280x800. Verify: sidebar hidden on mobile, visible on desktop. Verify: no horizontal overflow on mobile. Verify: pagination works. Take screenshots. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Routes [N/9 pass] | Mobile [N/9 no-overflow] | Pagination [PASS/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read spec, read actual diff. Verify 1:1 compliance. Check "Must NOT do" — no API changes, no new dependencies, no component abstractions.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `style(admin): standardize spacing, interactive feedback, and empty states`
  - Files: all 16 admin files (spacing + focus/active/cursor)
  - Pre-commit: `npx tsc --noEmit`
- **Wave 2**: `feat(admin): add mobile responsive sidebar and table overflow`
  - Files: layout.tsx, sidebar.tsx, articles/page, press-releases/page, clients/page, monitoring/page, client-actions, detail pages
  - Pre-commit: `npx tsc --noEmit`
- **Wave 3**: `feat(admin): add loading/error states and pagination UI`
  - Files: loading.tsx, error.tsx, articles/page, press-releases/page
  - Pre-commit: `npm run build`
- **Wave 4**: `chore(admin): verify build and visual QA pass`
  - Pre-commit: `npm run build`

---

## Success Criteria

### Verification Commands
```bash
npm run build                                          # Expected: exit 0
npx tsc --noEmit                                       # Expected: exit 0
grep -rn "mb-6" src/app/admin/*/page.tsx               # Expected: 0 matches (all mb-8)
grep -rn "cursor-pointer" src/app/admin/ src/components/admin/ | wc -l  # Expected: > 20
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Mobile sidebar toggle works (375px)
- [ ] Desktop sidebar visible (1280px)
- [ ] Pagination renders on articles + press-releases
- [ ] Loading skeleton displays on navigation
- [ ] Error boundary catches and displays errors
- [ ] All buttons have focus-visible + cursor-pointer
- [ ] No horizontal overflow on any mobile page
