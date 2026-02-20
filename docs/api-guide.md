# 뉴스팩토리 API 연동 가이드

> 광주·전남 27개 지자체 보도자료 기반 AI 생성 기사를 API로 수신하기 위한 클라이언트 연동 가이드

**API 버전**: v1  
**최종 수정**: 2026년 2월  
**Base URL**: `https://news-factory-v2.vercel.app`

---

## 목차

1. [개요](#1-개요)
2. [시작하기](#2-시작하기)
3. [인증](#3-인증)
4. [엔드포인트 레퍼런스](#4-엔드포인트-레퍼런스)
5. [필터링 및 검색](#5-필터링-및-검색)
6. [페이지네이션](#6-페이지네이션)
7. [에러 처리](#7-에러-처리)
8. [요청 제한 (Rate Limiting)](#8-요청-제한-rate-limiting)
9. [연동 예제](#9-연동-예제)
10. [클라이언트 기술 스택 가이드](#10-클라이언트-기술-스택-가이드)
11. [권장 연동 아키텍처](#11-권장-연동-아키텍처)
12. [FAQ](#12-faq)
13. [지원](#13-지원)

---

## 1. 개요

뉴스팩토리는 광주광역시·전라남도 27개 지자체의 보도자료를 자동 수집하고, AI를 활용해 뉴스 기사로 가공하여 API를 통해 제공하는 서비스입니다.

### 제공 데이터

| 항목 | 설명 |
|------|------|
| **기사** | AI가 보도자료를 기반으로 생성한 뉴스 기사 (제목, 부제, 본문, 이미지) |
| **지역** | 27개 광주·전남 시군구 (광주 6개구 + 전남 21개 시군) |
| **카테고리** | 7개 분류 (경제, 정치, 사회, 스포츠, 문화, 오피니언, 사설) |

### 기사 갱신 주기

매일 3회 자동 수집 및 생성:
- 06:00 KST
- 12:00 KST
- 18:00 KST

### API 기본 사양

| 항목 | 내용 |
|------|------|
| 프로토콜 | HTTPS |
| 데이터 형식 | JSON |
| 인증 방식 | Bearer Token |
| HTTP 메서드 | GET |
| CORS | 모든 도메인 허용 |
| 요청 제한 | 100회/분 (클라이언트당) |

---

## 2. 시작하기

### 2.1 API 키 발급

뉴스팩토리 관리자에게 API 키 발급을 요청하세요. 발급 시 아래 정보가 제공됩니다:

- **API 키**: `nf_live_` 접두사로 시작하는 76자리 문자열
- API 키는 **발급 시 1회만** 표시되며, 이후 확인이 불가합니다
- 분실 시 키 재발급이 필요합니다

### 2.2 첫 번째 요청

API 키를 발급받았다면 아래 명령으로 연동을 확인할 수 있습니다:

```bash
curl -H "Authorization: Bearer {발급받은_API_키}" \
  https://news-factory-v2.vercel.app/api/v1/articles?limit=1
```

정상 응답 예시:

```json
{
  "articles": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "광주시청, 2026년 청년 창업 지원 사업 확대",
      "summary": "광주시청이 청년 창업 생태계 활성화를 위해 올해 지원 규모를 대폭 확대한다",
      "content": "광주시청은 20일 2026년 청년 창업 지원 사업 계획을 발표했다...",
      "category": "economy",
      "source": "광주시청",
      "source_url": "https://www.gwangju.go.kr/...",
      "images": [],
      "published_at": "2026-02-20T03:00:00.000Z",
      "processed_at": "2026-02-20T03:00:00.000Z"
    }
  ],
  "total": 1542,
  "limit": 1,
  "offset": 0
}
```

---

## 3. 인증

모든 API 요청에는 `Authorization` 헤더가 필요합니다.

### 요청 헤더

```
Authorization: Bearer nf_live_a1b2c3d4e5f6...
```

### 인증 실패 응답

| 상황 | 상태 코드 | 응답 |
|------|-----------|------|
| 헤더 누락 | `401` | `{"error": "Missing or invalid Authorization header. Expected: Bearer {api_key}"}` |
| 빈 키 | `401` | `{"error": "Empty API key"}` |
| 잘못된 키 | `401` | `{"error": "Invalid or inactive API key"}` |
| 비활성 키 | `401` | `{"error": "Invalid or inactive API key"}` |

### 보안 권장사항

- API 키를 소스 코드에 하드코딩하지 마세요
- 환경 변수 또는 비밀 관리 도구를 사용하세요
- 서버 측에서만 API를 호출하세요 (클라이언트 브라우저에서 직접 호출 금지)
- API 키가 유출된 경우 즉시 재발급을 요청하세요

---

## 4. 엔드포인트 레퍼런스

**Base URL**: `https://news-factory-v2.vercel.app`

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/v1/articles` | 기사 목록 조회 |
| `GET` | `/api/v1/articles/{id}` | 기사 상세 조회 |
| `GET` | `/api/v1/regions` | 지역 목록 조회 |
| `GET` | `/api/v1/categories` | 카테고리 목록 조회 |

---

### 4.1 기사 목록 조회

```
GET /api/v1/articles
```

기사 목록을 필터링·검색·페이지네이션하여 조회합니다.

#### 쿼리 파라미터

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `region` | string | - | 지역 필터 (쉼표 구분, 복수 가능) |
| `category` | string | - | 카테고리 필터 (쉼표 구분, 복수 가능) |
| `keyword` | string | - | 제목+본문 키워드 검색 |
| `from` | string | - | 시작일 (ISO 8601, 예: `2026-02-01`) |
| `to` | string | - | 종료일 (ISO 8601, 예: `2026-02-20`) |
| `status` | string | `available` | 기사 상태 필터 (`available`, `all`) |
| `limit` | number | `20` | 결과 수 (최소 1, 최대 100) |
| `offset` | number | `0` | 건너뛸 결과 수 |

#### 응답

```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "기사 제목",
      "summary": "부제목/요약",
      "content": "기사 본문 전체",
      "category": "economy",
      "source": "광주시청",
      "source_url": "https://원본_보도자료_URL",
      "images": ["https://이미지_URL_1", "https://이미지_URL_2"],
      "published_at": "2026-02-20T03:00:00.000Z",
      "processed_at": "2026-02-20T06:15:00.000Z"
    }
  ],
  "total": 1542,
  "limit": 20,
  "offset": 0
}
```

#### 기사 객체 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string (UUID) | 기사 고유 식별자 |
| `title` | string | 기사 제목 |
| `summary` | string \| null | 부제목 또는 요약문 |
| `content` | string | 기사 본문 (HTML 아님, 순수 텍스트) |
| `category` | string | 카테고리 코드 ([카테고리 목록](#카테고리-목록) 참조) |
| `source` | string | 출처 지자체명 (예: "광주시청", "목포시청") |
| `source_url` | string | 원본 보도자료 URL |
| `images` | string[] | 관련 이미지 URL 배열 (없을 경우 빈 배열) |
| `published_at` | string (ISO 8601) | 원본 보도자료 게시일시 |
| `processed_at` | string (ISO 8601) | 기사 생성 일시 |

#### 요청 예시

```bash
# 광주시청 경제 기사 최근 10건
curl -H "Authorization: Bearer {API_KEY}" \
  "https://news-factory-v2.vercel.app/api/v1/articles?region=광주시청&category=economy&limit=10"

# 2026년 2월 전체 기사
curl -H "Authorization: Bearer {API_KEY}" \
  "https://news-factory-v2.vercel.app/api/v1/articles?from=2026-02-01&to=2026-02-28&status=all"

# 키워드 검색
curl -H "Authorization: Bearer {API_KEY}" \
  "https://news-factory-v2.vercel.app/api/v1/articles?keyword=청년+창업"
```

---

### 4.2 기사 상세 조회

```
GET /api/v1/articles/{id}
```

특정 기사의 상세 정보를 조회합니다.

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string (UUID) | 기사 고유 식별자 |

#### 응답

```json
{
  "article": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "기사 제목",
    "summary": "부제목",
    "content": "기사 본문 전체",
    "category": "economy",
    "source": "광주시청",
    "source_url": "https://...",
    "images": [],
    "published_at": "2026-02-20T03:00:00.000Z",
    "processed_at": "2026-02-20T06:15:00.000Z"
  }
}
```

#### 에러 응답

| 상태 코드 | 응답 |
|-----------|------|
| `404` | `{"error": "Article not found"}` |

---

### 4.3 지역 목록 조회

```
GET /api/v1/regions
```

현재 기사가 존재하는 지역 목록을 반환합니다.

#### 응답

```json
{
  "regions": [
    { "code": "광주시청", "name": "광주시청" },
    { "code": "동구청", "name": "동구청" },
    { "code": "목포시청", "name": "목포시청" },
    { "code": "여수시청", "name": "여수시청" }
  ]
}
```

#### 전체 지역 목록 (27개)

**광주광역시 (6)**

| 코드 | 지역명 |
|------|--------|
| 광주시청 | 광주광역시 |
| 동구청 | 동구 |
| 서구청 | 서구 |
| 남구청 | 남구 |
| 북구청 | 북구 |
| 광산구청 | 광산구 |

**전라남도 (21)**

| 코드 | 지역명 |
|------|--------|
| 전라남도청 | 전라남도 |
| 목포시청 | 목포시 |
| 여수시청 | 여수시 |
| 순천시청 | 순천시 |
| 나주시청 | 나주시 |
| 광양시청 | 광양시 |
| 담양군청 | 담양군 |
| 곡성군청 | 곡성군 |
| 구례군청 | 구례군 |
| 고흥군청 | 고흥군 |
| 보성군청 | 보성군 |
| 화순군청 | 화순군 |
| 장흥군청 | 장흥군 |
| 강진군청 | 강진군 |
| 해남군청 | 해남군 |
| 무안군청 | 무안군 |
| 함평군청 | 함평군 |
| 영광군청 | 영광군 |
| 장성군청 | 장성군 |
| 완도군청 | 완도군 |
| 신안군청 | 신안군 |

> **참고**: 지역 코드(code)와 이름(name)은 동일한 값입니다. `region` 파라미터에 이 값을 그대로 사용하세요.

---

### 4.4 카테고리 목록 조회

```
GET /api/v1/categories
```

사용 가능한 기사 카테고리 목록을 반환합니다.

#### 응답

```json
{
  "categories": [
    { "code": "economy", "name": "경제" },
    { "code": "politics", "name": "정치" },
    { "code": "society", "name": "사회" },
    { "code": "sports", "name": "스포츠" },
    { "code": "culture", "name": "문화" },
    { "code": "opinion", "name": "오피니언" },
    { "code": "editorial", "name": "사설" }
  ]
}
```

#### 카테고리 목록

| 코드 | 한국어명 | 설명 |
|------|----------|------|
| `economy` | 경제 | 경제, 산업, 기업, 일자리 관련 |
| `politics` | 정치 | 정치, 행정, 의회, 선거 관련 |
| `society` | 사회 | 사회, 교육, 복지, 환경 관련 |
| `sports` | 스포츠 | 체육, 스포츠 행사 관련 |
| `culture` | 문화 | 문화, 예술, 관광, 축제 관련 |
| `opinion` | 오피니언 | 칼럼, 기고문 관련 |
| `editorial` | 사설 | 사설, 논평 관련 |

---

## 5. 필터링 및 검색

### 5.1 지역 필터

쉼표로 구분하여 복수 지역을 동시에 조회할 수 있습니다.

```bash
# 단일 지역
?region=목포시청

# 복수 지역
?region=목포시청,여수시청,순천시청
```

### 5.2 카테고리 필터

쉼표로 구분하여 복수 카테고리를 동시에 조회할 수 있습니다.

```bash
# 단일 카테고리
?category=economy

# 복수 카테고리
?category=economy,politics,society
```

### 5.3 키워드 검색

제목과 본문에서 키워드를 검색합니다. 대소문자를 구분하지 않습니다.

```bash
?keyword=청년+창업
```

### 5.4 날짜 범위 필터

ISO 8601 형식의 날짜로 기간을 지정합니다. `from`과 `to`는 독립적으로 사용 가능합니다.

```bash
# 특정 기간
?from=2026-02-01&to=2026-02-28

# 특정일 이후
?from=2026-02-15

# 특정일 이전
?to=2026-02-10
```

### 5.5 필터 조합

모든 필터는 AND 조건으로 결합됩니다.

```bash
# 목포시청 경제 기사 중 "투자" 포함, 2월 이후
?region=목포시청&category=economy&keyword=투자&from=2026-02-01
```

---

## 6. 페이지네이션

### 파라미터

| 파라미터 | 설명 | 범위 | 기본값 |
|----------|------|------|--------|
| `limit` | 한 번에 가져올 기사 수 | 1 ~ 100 | 20 |
| `offset` | 건너뛸 기사 수 | 0 이상 | 0 |

### 사용 예시

```bash
# 1페이지 (1~20번째)
?limit=20&offset=0

# 2페이지 (21~40번째)
?limit=20&offset=20

# 3페이지 (41~60번째)
?limit=20&offset=40
```

### 페이지 계산

```
총 페이지 수 = Math.ceil(total / limit)
현재 페이지 = Math.floor(offset / limit) + 1
다음 offset = offset + limit
```

### 응답의 페이지네이션 정보

```json
{
  "articles": [...],
  "total": 1542,
  "limit": 20,
  "offset": 40
}
```

- `total`: 필터 조건에 맞는 전체 기사 수
- `limit`: 요청한 결과 수
- `offset`: 현재 건너뛴 수

---

## 7. 에러 처리

### HTTP 상태 코드

| 상태 코드 | 의미 | 설명 |
|-----------|------|------|
| `200` | 성공 | 정상 응답 |
| `400` | 잘못된 요청 | 필수 파라미터 누락 등 |
| `401` | 인증 실패 | API 키 누락, 잘못된 키, 비활성 키 |
| `404` | 미발견 | 요청한 기사가 존재하지 않음 |
| `429` | 요청 제한 초과 | 분당 100회 초과 |
| `500` | 서버 오류 | 내부 서버 오류 |

### 에러 응답 형식

모든 에러는 동일한 JSON 형식으로 반환됩니다:

```json
{
  "error": "에러 메시지"
}
```

### 에러 처리 권장사항

```
1. HTTP 상태 코드를 먼저 확인
2. 401 → API 키 확인 (만료, 오타, 비활성 여부)
3. 429 → Retry-After 헤더 확인 후 대기
4. 500 → 30초 후 재시도 (최대 3회)
5. 모든 에러 응답의 error 필드를 로깅
```

---

## 8. 요청 제한 (Rate Limiting)

### 제한 기준

| 항목 | 값 |
|------|-----|
| 제한 단위 | 클라이언트(API 키)당 |
| 허용 횟수 | **100회** |
| 시간 창 | **1분** (60초) |

### 응답 헤더

모든 API 응답에 아래 헤더가 포함됩니다:

| 헤더 | 설명 | 예시 |
|------|------|------|
| `X-RateLimit-Limit` | 분당 최대 허용 횟수 | `100` |
| `X-RateLimit-Remaining` | 현재 시간 창에서 남은 횟수 | `87` |
| `X-RateLimit-Reset` | 시간 창 초기화 시각 (Unix 타임스탬프) | `1740034860` |

### 제한 초과 시

```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1740034860

{
  "error": "Rate limit exceeded. Max 100 requests per minute."
}
```

`Retry-After` 헤더의 초(seconds) 값만큼 대기 후 재시도하세요.

---

## 9. 연동 예제

### 9.1 cURL

```bash
# 최신 기사 10건 조회
curl -s -H "Authorization: Bearer nf_live_YOUR_API_KEY" \
  "https://news-factory-v2.vercel.app/api/v1/articles?limit=10" | jq .

# 특정 기사 상세
curl -s -H "Authorization: Bearer nf_live_YOUR_API_KEY" \
  "https://news-factory-v2.vercel.app/api/v1/articles/550e8400-e29b-41d4-a716-446655440000" | jq .

# 지역 목록
curl -s -H "Authorization: Bearer nf_live_YOUR_API_KEY" \
  "https://news-factory-v2.vercel.app/api/v1/regions" | jq .
```

---

### 9.2 Python

**필요 패키지**: `requests` (`pip install requests`)

```python
import requests
import time

BASE_URL = "https://news-factory-v2.vercel.app"
API_KEY = "nf_live_YOUR_API_KEY"  # 환경 변수 사용 권장

HEADERS = {
    "Authorization": f"Bearer {API_KEY}"
}


def get_articles(region=None, category=None, keyword=None,
                 from_date=None, to_date=None, limit=20, offset=0):
    """기사 목록을 조회합니다."""
    params = {"limit": limit, "offset": offset}
    if region:
        params["region"] = region
    if category:
        params["category"] = category
    if keyword:
        params["keyword"] = keyword
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date

    response = requests.get(
        f"{BASE_URL}/api/v1/articles",
        headers=HEADERS,
        params=params,
        timeout=30
    )

    if response.status_code == 429:
        retry_after = int(response.headers.get("Retry-After", 60))
        print(f"요청 제한 초과. {retry_after}초 후 재시도...")
        time.sleep(retry_after)
        return get_articles(region, category, keyword,
                            from_date, to_date, limit, offset)

    response.raise_for_status()
    return response.json()


def get_article(article_id):
    """특정 기사를 조회합니다."""
    response = requests.get(
        f"{BASE_URL}/api/v1/articles/{article_id}",
        headers=HEADERS,
        timeout=30
    )
    response.raise_for_status()
    return response.json()["article"]


def get_all_articles(region=None, category=None, limit_per_page=100):
    """모든 기사를 페이지네이션으로 가져옵니다."""
    all_articles = []
    offset = 0

    while True:
        data = get_articles(
            region=region,
            category=category,
            limit=limit_per_page,
            offset=offset
        )
        all_articles.extend(data["articles"])

        if offset + limit_per_page >= data["total"]:
            break
        offset += limit_per_page

    return all_articles


# 사용 예시
if __name__ == "__main__":
    # 최신 기사 5건
    result = get_articles(limit=5)
    for article in result["articles"]:
        print(f"[{article['category']}] {article['title']}")
        print(f"  출처: {article['source']}")
        print()

    # 목포시청 경제 기사 전체
    articles = get_all_articles(region="목포시청", category="economy")
    print(f"목포시청 경제 기사: 총 {len(articles)}건")
```

---

### 9.3 JavaScript / Node.js

**필요 환경**: Node.js 18 이상 (내장 fetch 사용)

```javascript
const BASE_URL = "https://news-factory-v2.vercel.app";
const API_KEY = process.env.NEWS_FACTORY_API_KEY; // 환경 변수 사용

const headers = {
  Authorization: `Bearer ${API_KEY}`,
};

async function getArticles({
  region,
  category,
  keyword,
  from,
  to,
  limit = 20,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (region) params.set("region", region);
  if (category) params.set("category", category);
  if (keyword) params.set("keyword", keyword);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const response = await fetch(
    `${BASE_URL}/api/v1/articles?${params}`,
    { headers }
  );

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After") || 60);
    console.log(`요청 제한 초과. ${retryAfter}초 후 재시도...`);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return getArticles({ region, category, keyword, from, to, limit, offset });
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  return response.json();
}

async function getArticle(id) {
  const response = await fetch(`${BASE_URL}/api/v1/articles/${id}`, {
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.article;
}

async function getRegions() {
  const response = await fetch(`${BASE_URL}/api/v1/regions`, { headers });
  const data = await response.json();
  return data.regions;
}

async function getCategories() {
  const response = await fetch(`${BASE_URL}/api/v1/categories`, { headers });
  const data = await response.json();
  return data.categories;
}

// 사용 예시
async function main() {
  // 최신 기사 5건
  const result = await getArticles({ limit: 5 });
  for (const article of result.articles) {
    console.log(`[${article.category}] ${article.title}`);
    console.log(`  출처: ${article.source}`);
  }

  // 지역 목록
  const regions = await getRegions();
  console.log("지역:", regions.map((r) => r.name).join(", "));
}

main().catch(console.error);
```

---

### 9.4 PHP

**필요 환경**: PHP 7.4 이상, `curl` 확장

```php
<?php

define('BASE_URL', 'https://news-factory-v2.vercel.app');
define('API_KEY', getenv('NEWS_FACTORY_API_KEY')); // 환경 변수 사용

function apiRequest(string $endpoint, array $params = []): array
{
    $url = BASE_URL . $endpoint;
    if (!empty($params)) {
        $url .= '?' . http_build_query($params);
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . API_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 429) {
        sleep(60);
        return apiRequest($endpoint, $params);
    }

    $data = json_decode($response, true);

    if ($httpCode !== 200) {
        throw new RuntimeException(
            $data['error'] ?? "HTTP {$httpCode}",
            $httpCode
        );
    }

    return $data;
}

function getArticles(array $options = []): array
{
    $params = [
        'limit' => $options['limit'] ?? 20,
        'offset' => $options['offset'] ?? 0,
    ];

    if (!empty($options['region'])) $params['region'] = $options['region'];
    if (!empty($options['category'])) $params['category'] = $options['category'];
    if (!empty($options['keyword'])) $params['keyword'] = $options['keyword'];
    if (!empty($options['from'])) $params['from'] = $options['from'];
    if (!empty($options['to'])) $params['to'] = $options['to'];

    return apiRequest('/api/v1/articles', $params);
}

function getArticle(string $id): array
{
    $data = apiRequest("/api/v1/articles/{$id}");
    return $data['article'];
}

function getRegions(): array
{
    $data = apiRequest('/api/v1/regions');
    return $data['regions'];
}

function getCategories(): array
{
    $data = apiRequest('/api/v1/categories');
    return $data['categories'];
}

// 사용 예시
$result = getArticles(['region' => '목포시청', 'category' => 'economy', 'limit' => 10]);

echo "총 {$result['total']}건 중 " . count($result['articles']) . "건 조회\n\n";

foreach ($result['articles'] as $article) {
    echo "[{$article['category']}] {$article['title']}\n";
    echo "  출처: {$article['source']}\n\n";
}
```

---

### 9.5 Java (Spring Boot / OkHttp)

**필요 의존성**: `com.squareup.okhttp3:okhttp`, `com.google.code.gson:gson`

```java
import okhttp3.*;
import com.google.gson.*;

public class NewsFactoryClient {
    private static final String BASE_URL = "https://news-factory-v2.vercel.app";
    private final OkHttpClient client = new OkHttpClient();
    private final Gson gson = new Gson();
    private final String apiKey;

    public NewsFactoryClient(String apiKey) {
        this.apiKey = apiKey;
    }

    private JsonObject request(String endpoint) throws Exception {
        Request request = new Request.Builder()
            .url(BASE_URL + endpoint)
            .header("Authorization", "Bearer " + apiKey)
            .build();

        try (Response response = client.newCall(request).execute()) {
            String body = response.body().string();

            if (response.code() == 429) {
                String retryAfter = response.header("Retry-After", "60");
                Thread.sleep(Long.parseLong(retryAfter) * 1000);
                return request(endpoint);
            }

            if (!response.isSuccessful()) {
                throw new RuntimeException("HTTP " + response.code() + ": " + body);
            }

            return gson.fromJson(body, JsonObject.class);
        }
    }

    public JsonObject getArticles(String region, String category, int limit, int offset)
            throws Exception {
        StringBuilder endpoint = new StringBuilder("/api/v1/articles?");
        endpoint.append("limit=").append(limit);
        endpoint.append("&offset=").append(offset);
        if (region != null) endpoint.append("&region=").append(region);
        if (category != null) endpoint.append("&category=").append(category);
        return request(endpoint.toString());
    }

    public JsonObject getArticle(String id) throws Exception {
        return request("/api/v1/articles/" + id);
    }

    // 사용 예시
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("NEWS_FACTORY_API_KEY");
        NewsFactoryClient nf = new NewsFactoryClient(apiKey);

        JsonObject result = nf.getArticles(null, "economy", 5, 0);
        JsonArray articles = result.getAsJsonArray("articles");

        for (JsonElement el : articles) {
            JsonObject article = el.getAsJsonObject();
            System.out.printf("[%s] %s%n",
                article.get("category").getAsString(),
                article.get("title").getAsString());
        }
    }
}
```

---

## 10. 클라이언트 기술 스택 가이드

뉴스팩토리 API를 연동하기 위해 필요한 최소 기술 요건입니다.

### 필수 요건

| 항목 | 요건 |
|------|------|
| **HTTPS 지원** | TLS 1.2 이상을 지원하는 HTTP 클라이언트 |
| **JSON 파싱** | JSON 응답을 파싱할 수 있는 라이브러리 |
| **UTF-8** | 한국어(UTF-8) 인코딩 처리 |
| **환경 변수** | API 키를 안전하게 저장할 수 있는 환경 |

### 언어별 권장 라이브러리

| 언어 | HTTP 클라이언트 | JSON 파서 |
|------|----------------|-----------|
| Python | `requests` 또는 `httpx` | 내장 `json` |
| JavaScript | 내장 `fetch` (Node 18+) 또는 `axios` | 내장 `JSON` |
| PHP | 내장 `curl` 또는 `guzzlehttp/guzzle` | 내장 `json_decode` |
| Java | `OkHttp` 또는 `HttpClient` (Java 11+) | `Gson` 또는 `Jackson` |
| C# | `HttpClient` | `System.Text.Json` |
| Go | 내장 `net/http` | 내장 `encoding/json` |
| Ruby | `net/http` 또는 `faraday` | 내장 `json` |

### 서버 환경 권장사항

- **서버 사이드 호출**: API 키 보호를 위해 반드시 서버에서 호출
- **스케줄러**: 정기적으로 기사를 가져올 수 있는 스케줄러 (cron, Windows 작업 스케줄러 등)
- **데이터베이스**: 수신한 기사를 저장할 로컬 DB (MySQL, PostgreSQL, SQLite 등)
- **캐시**: 동일 요청의 반복 호출을 줄이기 위한 캐시 레이어 (Redis, Memcached, 파일 캐시 등)

---

## 11. 권장 연동 아키텍처

### 기본 구조

```
[뉴스팩토리 API] ←── HTTPS/JSON ──→ [클라이언트 수집 서버] ──→ [클라이언트 DB] ──→ [클라이언트 웹사이트]
```

### 권장 수집 주기

뉴스팩토리는 하루 3회(06:00, 12:00, 18:00 KST) 기사를 갱신합니다.

| 수집 전략 | 주기 | 설명 |
|-----------|------|------|
| **기본** | 매 6시간 | 갱신 직후 1회 수집 (06:30, 12:30, 18:30) |
| **실시간** | 매 1시간 | 신규 기사를 빠르게 반영하고 싶은 경우 |
| **최소** | 매 12시간 | 일간 뉴스 수준의 갱신이 충분한 경우 |

### 수집 로직 권장사항

```
1. GET /api/v1/articles?from={마지막_수집_시각}&limit=100 으로 신규 기사 조회
2. 응답의 total이 100 초과면 offset을 증가시켜 추가 조회
3. 수신한 기사의 id를 기준으로 중복 체크 (UUID는 고유값)
4. 신규 기사만 로컬 DB에 저장
5. 마지막 수집 시각을 갱신
```

### 수집 서버 예시 (Python)

```python
import requests
import sqlite3
from datetime import datetime, timezone

BASE_URL = "https://news-factory-v2.vercel.app"
API_KEY = "nf_live_YOUR_API_KEY"
DB_PATH = "articles.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            summary TEXT,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            source TEXT NOT NULL,
            source_url TEXT,
            images TEXT,
            published_at TEXT,
            fetched_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            synced_at TEXT NOT NULL,
            articles_fetched INTEGER NOT NULL
        )
    """)
    conn.commit()
    return conn


def get_last_sync(conn):
    row = conn.execute(
        "SELECT synced_at FROM sync_log ORDER BY id DESC LIMIT 1"
    ).fetchone()
    return row[0] if row else None


def fetch_new_articles(last_sync=None):
    all_articles = []
    offset = 0
    limit = 100

    while True:
        params = {"limit": limit, "offset": offset, "status": "all"}
        if last_sync:
            params["from"] = last_sync

        response = requests.get(
            f"{BASE_URL}/api/v1/articles",
            headers={"Authorization": f"Bearer {API_KEY}"},
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        all_articles.extend(data["articles"])

        if offset + limit >= data["total"]:
            break
        offset += limit

    return all_articles


def sync():
    conn = init_db()
    last_sync = get_last_sync(conn)
    now = datetime.now(timezone.utc).isoformat()

    print(f"마지막 수집: {last_sync or '없음'}")
    articles = fetch_new_articles(last_sync)
    print(f"수신 기사: {len(articles)}건")

    new_count = 0
    for article in articles:
        try:
            conn.execute(
                """INSERT OR IGNORE INTO articles
                   (id, title, summary, content, category,
                    source, source_url, images, published_at, fetched_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    article["id"],
                    article["title"],
                    article["summary"],
                    article["content"],
                    article["category"],
                    article["source"],
                    article["source_url"],
                    str(article["images"]),
                    article["published_at"],
                    now,
                ),
            )
            if conn.total_changes:
                new_count += 1
        except sqlite3.IntegrityError:
            pass

    conn.execute(
        "INSERT INTO sync_log (synced_at, articles_fetched) VALUES (?, ?)",
        (now, new_count),
    )
    conn.commit()
    conn.close()

    print(f"신규 저장: {new_count}건")


if __name__ == "__main__":
    sync()
```

**crontab 설정** (하루 3회, 갱신 30분 후):

```
30 6,12,18 * * * cd /path/to/project && python sync.py >> sync.log 2>&1
```

---

## 12. FAQ

### Q. 기사 본문에 HTML 태그가 포함되나요?

아니요. `content` 필드는 순수 텍스트입니다. 클라이언트 측에서 자체적으로 HTML 포맷팅을 적용하세요.

### Q. 이미지 URL의 유효기간이 있나요?

`images` 배열의 URL은 원본 보도자료의 이미지 링크입니다. 지자체 서버 상황에 따라 접근이 불가할 수 있으므로, 중요한 이미지는 클라이언트 측 서버에 별도 저장하는 것을 권장합니다.

### Q. 기사가 수정되거나 삭제될 수 있나요?

현재 한번 생성된 기사는 수정·삭제되지 않습니다. 기사 `id`(UUID)는 영구적으로 유효합니다.

### Q. 하루에 몇 건의 기사가 생성되나요?

지자체별 보도자료 발행 빈도에 따라 다르며, 평균적으로 하루 50~200건 수준입니다.

### Q. API 키를 여러 서버에서 동시에 사용할 수 있나요?

가능합니다. 단, 모든 서버의 요청이 합산되어 분당 100회 제한이 적용됩니다.

### Q. 특정 지역만 구독할 수 있나요?

API 레벨에서는 `region` 파라미터로 필터링합니다. 별도의 구독 설정은 없으며, 원하는 지역만 조회하면 됩니다.

### Q. 요청 제한(100회/분)이 부족합니다

일반적인 수집 패턴에서는 충분한 수준입니다. 추가 할당이 필요한 경우 관리자에게 문의하세요.

---

## 13. 지원

| 항목 | 내용 |
|------|------|
| API 키 발급/재발급 | 뉴스팩토리 관리자에게 요청 |
| 기술 문의 | 뉴스팩토리 기술 지원팀 |
| 장애 신고 | 뉴스팩토리 운영팀 |

---

**뉴스팩토리** | 광주·전남 AI 뉴스 생성 플랫폼
