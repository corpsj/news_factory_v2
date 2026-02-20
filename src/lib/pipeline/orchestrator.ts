import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runCrawler } from "@/lib/crawl/crawler";
import { generateEmbeddedPressReleaseArticles } from "@/lib/ai/batch-generate";
import type { BatchGenerateResult } from "@/types/article";
import type { CrawlRunResult } from "@/types/crawler";

export type PipelineStage = "crawl" | "publish";

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
  publishLimit?: number;
  siteConcurrency?: number;
  verbose?: boolean;
  supabase?: SupabaseClient;
};

export type PipelineResult = {
  success: boolean;
  stages: PipelineStageLog[];
  crawl?: CrawlRunResult;
  publish?: BatchGenerateResult;
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

async function runPublishStage(
  supabase: SupabaseClient,
  options: PipelineOptions,
): Promise<{ log: PipelineStageLog; result: BatchGenerateResult }> {
  const start = Date.now();
  const verbose = options.verbose ?? false;

  if (verbose) console.log("Phase 2: Publishing...");

  try {
    const result = await generateEmbeddedPressReleaseArticles(
      {
        limit: options.publishLimit ?? 500,
        verbose,
      },
      supabase,
    );

    const durationMs = Date.now() - start;
    const detail = `Total=${result.total} Published=${result.generated} Failed=${result.failed}`;

    if (verbose) console.log(`  Publish done (${durationMs}ms): ${detail}`);

    const log: PipelineStageLog = {
      stage: "publish",
      status: result.failed > 0 && result.generated === 0 ? "failed" : "success",
      durationMs,
      detail,
    };

    return { log, result };
  } catch (error) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : "Unknown publish error";

    const log: PipelineStageLog = {
      stage: "publish",
      status: "failed",
      durationMs,
      detail: "Publish stage threw an exception",
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

    const publish = await runPublishStage(supabase, options);
    stages.push(publish.log);
    await writePipelineLog(supabase, publish.log);

    const allSuccess = stages.every((s) => s.status === "success");

    return {
      success: allSuccess,
      stages,
      crawl: crawl.result,
      publish: publish.result,
      totalDurationMs: Date.now() - pipelineStart,
    };
  } finally {
    running = false;
  }
}

export function isPipelineRunning(): boolean {
  return running;
}
