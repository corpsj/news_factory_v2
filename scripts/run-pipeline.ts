import { loadEnvConfig } from "@next/env";
import { executePipeline } from "@/lib/pipeline/orchestrator";

type CliOptions = {
  sites?: string;
  limit?: number;
  maxPages?: number;
  dateFrom?: string;
  dateTo?: string;
  delay?: number;
  publishLimit?: number;
  concurrency?: number;
  verbose: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { verbose: true };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

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

    if (arg === "--max-pages" && next) {
      options.maxPages = Number(next);
      index += 1;
      continue;
    }

    if (arg === "--date-from" && next) {
      options.dateFrom = next;
      index += 1;
      continue;
    }

    if (arg === "--date-to" && next) {
      options.dateTo = next;
      index += 1;
      continue;
    }

    if (arg === "--delay" && next) {
      options.delay = Number(next);
      index += 1;
      continue;
    }

    if (arg === "--publish-limit" && next) {
      options.publishLimit = Number(next);
      index += 1;
      continue;
    }

    if (arg === "--concurrency" && next) {
      options.concurrency = Number(next);
      index += 1;
      continue;
    }

    if (arg === "--quiet") {
      options.verbose = false;
    }
  }

  return options;
}

function positiveInt(value?: number): number | undefined {
  if (Number.isFinite(value) && (value ?? 0) > 0) return value;
  return undefined;
}

async function main() {
  loadEnvConfig(process.cwd());

  const options = parseArgs(process.argv.slice(2));

  const siteIds = options.sites
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const dateRange =
    options.dateFrom && options.dateTo
      ? { from: options.dateFrom, to: options.dateTo }
      : undefined;

  console.log("=== News Factory v2 — Full Pipeline ===\n");

  const result = await executePipeline({
    siteIds: siteIds && siteIds.length > 0 ? siteIds : undefined,
    limitPerSite: positiveInt(options.limit) ?? 5,
    maxPages: positiveInt(options.maxPages) ?? 5,
    dateRange,
    delayMs: positiveInt(options.delay) ?? 200,
    publishLimit: positiveInt(options.publishLimit) ?? 500,
    siteConcurrency: positiveInt(options.concurrency) ?? 15,
    verbose: options.verbose,
  });

  console.log("\n=== Pipeline Complete ===");
  console.log(`Success: ${result.success}`);
  console.log(`Duration: ${result.totalDurationMs}ms`);

  for (const stage of result.stages) {
    const errorSuffix = stage.errorMessage ? ` (${stage.errorMessage})` : "";
    console.log(`  [${stage.stage}] ${stage.status} — ${stage.detail}${errorSuffix}`);
  }

  if (!result.success) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Pipeline failed:", error);
  process.exitCode = 1;
});
