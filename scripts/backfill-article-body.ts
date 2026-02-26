import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { contentToArticleBody } from "@/lib/ai/batch-generate";

type CliOptions = {
  dryRun: boolean;
  limit: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false, limit: 100 };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--limit" && next) {
      options.limit = Number(next);
      index += 1;
      continue;
    }
  }

  return options;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  loadEnvConfig(process.cwd());

  const options = parseArgs(process.argv.slice(2));

  console.log("=== Article Body Backfill ===");
  console.log(`Mode: ${options.dryRun ? "DRY RUN (no DB writes)" : "LIVE (will update DB)"}`);
  console.log(`Limit: ${options.limit}`);
  console.log("");

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  // Fetch articles with their press_release_id
  const { data: articles, error: fetchError } = await supabase
    .from("articles")
    .select("id, body, press_release_id")
    .order("created_at", { ascending: true })
    .limit(options.limit);

  if (fetchError) {
    throw new Error(`Failed to fetch articles: ${fetchError.message}`);
  }

  if (!articles || articles.length === 0) {
    console.log("No articles found. Nothing to do.");
    return;
  }

  console.log(`Found ${articles.length} article(s) to process.`);
  console.log("");

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i += 1) {
    const article = articles[i];

    try {
      // Fetch the press release content
      const { data: pressRelease, error: prError } = await supabase
        .from("press_releases")
        .select("content")
        .eq("id", article.press_release_id)
        .single();

      if (prError || !pressRelease) {
        console.warn(`[${i + 1}/${articles.length}] SKIP article ${article.id} — press release ${article.press_release_id} not found`);
        skipped += 1;
        continue;
      }

      const newBody = contentToArticleBody(pressRelease.content);

      // Guard: empty body would violate NOT NULL constraint
      if (!newBody) {
        console.warn(`[${i + 1}/${articles.length}] SKIP article ${article.id} — converted body is empty`);
        skipped += 1;
        continue;
      }

      if (options.dryRun) {
        console.log(`[${i + 1}/${articles.length}] article ${article.id}`);
        console.log(`  OLD body (${article.body?.length ?? 0} chars): ${(article.body ?? "").slice(0, 120)}...`);
        console.log(`  NEW body (${newBody.length} chars): ${newBody.slice(0, 120)}...`);
        console.log("");
        success += 1;
      } else {
        const { error: updateError } = await supabase
          .from("articles")
          .update({ body: newBody })
          .eq("id", article.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        success += 1;
      }

      // Progress log every 10 items
      if ((i + 1) % 10 === 0) {
        console.log(`Progress: ${i + 1}/${articles.length} processed (${success} ok, ${skipped} skipped, ${failed} failed)`);
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[${i + 1}/${articles.length}] FAIL article ${article.id}: ${message}`);
    }
  }

  console.log("");
  console.log("=== Summary ===");
  console.log(`Total:   ${articles.length}`);
  console.log(`Success: ${success}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failed}`);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exitCode = 1;
});
