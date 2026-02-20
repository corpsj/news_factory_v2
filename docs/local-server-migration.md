# 로컬 서버 전환 가이드

## 현재 구조

```
Admin UI (Vercel) → GitHub Actions 트리거 → 파이프라인 실행 → Supabase
                                                                 ↑
Admin UI (Vercel) ← Supabase crawl_logs 폴링 ────────────────────┘
```

- 크롤링: GitHub Actions (시간 제한 없음)
- 임베딩: 스킵 (Ollama 없음)
- 기사 생성: OpenRouter API

## 로컬 서버 전환 시

```
Admin UI (Vercel) → 로컬 서버 API 호출 → 파이프라인 실행 → Supabase
                                          + Ollama 임베딩      ↑
Admin UI (Vercel) ← Supabase crawl_logs 폴링 ─────────────────┘
```

- 크롤링: 로컬 서버 (시간 제한 없음)
- 임베딩: Ollama (로컬에서 자동 동작)
- 기사 생성: Ollama 또는 OpenRouter

바뀌는 건 트리거 대상뿐. Supabase 폴링 로직은 동일.

---

## 방법 1: 로컬 cron (코드 변경 없음)

가장 간단. Admin UI에서 수동 트리거 불가.

```bash
# crontab -e
0 6,12,18 * * * cd /path/to/news-factory_v2 && npx tsx scripts/run-pipeline.ts
```

`.env.local`에 Supabase, Ollama, OpenRouter 환경변수 필요:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
OLLAMA_API_URL=http://localhost:11434
OPENROUTER_API_KEY=xxx        # 선택: OpenRouter 사용 시
OPENROUTER_MODEL=xxx          # 선택: OpenRouter 사용 시
```

파이프라인 옵션:

```bash
npx tsx scripts/run-pipeline.ts \
  --sites gwangju-city,donggu \
  --max-pages 5 \
  --limit 10 \
  --concurrency 15 \
  --date-from 2026-02-01 \
  --date-to 2026-02-20
```

---

## 방법 2: 로컬 API 서버 + 터널 (추천)

Admin UI에서 수동 트리거 가능. 코드 변경 최소.

### 구조

```
로컬 서버 (localhost:4000) → Cloudflare Tunnel → 공개 URL
                                                    ↑
Admin UI (trigger-crawl) ───────────────────────────┘
```

### 로컬 서버 구현 (Express 예시)

```typescript
// server.ts
import express from "express";
import { loadEnvConfig } from "@next/env";
import { executePipeline } from "./src/lib/pipeline/orchestrator";

loadEnvConfig(process.cwd());

const app = express();
app.use(express.json());

app.post("/run", async (req, res) => {
  const { siteIds, maxPages, limitPerSite, dateRange } = req.body;

  res.json({ started: true });

  // 비동기 실행 (응답 후 백그라운드)
  executePipeline({
    siteIds,
    maxPages: maxPages ?? 5,
    limitPerSite: limitPerSite ?? 5,
    dateRange,
    siteConcurrency: 15,
    verbose: true,
  }).catch(console.error);
});

app.listen(4000, () => console.log("Pipeline server on :4000"));
```

### Cloudflare Tunnel 설정

```bash
# 설치
brew install cloudflared

# 터널 생성
cloudflared tunnel login
cloudflared tunnel create pipeline
cloudflared tunnel route dns pipeline pipeline.your-domain.com

# 실행
cloudflared tunnel run --url http://localhost:4000 pipeline
```

### Vercel 코드 변경

`src/app/api/admin/trigger-crawl/route.ts` 수정:

```typescript
// GitHub API 호출 대신:
const serverUrl = process.env.PIPELINE_SERVER_URL; // https://pipeline.your-domain.com
const res = await fetch(`${serverUrl}/run`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ siteIds, maxPages, limitPerSite, dateRange }),
});
```

### Vercel 환경변수

| 변수 | 값 |
|---|---|
| `PIPELINE_SERVER_URL` | `https://pipeline.your-domain.com` |

`GITHUB_TOKEN`은 더 이상 불필요.

---

## 변경 범위 정리

| 파일 | 변경 내용 |
|---|---|
| `trigger-crawl/route.ts` | GitHub API → 로컬 서버 URL fetch |
| Vercel 환경변수 | `PIPELINE_SERVER_URL` 추가 |
| 로컬 서버 | Express 엔드포인트 1개 (위 예시) |

변경 없는 파일:
- `pipeline-provider.tsx` (Supabase 폴링 그대로)
- `pipeline-runs/route.ts` (crawl_logs 조회 그대로)
- `orchestrator.ts` (파이프라인 로직 그대로)
- `crawl-form.tsx` (UI 그대로)
