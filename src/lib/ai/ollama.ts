import {
  ARTICLE_CATEGORIES,
  type ArticleGenerationRequest,
  type ArticleCategory,
  type GeneratedArticle,
} from "@/types/article";
import { buildArticleGenerationUserPrompt, KOREAN_REPORTER_SYSTEM_PROMPT } from "@/lib/ai/prompts";

const OLLAMA_CHAT_ENDPOINT = "/api/chat";
const OLLAMA_ARTICLE_MODEL = "ingu627/exaone4.0:32b";
const OLLAMA_TIMEOUT_MS = 120_000;

type OllamaChatResponse = {
  message?: {
    role?: string;
    content?: unknown;
  };
};

function getApiBaseUrl() {
  return (process.env.OLLAMA_API_URL ?? "http://localhost:11434").replace(/\/$/, "");
}

function stripMarkdownCodeBlocks(raw: string) {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function normalizeCategory(value: unknown): ArticleCategory {
  const category = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (ARTICLE_CATEGORIES.includes(category as ArticleCategory)) {
    return category as ArticleCategory;
  }
  return "society";
}

function parseGeneratedArticle(raw: string): GeneratedArticle {
  const payload = JSON.parse(stripMarkdownCodeBlocks(raw)) as Record<string, unknown>;

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const subtitle = typeof payload.subtitle === "string" ? payload.subtitle.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const titleCandidates = toStringArray(payload.title_candidates).slice(0, 3);
  const summaryLines = toStringArray(payload.summary_lines).slice(0, 3);
  const category = normalizeCategory(payload.category);

  if (!title || !body) {
    throw new Error("Ollama response JSON missing required fields: title/body");
  }

  const paddedCandidates = [title, ...titleCandidates].slice(0, 3);
  while (paddedCandidates.length < 3) {
    paddedCandidates.push(title);
  }

  const defaultSummaryLine = subtitle || title;
  const paddedSummary = [...summaryLines];
  while (paddedSummary.length < 3) {
    paddedSummary.push(defaultSummaryLine);
  }

  return {
    title,
    title_candidates: [paddedCandidates[0], paddedCandidates[1], paddedCandidates[2]],
    subtitle: subtitle || paddedSummary[0],
    summary_lines: [paddedSummary[0], paddedSummary[1], paddedSummary[2]],
    body,
    category,
  };
}

export async function generateArticleWithOllama(
  request: ArticleGenerationRequest,
): Promise<GeneratedArticle> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBaseUrl()}${OLLAMA_CHAT_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_ARTICLE_MODEL,
        stream: false,
        messages: [
          { role: "system", content: KOREAN_REPORTER_SYSTEM_PROMPT },
          { role: "user", content: buildArticleGenerationUserPrompt(request) },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Ollama chat API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`,
      );
    }

    const payload = (await response.json()) as OllamaChatResponse;
    const content = payload?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Ollama chat API returned empty message content");
    }

    return parseGeneratedArticle(content);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Ollama chat request timed out after ${OLLAMA_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
