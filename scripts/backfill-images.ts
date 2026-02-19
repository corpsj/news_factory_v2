import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  try {
    const envPath = resolve(".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=");
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  } catch (err) {
    // Silently ignore if .env.local doesn't exist
  }
}

loadEnvLocal();

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

interface Article {
  id: string;
  press_release_id: string | null;
  images: unknown;
}

interface PressRelease {
  id: string;
  images: unknown;
}

async function main() {
  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );

  console.log("Backfilling images from press_releases to articles...\n");

  // Step 1: Fetch all articles with their images and press_release_id
  const { data: articles, error: articlesErr } = await supabase
    .from("articles")
    .select("id, press_release_id, images");

  if (articlesErr) {
    console.error("Failed to fetch articles:", articlesErr.message);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log("No articles found.");
    process.exit(0);
  }

  // Step 2: Filter to articles with empty images
  const emptyArticles = (articles as Article[]).filter(
    (a) => Array.isArray(a.images) && a.images.length === 0,
  );

  console.log(`Total articles: ${articles.length}`);
  console.log(`Articles with empty images: ${emptyArticles.length}\n`);

  if (emptyArticles.length === 0) {
    console.log("No articles with empty images found. Nothing to backfill.");
    process.exit(0);
  }

  // Step 3: Get unique press_release_ids (filter out nulls)
  const prIds = [...new Set(emptyArticles.map((a) => a.press_release_id).filter(Boolean))];

  if (prIds.length === 0) {
    console.log("No press_release_ids found in articles with empty images.");
    process.exit(0);
  }

  console.log(`Fetching ${prIds.length} press_releases...\n`);

  // Step 4: Fetch all relevant press_releases in one query
  const { data: pressReleases, error: prErr } = await supabase
    .from("press_releases")
    .select("id, images")
    .in("id", prIds);

  if (prErr) {
    console.error("Failed to fetch press_releases:", prErr.message);
    process.exit(1);
  }

  if (!pressReleases || pressReleases.length === 0) {
    console.log("No press_releases found.");
    process.exit(0);
  }

  // Step 5: Build lookup map
  const prImageMap = new Map<string, unknown>(
    (pressReleases as PressRelease[]).map((pr) => [pr.id, pr.images]),
  );

  // Step 6: Update articles that have non-empty images in their press_release
  let updated = 0;
  let skipped = 0;

  for (const article of emptyArticles) {
    if (!article.press_release_id) {
      skipped++;
      continue;
    }

    const prImages = prImageMap.get(article.press_release_id);

    // Check if press_release has non-empty images
    if (Array.isArray(prImages) && prImages.length > 0) {
      const { error: updateErr } = await supabase
        .from("articles")
        .update({ images: prImages })
        .eq("id", article.id);

      if (updateErr) {
        console.error(`Failed to update article ${article.id}:`, updateErr.message);
        process.exit(1);
      }

      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`Updated ${updated} articles with images from press_releases`);
  console.log(`Skipped ${skipped} articles (no images in source press_release)`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
