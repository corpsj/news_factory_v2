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

interface PressRelease {
  source: string;
  images: unknown;
}

interface SourceStats {
  source: string;
  total: number;
  with_images: number;
  percentage: string;
}

async function main() {
  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );

  console.log("Image Coverage by Source (press_releases)");
  console.log("==========================================\n");

  // Fetch all press releases with source and images
  const { data, error } = await supabase
    .from("press_releases")
    .select("source, images");

  if (error) {
    console.error("Failed to fetch press releases:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No press releases found.");
    process.exit(0);
  }

  // Aggregate stats by source
  const statsBySource = new Map<string, { total: number; with_images: number }>();

  for (const row of data as PressRelease[]) {
    const source = row.source || "Unknown";
    const images = row.images;

    // Check if images array has content
    const hasImages =
      Array.isArray(images) && images.length > 0;

    if (!statsBySource.has(source)) {
      statsBySource.set(source, { total: 0, with_images: 0 });
    }

    const stats = statsBySource.get(source)!;
    stats.total += 1;
    if (hasImages) {
      stats.with_images += 1;
    }
  }

  // Convert to sorted array and format
  const results: SourceStats[] = Array.from(statsBySource.entries())
    .map(([source, stats]) => ({
      source,
      total: stats.total,
      with_images: stats.with_images,
      percentage: ((stats.with_images / stats.total) * 100).toFixed(1) + "%",
    }))
    .sort((a, b) => a.source.localeCompare(b.source));

  // Print table header
  console.log("Source          Total  With Images  Coverage");
  console.log("─".repeat(50));

  // Print rows
  for (const row of results) {
    const source = row.source.padEnd(15);
    const total = String(row.total).padStart(5);
    const withImages = String(row.with_images).padStart(11);
    const percentage = row.percentage.padStart(8);
    console.log(`${source} ${total}  ${withImages}  ${percentage}`);
  }

  // Print summary
  console.log("─".repeat(50));
  const totalAll = results.reduce((sum, r) => sum + r.total, 0);
  const withImagesAll = results.reduce((sum, r) => sum + r.with_images, 0);
  const percentageAll = ((withImagesAll / totalAll) * 100).toFixed(1) + "%";

  const totalStr = String(totalAll).padStart(5);
  const withImagesStr = String(withImagesAll).padStart(11);
  const percentageStr = percentageAll.padStart(8);
  console.log(`${"TOTAL".padEnd(15)} ${totalStr}  ${withImagesStr}  ${percentageStr}`);
  console.log("─".repeat(50));
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
