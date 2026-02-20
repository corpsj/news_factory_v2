import {
  EMBEDDING_DIMENSIONS,
  DEFAULT_EMBED_MODEL,
  type EmbeddingInput,
} from "@/types/embedding";

const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";
const TIMEOUT_MS = 45_000;

type OpenRouterEmbeddingResponse = {
  data?: Array<{ embedding?: number[]; index: number }>;
  error?: { message?: string };
};

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Missing OPENROUTER_API_KEY environment variable");
  return key;
}

function getEmbedModel(): string {
  return process.env.OPENROUTER_EMBED_MODEL || DEFAULT_EMBED_MODEL;
}

function formatInput(title: string, content: string): string {
  return `${title}\n\n${content}`;
}

export async function generateEmbedding(input: EmbeddingInput): Promise<number[]> {
  const timeoutMs = input.timeoutMs ?? TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://news-factory-v2.vercel.app",
        "X-Title": "News Factory",
      },
      body: JSON.stringify({
        model: getEmbedModel(),
        input: formatInput(input.title, input.content),
        dimensions: EMBEDDING_DIMENSIONS,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `OpenRouter embedding error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`,
      );
    }

    const data = (await response.json()) as OpenRouterEmbeddingResponse;

    if (data.error?.message) {
      throw new Error(`OpenRouter embedding error: ${data.error.message}`);
    }

    const vector = data.data?.[0]?.embedding;
    if (!Array.isArray(vector)) {
      throw new Error("OpenRouter embedding response did not include a vector");
    }

    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected ${EMBEDDING_DIMENSIONS} embedding dimensions but got ${vector.length}`,
      );
    }

    return vector;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`OpenRouter embedding request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
