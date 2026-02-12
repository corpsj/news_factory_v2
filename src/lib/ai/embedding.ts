import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  EMBEDDING_DIMENSIONS,
  OLLAMA_DEFAULT_API_URL,
  OLLAMA_EMBED_MODEL,
  REQUIRED_OLLAMA_MODELS,
  type EmbeddingInput,
  type OllamaModelCheckResult,
} from "@/types/embedding";

const execFileAsync = promisify(execFile);
let resolvedEmbedModel: string | null = null;

const OLLAMA_UNREACHABLE_MESSAGE =
  "Ollama server not reachable at http://localhost:11434";
const OLLAMA_MODEL_MISSING_MESSAGE =
  "Model qwen3-embedding not found. Run: ollama pull qwen3-embedding";

function getOllamaApiBaseUrl() {
  return (process.env.OLLAMA_API_URL ?? OLLAMA_DEFAULT_API_URL).replace(/\/$/, "");
}

function formatEmbeddingInput(title: string, content: string) {
  return `${title}\n\n${content}`;
}

function extractEmbedding(payload: unknown): number[] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid embed response from Ollama.");
  }

  const response = payload as {
    embedding?: unknown;
    embeddings?: unknown;
  };

  const first = Array.isArray(response.embeddings) ? response.embeddings[0] : response.embedding;

  if (!Array.isArray(first)) {
    throw new Error("Ollama response did not include an embedding vector.");
  }

  const vector = first.map((value) => Number(value));
  if (vector.some((value) => Number.isNaN(value))) {
    throw new Error("Ollama embedding contains non-numeric values.");
  }

  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS} embedding dimensions but got ${vector.length}.`,
    );
  }

  return vector;
}

function isModelMissing(message: string) {
  return /model/i.test(message) && /(not found|pull|does not exist|missing)/i.test(message);
}

function toErrorMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string") {
    return value;
  }
  return "Unknown error";
}

function matchesRequiredModel(installedModel: string, requiredModel: string) {
  return (
    installedModel === requiredModel ||
    installedModel.startsWith(`${requiredModel}:`) ||
    installedModel.includes(`/${requiredModel}:`) ||
    installedModel.endsWith(`/${requiredModel}`)
  );
}

async function resolveEmbedModelName() {
  if (resolvedEmbedModel) {
    return resolvedEmbedModel;
  }

  try {
    const modelCheck = await checkRequiredOllamaModels([OLLAMA_EMBED_MODEL]);
    const exactMatch = modelCheck.installed.find((name) => name === OLLAMA_EMBED_MODEL);
    if (exactMatch) {
      resolvedEmbedModel = exactMatch;
      return resolvedEmbedModel;
    }

    const taggedMatch = modelCheck.installed.find((name) => {
      return matchesRequiredModel(name, OLLAMA_EMBED_MODEL);
    });
    if (taggedMatch) {
      resolvedEmbedModel = taggedMatch;
      return resolvedEmbedModel;
    }
  } catch {
    return OLLAMA_EMBED_MODEL;
  }

  return OLLAMA_EMBED_MODEL;
}

export async function generateEmbedding(input: EmbeddingInput): Promise<number[]> {
  const timeoutMs = input.timeoutMs ?? 45_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const modelName = await resolveEmbedModelName();
    const response = await fetch(`${getOllamaApiBaseUrl()}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        input: formatEmbeddingInput(input.title, input.content),
        dimensions: EMBEDDING_DIMENSIONS,
        options: { dimensions: EMBEDDING_DIMENSIONS },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 404 && isModelMissing(text)) {
        throw new Error(OLLAMA_MODEL_MISSING_MESSAGE);
      }

      if (isModelMissing(text)) {
        throw new Error(OLLAMA_MODEL_MISSING_MESSAGE);
      }

      throw new Error(
        `Ollama embed API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`,
      );
    }

    const data = await response.json();
    return extractEmbedding(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Ollama embedding request timed out after ${timeoutMs}ms.`);
    }

    const message = toErrorMessage(error);
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|Failed to fetch/i.test(message)) {
      throw new Error(OLLAMA_UNREACHABLE_MESSAGE);
    }

    if (isModelMissing(message)) {
      throw new Error(OLLAMA_MODEL_MISSING_MESSAGE);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkRequiredOllamaModels(
  requiredModels: readonly string[] = REQUIRED_OLLAMA_MODELS,
): Promise<OllamaModelCheckResult> {
  try {
    const { stdout } = await execFileAsync("ollama", ["list"]);
    const lines = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(1);

    const installed = lines
      .map((line) => line.split(/\s+/)[0])
      .filter((name): name is string => Boolean(name));

    const missing = requiredModels.filter(
      (model) => !installed.some((installedModel) => matchesRequiredModel(installedModel, model)),
    );

    return { installed, missing };
  } catch (error) {
    const message = toErrorMessage(error);
    if (/ENOENT|not found/i.test(message)) {
      throw new Error("ollama command not found. Install Ollama first.");
    }

    throw new Error(`Failed to run "ollama list": ${message}`);
  }
}

export async function assertRequiredOllamaModels(
  requiredModels: readonly string[] = REQUIRED_OLLAMA_MODELS,
): Promise<void> {
  const result = await checkRequiredOllamaModels(requiredModels);
  if (result.missing.length === 0) {
    return;
  }

  if (result.missing.includes(OLLAMA_EMBED_MODEL)) {
    throw new Error(OLLAMA_MODEL_MISSING_MESSAGE);
  }

  throw new Error(`Missing Ollama model(s): ${result.missing.join(", ")}. Run: ollama pull <model>`);
}
