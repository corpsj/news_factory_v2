import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { embedCollectedPressReleases } from "@/lib/ai/batch-embed";

type CliOptions = {
  limit?: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--limit" && next) {
      options.limit = Number(next);
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

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const result = await embedCollectedPressReleases(supabase, {
    limit: Number.isFinite(options.limit) && (options.limit ?? 0) > 0 ? options.limit : undefined,
  });

  console.log("Embedding batch completed.");
  console.log(`Total=${result.total} Embedded=${result.embedded} Failed=${result.failed}`);

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Embedding pipeline failed:", error);
  process.exitCode = 1;
});
