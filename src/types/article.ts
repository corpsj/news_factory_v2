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

export type BatchGenerateOptions = {
  limit?: number;
  verbose?: boolean;
};

export type BatchGenerateResult = {
  total: number;
  generated: number;
  failed: number;
};
