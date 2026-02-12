import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { runCrawler } from "@/lib/crawl/crawler";

type CliOptions = {
  site?: string;
  sites?: string;
  limit?: number;
  delay?: number;
  concurrency?: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--site" && next) {
      options.site = next;
      index += 1;
      continue;
    }

    if (arg === "--sites" && next) {
      options.sites = next;
      index += 1;
      continue;
    }

    if (arg === "--limit" && next) {
      options.limit = Number(next);
      index += 1;
      continue;
    }

    if (arg === "--delay" && next) {
      options.delay = Number(next);
      index += 1;
      continue;
    }

    if (arg === "--concurrency" && next) {
      options.concurrency = Number(next);
      index += 1;
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
  const requestedSites = options.site
    ? [options.site]
    : options.sites
      ? options.sites
          .split(",")
          .map((siteId) => siteId.trim())
          .filter(Boolean)
      : undefined;

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const result = await runCrawler(
    {
      siteIds: requestedSites,
      limitPerSite: Number.isFinite(options.limit) && (options.limit ?? 0) > 0 ? options.limit : 5,
      delayMs: Number.isFinite(options.delay) && (options.delay ?? -1) >= 0 ? options.delay : 900,
      siteConcurrency:
        Number.isFinite(options.concurrency) && (options.concurrency ?? 0) > 0
          ? options.concurrency
          : 5,
    },
    { supabase },
  );

  console.log("Crawl completed.");
  console.log(
    `Sites=${result.totalSites} Found=${result.totalFound} Inserted=${result.totalInserted} Failed=${result.totalFailed}`,
  );

  const hasFailure = result.results.some((site) => site.status !== "success");
  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Crawler failed:", error);
  process.exitCode = 1;
});
