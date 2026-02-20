import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runCrawler } from "@/lib/crawl/crawler";
import { embedCollectedPressReleases, type BatchEmbedResult } from "@/lib/ai/batch-embed";
import { generateEmbeddedPressReleaseArticles } from "@/lib/ai/batch-generate";
import type { BatchGenerateResult } from "@/types/article";
import type { CrawlRunResult } from "@/types/crawler";

export type PipelineStage = "crawl" | "embed" | "generate";

export type PipelineStageLog = {
  stage: PipelineStage;
  status: "success" | "failed";
  durationMs: number;
  detail: string;
  errorMessage?: string;
};

export type PipelineOptions = {
  siteIds?: string[];
  limitPerSite?: number;
  maxPages?: number;
  dateRange?: { from: string; to: string };
  delayMs?: number;
  embedLimit?: number;
  generateLimit?: number;
  siteConcurrency?: number;
  verbose?: boolean;
  supabase?: SupabaseClient;
};

export type PipelineResult = {
  success: boolean;
  stages: PipelineStageLog[];
  crawl?: CrawlRunResult;
  embed?: BatchEmbedResult;
  generate?: BatchGenerateResult;
  totalDurationMs: number;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabaseClient(client?: SupabaseClient): SupabaseClient {
  if (client) return client;
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function writePipelineLog(
  supabase: SupabaseClient,
  log: PipelineStageLog,
): Promise<void> {
  const { error } = await supabase.from("crawl_logs").insert({
    site_name: `pipeline:${log.stage}`,
    site_url: "",
    status: log.status,
    articles_found: 0,
    articles_new: 0,
    error_message: log.errorMessage ?? null,
    started_at: new Date(Date.now() - log.durationMs).toISOString(),
    completed_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`Failed to write pipeline log for ${log.stage}: ${error.message}`);
  }
}

async function runCrawlStage(
  supabase: SupabaseClient,
  options: PipelineOptions,
): Promise<{ log: PipelineStageLog; result: CrawlRunResult }> {
  const start = Date.now();
  const verbose = options.verbose ?? false;

  if (verbose) console.log("Phase 1: Crawling...");

  try {
    const result = await runCrawler(
      {
        siteIds: options.siteIds,
        limitPerSite: options.limitPerSite ?? 5,
        maxPages: options.maxPages ?? 5,
        dateRange: options.dateRange,
        delayMs: options.delayMs ?? 200,
        siteConcurrency: options.siteConcurrency ?? 15,
      },
      { supabase },
    );

    const durationMs = Date.now() - start;
    const detail = `Sites=${result.totalSites} Found=${result.totalFound} Inserted=${result.totalInserted} Failed=${result.totalFailed}`;

    if (verbose) console.log(`  Crawl done (${durationMs}ms): ${detail}`);

    const log: PipelineStageLog = {
      stage: "crawl",
      status: result.totalFailed > 0 && result.totalInserted === 0 ? "failed" : "success",
      durationMs,
      detail,
    };

    return { log, result };
  } catch (error) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : "Unknown crawl error";

    const log: PipelineStageLog = {
      stage: "crawl",
      status: "failed",
      durationMs,
      detail: "Crawl stage threw an exception",
      errorMessage: message,
    };

    return {
      log,
      result: { totalSites: 0, totalFound: 0, totalInserted: 0, totalFailed: 0, results: [] },
    };
  }
}

async function runEmbedStage(
  supabase: SupabaseClient,
  options: PipelineOptions,
): Promise<{ log: PipelineStageLog; result: BatchEmbedResult }> {
  const start = Date.now();
  const verbose = options.verbose ?? false;

  if (verbose) console.log("Phase 2: Embedding...");

  try {
    const result = await embedCollectedPressReleases(supabase, {
      limit: options.embedLimit ?? 50,
    });

    const durationMs = Date.now() - start;
    const detail = `Total=${result.total} Embedded=${result.embedded} Failed=${result.failed}`;

    if (verbose) console.log(`  Embed done (${durationMs}ms): ${detail}`);

    const log: PipelineStageLog = {
      stage: "embed",
      status: result.failed > 0 && result.embedded === 0 ? "failed" : "success",
      durationMs,
      detail,
    };

    return { log, result };
  } catch (error) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : "Unknown embed error";

    const log: PipelineStageLog = {
      stage: "embed",
      status: "failed",
      durationMs,
      detail: "Embed stage threw an exception",
      errorMessage: message,
    };

    return { log, result: { total: 0, embedded: 0, failed: 0 } };
  }
}

async function runGenerateStage(
  supabase: SupabaseClient,
  options: PipelineOptions,
): Promise<{ log: PipelineStageLog; result: BatchGenerateResult }> {
  const start = Date.now();
  const verbose = options.verbose ?? false;

  if (verbose) console.log("Phase 3: Generating...");

  try {
    const result = await generateEmbeddedPressReleaseArticles(
      {
        limit: options.generateLimit ?? 20,
        verbose,
      },
      supabase,
    );

    const durationMs = Date.now() - start;
    const detail = `Total=${result.total} Generated=${result.generated} Failed=${result.failed}`;

    if (verbose) console.log(`  Generate done (${durationMs}ms): ${detail}`);

    const log: PipelineStageLog = {
      stage: "generate",
      status: result.failed > 0 && result.generated === 0 ? "failed" : "success",
      durationMs,
      detail,
    };

    return { log, result };
  } catch (error) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : "Unknown generate error";

    const log: PipelineStageLog = {
      stage: "generate",
      status: "failed",
      durationMs,
      detail: "Generate stage threw an exception",
      errorMessage: message,
    };

    return { log, result: { total: 0, generated: 0, failed: 0 } };
  }
}

let running = false;

export async function executePipeline(options: PipelineOptions = {}): Promise<PipelineResult> {
  if (running) {
    throw new Error("Pipeline is already running — refusing to start a new execution");
  }

  running = true;
  const pipelineStart = Date.now();
  const stages: PipelineStageLog[] = [];

  try {
    const supabase = getSupabaseClient(options.supabase);

    const crawl = await runCrawlStage(supabase, options);
    stages.push(crawl.log);
    await writePipelineLog(supabase, crawl.log);

    const embed = await runEmbedStage(supabase, options);
    stages.push(embed.log);
    await writePipelineLog(supabase, embed.log);

    const generate = await runGenerateStage(supabase, options);
    stages.push(generate.log);
    await writePipelineLog(supabase, generate.log);

    const allSuccess = stages.every((s) => s.status === "success");

    return {
      success: allSuccess,
      stages,
      crawl: crawl.result,
      embed: embed.result,
      generate: generate.result,
      totalDurationMs: Date.now() - pipelineStart,
    };
  } finally {
    running = false;
  }
}

export function isPipelineRunning(): boolean {
  return running;
}
