export const OLLAMA_DEFAULT_API_URL = "http://localhost:11434";
export const OLLAMA_EMBED_MODEL = "qwen3-embedding";
export const EMBEDDING_DIMENSIONS = 1024;
export const REQUIRED_OLLAMA_MODELS = ["exaone4.0", OLLAMA_EMBED_MODEL] as const;

export type EmbeddingInput = {
  title: string;
  content: string;
  timeoutMs?: number;
};

export type SimilarPressRelease = {
  id: string;
  origin_id: string;
  source: string;
  title: string;
  content: string;
  link: string;
  images: unknown;
  attachments: unknown;
  published_at: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  similarity: number;
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  similarity: number;
  matchedId: string | null;
};

export type OllamaModelCheckResult = {
  installed: string[];
  missing: string[];
};
