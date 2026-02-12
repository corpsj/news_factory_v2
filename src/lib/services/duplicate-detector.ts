import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/ai/embedding";
import { searchSimilarPressReleases } from "@/lib/db/vector-search";

const DUPLICATE_THRESHOLD = 0.92;
const SIMILAR_THRESHOLD = 0.80;

export type DuplicateCheckLevel = "duplicate" | "similar" | "unique";

export type ContentDuplicateResult = {
  level: DuplicateCheckLevel;
  similarity: number;
  matchedId: string | null;
  matchedTitle: string | null;
};

/**
 * Check if a press release is a duplicate or similar to existing ones.
 *
 * - similarity > 0.92 → "duplicate" (skip)
 * - similarity 0.80-0.92 → "similar" (flag for review)
 * - similarity < 0.80 → "unique" (proceed)
 */
export async function detectDuplicate(
  title: string,
  content: string,
  client?: SupabaseClient,
): Promise<ContentDuplicateResult> {
  const queryText = `${title}\n\n${content}`;

  const matches = await searchSimilarPressReleases(queryText, SIMILAR_THRESHOLD, 1, client);
  const topMatch = matches[0];

  if (!topMatch) {
    return { level: "unique", similarity: 0, matchedId: null, matchedTitle: null };
  }

  const level: DuplicateCheckLevel =
    topMatch.similarity >= DUPLICATE_THRESHOLD
      ? "duplicate"
      : topMatch.similarity >= SIMILAR_THRESHOLD
        ? "similar"
        : "unique";

  return {
    level,
    similarity: topMatch.similarity,
    matchedId: topMatch.id,
    matchedTitle: topMatch.title,
  };
}

export type DuplicateDetectionStats = {
  checked: number;
  duplicates: number;
  similar: number;
  unique: number;
};

export async function batchDetectDuplicates(
  items: Array<{ id: string; title: string; content: string }>,
  client?: SupabaseClient,
): Promise<{
  results: Map<string, ContentDuplicateResult>;
  stats: DuplicateDetectionStats;
}> {
  const results = new Map<string, ContentDuplicateResult>();
  const stats: DuplicateDetectionStats = { checked: 0, duplicates: 0, similar: 0, unique: 0 };

  for (const item of items) {
    const result = await detectDuplicate(item.title, item.content, client);
    results.set(item.id, result);
    stats.checked += 1;

    switch (result.level) {
      case "duplicate":
        stats.duplicates += 1;
        console.log(
          `Duplicate detected (similarity: ${result.similarity.toFixed(2)}), skipping "${item.title.slice(0, 50)}"`,
        );
        break;
      case "similar":
        stats.similar += 1;
        console.log(
          `Similar content (similarity: ${result.similarity.toFixed(2)}) for "${item.title.slice(0, 50)}"`,
        );
        break;
      case "unique":
        stats.unique += 1;
        break;
    }
  }

  return { results, stats };
}
