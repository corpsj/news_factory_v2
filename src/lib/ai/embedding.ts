import {
  EMBEDDING_DIMENSIONS,
  DEFAULT_EMBED_MODEL,
  type EmbeddingInput,
} from "@/types/embedding";

const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";
const TIMEOUT_MS = 45_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1_500;
const MAX_INPUT_CHARS = 28_000;

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
  const raw = `${title}\n\n${content}`;
  return raw.length > MAX_INPUT_CHARS ? raw.slice(0, MAX_INPUT_CHARS) : raw;
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  // retry on: provider failures, rate limits, server errors, network issues
  return /No successful provider|429|5\d{2}|fetch failed|ECONNRESET|ETIMEDOUT/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callEmbeddingApi(text: string, signal: AbortSignal): Promise<number[]> {
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
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
      provider: { allow_fallbacks: true },
    }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter embedding error: ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`,
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
}

export async function generateEmbedding(input: EmbeddingInput): Promise<number[]> {
  const timeoutMs = input.timeoutMs ?? TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const text = formatInput(input.title, input.content);
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await callEmbeddingApi(text, controller.signal);
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES && isRetryable(error)) {
          const delay = RETRY_BASE_DELAY_MS * (attempt + 1);
          console.warn(`Embedding retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
          await sleep(delay);
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`OpenRouter embedding request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
