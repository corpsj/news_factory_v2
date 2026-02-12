import { loadEnvConfig } from "@next/env";
import { generateEmbeddedPressReleaseArticles } from "@/lib/ai/batch-generate";

type CliOptions = {
  limit?: number;
  verbose: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--limit" && next) {
      options.limit = Number(next);
      index += 1;
      continue;
    }

    if (arg === "--verbose") {
      options.verbose = true;
    }
  }

  return options;
}

async function main() {
  loadEnvConfig(process.cwd());

  const options = parseArgs(process.argv.slice(2));
  const result = await generateEmbeddedPressReleaseArticles({
    limit: Number.isFinite(options.limit) && (options.limit ?? 0) > 0 ? options.limit : undefined,
    verbose: options.verbose,
  });

  console.log("Article generation batch completed.");
  console.log(`Total=${result.total} Generated=${result.generated} Failed=${result.failed}`);

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Article generation pipeline failed:", error);
  process.exitCode = 1;
});
