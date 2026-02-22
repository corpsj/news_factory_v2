export const EMBEDDING_DIMENSIONS = 1024;
export const DEFAULT_EMBED_MODEL = "openai/text-embedding-3-small";

export type EmbeddingInput = {
  title: string;
  content: string;
  timeoutMs?: number;
};
