import {
  ARTICLE_CATEGORIES,
  type ArticleGenerationRequest,
  type ArticleCategory,
  type GeneratedArticle,
} from "@/types/article";
import { buildArticleGenerationUserPrompt, KOREAN_REPORTER_SYSTEM_PROMPT } from "@/lib/ai/prompts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";
const TIMEOUT_MS = 55_000;

type OpenRouterResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: { message?: string };
};

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Missing OPENROUTER_API_KEY environment variable");
  return key;
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

function extractJsonFromResponse(raw: string): string {
  let cleaned = raw.replace(/<\/?[Tt]hought>[\s\S]*?<\/[Tt]hought>/g, "");
  cleaned = cleaned.replace(/^[\s\S]*?<\/[Tt]hought>\s*/i, "");
  cleaned = cleaned.replace(/[Tt]hought:[\s\S]*?(?=```|{)/i, "");

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0].trim();

  return cleaned.trim();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((e) => (typeof e === "string" ? e.trim() : "")).filter(Boolean);
}

function normalizeCategory(value: unknown): ArticleCategory {
  const category = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (ARTICLE_CATEGORIES.includes(category as ArticleCategory)) return category as ArticleCategory;
  return "society";
}

function parseGeneratedArticle(raw: string): GeneratedArticle {
  const payload = JSON.parse(extractJsonFromResponse(raw)) as Record<string, unknown>;

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const subtitle = typeof payload.subtitle === "string" ? payload.subtitle.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const titleCandidates = toStringArray(payload.title_candidates).slice(0, 3);
  const summaryLines = toStringArray(payload.summary_lines).slice(0, 3);
  const category = normalizeCategory(payload.category);

  if (!title || !body) {
    throw new Error("AI response missing required fields: title/body");
  }

  const paddedCandidates = [title, ...titleCandidates].slice(0, 3);
  while (paddedCandidates.length < 3) paddedCandidates.push(title);

  const defaultSummaryLine = subtitle || title;
  const paddedSummary = [...summaryLines];
  while (paddedSummary.length < 3) paddedSummary.push(defaultSummaryLine);

  return {
    title,
    title_candidates: [paddedCandidates[0], paddedCandidates[1], paddedCandidates[2]],
    subtitle: subtitle || paddedSummary[0],
    summary_lines: [paddedSummary[0], paddedSummary[1], paddedSummary[2]],
    body,
    category,
  };
}

export async function generateArticleWithOpenRouter(
  request: ArticleGenerationRequest,
): Promise<GeneratedArticle> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://news-factory.vercel.app",
        "X-Title": "News Factory",
      },
      body: JSON.stringify({
        model: getModel(),
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
        `OpenRouter API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`,
      );
    }

    const payload = (await response.json()) as OpenRouterResponse;

    if (payload.error?.message) {
      throw new Error(`OpenRouter error: ${payload.error.message}`);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("OpenRouter API returned empty message content");
    }

    return parseGeneratedArticle(content);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`OpenRouter request timed out after ${TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
