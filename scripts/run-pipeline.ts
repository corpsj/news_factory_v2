import { loadEnvConfig } from "@next/env";
import { executePipeline } from "@/lib/pipeline/orchestrator";

type CliOptions = {
  limit?: number;
  embedLimit?: number;
  generateLimit?: number;
  concurrency?: number;
  verbose: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { verbose: true };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--limit" && next) {
      options.limit = Number(next);
      index += 1;
      continue;
    }

    if (arg === "--embed-limit" && next) {
      options.embedLimit = Number(next);
      index += 1;
      continue;
    }

    if (arg === "--generate-limit" && next) {
      options.generateLimit = Number(next);
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

  console.log("=== News Factory v2 — Full Pipeline ===\n");

  const result = await executePipeline({
    limitPerSite: positiveInt(options.limit) ?? 5,
    embedLimit: positiveInt(options.embedLimit) ?? 50,
    generateLimit: positiveInt(options.generateLimit) ?? 20,
    siteConcurrency: positiveInt(options.concurrency) ?? 5,
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
