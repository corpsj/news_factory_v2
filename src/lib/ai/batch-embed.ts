import type { SupabaseClient } from "@supabase/supabase-js";
import { EMBEDDING_DIMENSIONS } from "@/types/embedding";
import { generateEmbedding } from "@/lib/ai/embedding";

type BatchEmbedOptions = {
  limit?: number;
};

type PressReleaseForEmbedding = {
  id: string;
  title: string;
  content: string;
};

export type BatchEmbedResult = {
  total: number;
  embedded: number;
  failed: number;
};

function normalizeLimit(limit?: number) {
  if (!Number.isFinite(limit)) {
    return 10;
  }

  return Math.max(1, Math.floor(limit as number));
}

async function fetchPendingEmbeddings(supabase: SupabaseClient, limit: number) {
  const response = await supabase
    .from("press_releases")
    .select("id,title,content")
    .eq("status", "collected")
    .is("embedding", null)
    .order("published_at", { ascending: true })
    .limit(limit);

  if (response.error) {
    throw new Error(`Failed to fetch pending press releases: ${response.error.message}`);
  }

  return (response.data ?? []) as PressReleaseForEmbedding[];
}

async function storeEmbedding(supabase: SupabaseClient, releaseId: string, embedding: number[]) {
  const response = await supabase
    .from("press_releases")
    .update({ embedding, status: "embedded" })
    .eq("id", releaseId);

  if (response.error) {
    throw new Error(`Failed to store embedding for ${releaseId}: ${response.error.message}`);
  }
}

export async function embedCollectedPressReleases(
  supabase: SupabaseClient,
  options: BatchEmbedOptions = {},
): Promise<BatchEmbedResult> {
  const limit = normalizeLimit(options.limit);
  const pending = await fetchPendingEmbeddings(supabase, limit);

  let embedded = 0;
  let failed = 0;

  for (const release of pending) {
    console.log(`Generating embedding for: ${release.title}`);

    try {
      const embedding = await generateEmbedding({
        title: release.title,
        content: release.content,
      });

      await storeEmbedding(supabase, release.id, embedding);
      embedded += 1;
      console.log(`Embedding stored (${EMBEDDING_DIMENSIONS} dimensions) for ${release.id}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown embedding error";
      console.error(`Failed embedding ${release.id}: ${message}`);
    }
  }

  return {
    total: pending.length,
    embedded,
    failed,
  };
}
