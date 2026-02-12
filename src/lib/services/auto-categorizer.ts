import type { SupabaseClient } from "@supabase/supabase-js";
import { ARTICLE_CATEGORIES, type ArticleCategory } from "@/types/article";
import { searchSimilarPressReleases } from "@/lib/db/vector-search";

const CATEGORIZATION_THRESHOLD = 0.75;
const NEIGHBOR_COUNT = 5;

type CategoryVote = {
  category: ArticleCategory;
  count: number;
  avgSimilarity: number;
};

export type CategorizationResult = {
  suggestedCategory: ArticleCategory | null;
  confidence: number;
  votes: CategoryVote[];
  method: "vector-knn";
};

export async function categorizeByVectorSimilarity(
  title: string,
  content: string,
  client?: SupabaseClient,
): Promise<CategorizationResult> {
  const queryText = `${title}\n\n${content}`;
  const neighbors = await searchSimilarPressReleases(queryText, CATEGORIZATION_THRESHOLD, NEIGHBOR_COUNT, client);

  if (neighbors.length === 0) {
    return { suggestedCategory: null, confidence: 0, votes: [], method: "vector-knn" };
  }

  const voteMap = new Map<string, { count: number; totalSimilarity: number }>();

  for (const neighbor of neighbors) {
    const existing = voteMap.get(neighbor.source) ?? { count: 0, totalSimilarity: 0 };
    existing.count += 1;
    existing.totalSimilarity += neighbor.similarity;
    voteMap.set(neighbor.source, existing);
  }

  const categoryVoteMap = new Map<ArticleCategory, { count: number; totalSimilarity: number }>();

  if (client) {
    const neighborIds = neighbors.map((n) => n.id);
    const { data: articles } = await client
      .from("articles")
      .select("category, press_release_id")
      .in("press_release_id", neighborIds);

    if (articles && articles.length > 0) {
      for (const article of articles) {
        const cat = article.category as ArticleCategory;
        if (!ARTICLE_CATEGORIES.includes(cat)) continue;

        const matchedNeighbor = neighbors.find((n) => n.id === article.press_release_id);
        const similarity = matchedNeighbor?.similarity ?? 0;

        const existing = categoryVoteMap.get(cat) ?? { count: 0, totalSimilarity: 0 };
        existing.count += 1;
        existing.totalSimilarity += similarity;
        categoryVoteMap.set(cat, existing);
      }
    }
  }

  const votes: CategoryVote[] = Array.from(categoryVoteMap.entries())
    .map(([category, data]) => ({
      category: category as ArticleCategory,
      count: data.count,
      avgSimilarity: data.totalSimilarity / data.count,
    }))
    .sort((a, b) => b.count - a.count || b.avgSimilarity - a.avgSimilarity);

  const topVote = votes[0];
  if (!topVote) {
    return { suggestedCategory: null, confidence: 0, votes: [], method: "vector-knn" };
  }

  const confidence = topVote.avgSimilarity * (topVote.count / neighbors.length);

  return {
    suggestedCategory: topVote.category,
    confidence,
    votes,
    method: "vector-knn",
  };
}

export function crossValidateCategory(
  aiCategory: ArticleCategory,
  vectorResult: CategorizationResult,
): { finalCategory: ArticleCategory; agreement: boolean } {
  if (!vectorResult.suggestedCategory || vectorResult.confidence < 0.5) {
    return { finalCategory: aiCategory, agreement: true };
  }

  const agreement = aiCategory === vectorResult.suggestedCategory;

  if (!agreement) {
    console.log(
      `Category mismatch: AI="${aiCategory}" vs Vector="${vectorResult.suggestedCategory}" (confidence: ${vectorResult.confidence.toFixed(2)})`,
    );
  }

  return { finalCategory: aiCategory, agreement };
}
