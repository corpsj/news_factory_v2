import type { ArticleGenerationRequest } from "@/types/article";

export const KOREAN_REPORTER_SYSTEM_PROMPT = [
  "당신은 30년 경력의 베테랑 사회부 기자다.",
  "정확성, 공정성, 사실 검증을 최우선으로 두고 과장 없이 기사화한다.",
  '기사 문체는 객관적 어조를 유지하고 "밝혔다", "전했다", "알려졌다" 같은 표현을 자연스럽게 사용한다.',
  "출력은 오직 JSON 객체 하나만 반환한다.",
].join(" ");

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildRagContextSection(request: ArticleGenerationRequest) {
  const references = request.ragReferences;
  const count = references.length;

  if (count === 0) {
    return [
      "관련 보도자료가 0건 있으며, 이를 참고하여 종합적 기사를 작성하세요.",
      "관련 참고 자료가 없으므로 입력 보도자료의 사실만으로 작성하세요.",
    ].join("\n");
  }

  const lines = references.map((reference, index) => {
    return [
      `${index + 1}. [유사도 ${reference.similarity.toFixed(3)}] ${reference.title}`,
      `   - 출처: ${reference.source}`,
      `   - 일시: ${reference.published_at}`,
      `   - 요약: ${reference.content_excerpt}`,
    ].join("\n");
  });

  return [
    `관련 보도자료가 ${count}건 있으며, 이를 참고하여 종합적 기사를 작성하세요.`,
    ...lines,
  ].join("\n");
}

export function buildArticleGenerationUserPrompt(request: ArticleGenerationRequest) {
  const pressRelease = request.pressRelease;

  return [
    "아래 보도자료를 바탕으로 한국어 뉴스 기사를 작성하세요.",
    "",
    "[작성 지침]",
    "1) 역피라미드 구조로 작성하고 가장 핵심 사실을 첫 문단에 배치하세요.",
    "2) 객관적 어조를 유지하고 선정적 표현을 금지하세요.",
    "3) 제목 후보 3개를 만들고, 최종 대표 제목 1개를 선택하세요.",
    "4) 3줄 요약(summary_lines)을 작성하세요.",
    "5) 카테고리는 반드시 press_release로 지정하세요.",
    "6) 본문(body)은 HTML 문자열로 작성하며 <p> 태그를 필수 사용하고 핵심어 강조에 <b> 태그를 사용하세요.",
    "7) 사실 관계는 입력 내용과 관련 보도자료 맥락에서 벗어나지 마세요.",
    "",
    "[원본 보도자료]",
    `- ID: ${pressRelease.id}`,
    `- 출처: ${pressRelease.source}`,
    `- 배포시각: ${pressRelease.published_at}`,
    `- 제목: ${normalizeWhitespace(pressRelease.title)}`,
    "- 본문:",
    pressRelease.content.trim(),
    "",
    "[RAG 참고 문맥]",
    buildRagContextSection(request),
    "",
    "[출력 JSON 스키마]",
    "{",
    '  "title": "대표 제목 1개",',
    '  "title_candidates": ["제목1", "제목2", "제목3"],',
    '  "subtitle": "기사 부제 1개",',
    '  "summary_lines": ["요약1", "요약2", "요약3"],',
    '  "body": "<p>첫 문단...</p><p>둘째 문단...</p>",',
    '  "category": "press_release"',
    "}",
  ].join("\n");
}
