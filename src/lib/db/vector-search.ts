import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DuplicateCheckResult, SimilarPressRelease } from "@/types/embedding";
import { generateEmbedding } from "@/lib/ai/embedding";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabaseClient(client?: SupabaseClient) {
  if (client) {
    return client;
  }

  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function searchSimilarPressReleases(
  text: string,
  threshold = 0.85,
  limit = 5,
  client?: SupabaseClient,
): Promise<SimilarPressRelease[]> {
  const query = text.trim();
  if (!query) {
    return [];
  }

  const embedding = await generateEmbedding({ title: query, content: "" });

  const supabase = getSupabaseClient(client);
  const response = await supabase.rpc("match_press_releases", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
  });

  if (response.error) {
    throw new Error(`match_press_releases RPC failed: ${response.error.message}`);
  }

  return (response.data ?? []) as SimilarPressRelease[];
}

export async function checkDuplicate(
  text: string,
  threshold = 0.92,
  client?: SupabaseClient,
): Promise<DuplicateCheckResult> {
  const matches = await searchSimilarPressReleases(text, threshold, 1, client);
  const match = matches[0];

  if (!match) {
    return {
      isDuplicate: false,
      similarity: 0,
      matchedId: null,
    };
  }

  return {
    isDuplicate: true,
    similarity: match.similarity,
    matchedId: match.id,
  };
}
