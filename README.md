# News Factory v2

광주·전남 27개 지자체 보도자료를 수집하고, 로컬 AI(Ollama)로 기사를 생성하여 미디어사에 배포하는 SaaS 시스템.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router, Turbopack)
- **DB**: Supabase (PostgreSQL + pgvector)
- **AI**: Ollama — Exaone 4.0 (기사 생성), qwen3-embedding (벡터 임베딩, 1024차원)
- **인증**: bcrypt 해시 API 키 (Bearer token)

## 설치

```bash
git clone <repo-url>
cd news-factory_v2
npm install
```

## 환경 설정

`.env.example`을 `.env.local`로 복사 후 실제 값 입력:

```bash
cp .env.example .env.local
```

### Supabase 설정

1. Supabase 프로젝트 생성
2. SQL Editor에서 마이그레이션 실행:

```bash
# supabase/migrations/20260212000000_initial_schema.sql 내용을 SQL Editor에 붙여넣기
```

3. `.env.local`에 URL, Service Key, Anon Key 입력

### Ollama 설정

```bash
ollama pull ingu627/exaone4.0:32b
ollama pull qwen3-embedding:8b
```

## 실행

```bash
npm run dev
```

관리 대시보드: http://localhost:3000/admin

## CLI 스크립트

```bash
# 클라이언트 등록
npx tsx scripts/create-client.ts --name "KJTIMES"

# 크롤링 실행
npx tsx scripts/crawl.ts --limit 5

# 임베딩 생성
npx tsx scripts/embed.ts --limit 10

# 기사 생성
npx tsx scripts/generate.ts --limit 5

# 전체 파이프라인
npx tsx scripts/run-pipeline.ts --limit 5

# 테스트 데이터 시드
npx tsx scripts/seed.ts
```

## API 엔드포인트

인증: `Authorization: Bearer {api_key}`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/articles` | 기사 목록 (필터: region, category, keyword, from, to) |
| GET | `/api/v1/articles/:id` | 기사 상세 |
| GET | `/api/v1/regions` | 지역 목록 |
| GET | `/api/v1/categories` | 카테고리 목록 |

### 기사 응답 구조

```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "기사 제목",
      "summary": "부제목",
      "content": "기사 본문",
      "category": "economy",
      "source": "광주광역시",
      "source_url": "https://...",
      "images": [],
      "published_at": "2026-02-12T...",
      "processed_at": "2026-02-12T..."
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

## 관리 대시보드

| 경로 | 기능 |
|------|------|
| `/admin` | 대시보드 홈 (요약 카드) |
| `/admin/press-releases` | 보도자료 목록 + 필터 |
| `/admin/articles` | 생성 기사 목록 |
| `/admin/clients` | 클라이언트 관리 |
| `/admin/stats` | 통계 (카테고리별 분포) |
| `/admin/monitoring` | 27개 사이트 크롤러 상태 |

## 크론 스케줄

Vercel Cron으로 하루 3회 자동 실행:
- 06:00 KST
- 12:00 KST
- 18:00 KST

## 크롤링 대상 (27개 사이트)

광주광역시, 동구, 서구, 남구, 북구, 광산구, 전라남도, 목포시, 여수시, 순천시, 나주시, 광양시, 담양군, 곡성군, 구례군, 고흥군, 보성군, 화순군, 장흥군, 강진군, 해남군, 무안군, 함평군, 영광군, 장성군, 완도군, 신안군
