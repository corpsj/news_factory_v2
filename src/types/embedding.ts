export const EMBEDDING_DIMENSIONS = 1024;
export const DEFAULT_EMBED_MODEL = "openai/text-embedding-3-small";

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
