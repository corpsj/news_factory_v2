import type { SupabaseClient } from "@supabase/supabase-js";
import { searchSimilarPressReleases } from "@/lib/db/vector-search";
import type { PressReleaseForArticleGeneration, RagReference } from "@/types/article";

const MIN_RAG_RESULTS = 3;
const MAX_RAG_RESULTS = 5;

function buildExcerpt(content: string, maxLength = 220) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

export type RagContextResult = {
  count: number;
  references: RagReference[];
};

export async function fetchRagContextForPressRelease(
  pressRelease: PressReleaseForArticleGeneration,
  client?: SupabaseClient,
): Promise<RagContextResult> {
  const queryText = `${pressRelease.title}\n\n${pressRelease.content}`;

  const primaryMatches = await searchSimilarPressReleases(queryText, 0.72, MAX_RAG_RESULTS + 1, client);

  const withoutSelf = primaryMatches.filter((match) => match.id !== pressRelease.id);

  const selected = withoutSelf.slice(0, MAX_RAG_RESULTS);
  if (selected.length < MIN_RAG_RESULTS && withoutSelf.length > selected.length) {
    selected.push(...withoutSelf.slice(selected.length, MIN_RAG_RESULTS));
  }

  const references = selected.map((match) => ({
    id: match.id,
    title: match.title,
    source: match.source,
    published_at: match.published_at,
    similarity: match.similarity,
    content_excerpt: buildExcerpt(match.content),
  }));

  return {
    count: references.length,
    references,
  };
}
