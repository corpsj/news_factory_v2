export const ARTICLE_CATEGORIES = [
  "press_release",
  "economy",
  "politics",
  "society",
  "sports",
  "culture",
  "opinion",
  "editorial",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export type PressReleaseForArticleGeneration = {
  id: string;
  source: string;
  title: string;
  content: string;
  link: string;
  images: string[];
  published_at: string;
};

export type RagReference = {
  id: string;
  title: string;
  source: string;
  published_at: string;
  similarity: number;
  content_excerpt: string;
};

export type ArticleGenerationRequest = {
  pressRelease: PressReleaseForArticleGeneration;
  ragReferences: RagReference[];
};

export type GeneratedArticle = {
  title: string;
  title_candidates: [string, string, string];
  subtitle: string;
  summary_lines: [string, string, string];
  body: string;
  category: ArticleCategory;
};

export type BatchGenerateOptions = {
  limit?: number;
  verbose?: boolean;
};

export type BatchGenerateResult = {
  total: number;
  generated: number;
  failed: number;
};
