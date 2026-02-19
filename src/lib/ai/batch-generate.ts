import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { fetchRagContextForPressRelease } from "@/lib/ai/rag";
import { generateArticleWithOllama } from "@/lib/ai/ollama";
import type {
  BatchGenerateOptions,
  BatchGenerateResult,
  PressReleaseForArticleGeneration,
} from "@/types/article";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeLimit(limit?: number) {
  if (!Number.isFinite(limit)) {
    return 10;
  }
  return Math.max(1, Math.floor(limit as number));
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

async function fetchEmbeddedPressReleases(supabase: SupabaseClient, limit: number) {
  const response = await supabase
    .from("press_releases")
    .select("id,source,title,content,link,images,published_at")
    .eq("status", "embedded")
    .order("published_at", { ascending: true })
    .limit(limit);

  if (response.error) {
    throw new Error(`Failed to fetch embedded press releases: ${response.error.message}`);
  }

  return (response.data ?? []) as PressReleaseForArticleGeneration[];
}

async function saveGeneratedArticle(
  supabase: SupabaseClient,
  pressRelease: PressReleaseForArticleGeneration,
  generated: Awaited<ReturnType<typeof generateArticleWithOllama>>,
) {
  const insertResponse = await supabase.from("articles").insert({
    press_release_id: pressRelease.id,
    title: generated.title,
    subtitle: generated.subtitle,
    body: generated.body,
    images: pressRelease.images,
    category: generated.category,
    source: pressRelease.source,
    source_url: pressRelease.link,
    status: "generated",
  });

  if (insertResponse.error) {
    throw new Error(`Failed to insert article: ${insertResponse.error.message}`);
  }
}

async function markPressReleaseProcessed(supabase: SupabaseClient, pressReleaseId: string) {
  const updateResponse = await supabase
    .from("press_releases")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", pressReleaseId);

  if (updateResponse.error) {
    throw new Error(`Failed to update press_release status: ${updateResponse.error.message}`);
  }
}

export async function generateSingleArticle(
  pressReleaseId: string,
  client?: SupabaseClient,
  options: Pick<BatchGenerateOptions, "verbose"> = {},
) {
  const supabase = getSupabaseClient(client);

  const response = await supabase
    .from("press_releases")
    .select("id,source,title,content,link,images,published_at,status")
    .eq("id", pressReleaseId)
    .single();

  if (response.error || !response.data) {
    throw new Error("Press release not found");
  }

  if (response.data.status !== "embedded") {
    throw new Error(`Press release status must be 'embedded' but got '${response.data.status}'`);
  }

  const pressRelease = response.data as PressReleaseForArticleGeneration;

  const rag = await fetchRagContextForPressRelease(pressRelease, supabase);
  if (options.verbose) {
    console.log(`Found ${rag.count} related press releases for context`);
  }

  const generated = await generateArticleWithOllama({
    pressRelease,
    ragReferences: rag.references,
  });

  if (options.verbose) {
    console.log("Article generated with RAG context");
  }

  await saveGeneratedArticle(supabase, pressRelease, generated);
  await markPressReleaseProcessed(supabase, pressRelease.id);

  return {
    pressRelease,
    generated,
    ragCount: rag.count,
  };
}

export async function generateEmbeddedPressReleaseArticles(
  options: BatchGenerateOptions = {},
  client?: SupabaseClient,
): Promise<BatchGenerateResult> {
  const supabase = getSupabaseClient(client);
  const limit = normalizeLimit(options.limit);
  const queue = await fetchEmbeddedPressReleases(supabase, limit);

  let generated = 0;
  let failed = 0;

  for (const pressRelease of queue) {
    try {
      const rag = await fetchRagContextForPressRelease(pressRelease, supabase);
      if (options.verbose) {
        console.log(`Found ${rag.count} related press releases for context`);
      }

      const article = await generateArticleWithOllama({
        pressRelease,
        ragReferences: rag.references,
      });
      if (options.verbose) {
        console.log("Article generated with RAG context");
      }

      await saveGeneratedArticle(supabase, pressRelease, article);
      await markPressReleaseProcessed(supabase, pressRelease.id);
      generated += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown generation error";
      console.error(`Failed article generation ${pressRelease.id}: ${message}`);
    }
  }

  return {
    total: queue.length,
    generated,
    failed,
  };
}
