import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runCrawler } from "@/lib/crawl/crawler";
import { embedCollectedPressReleases } from "@/lib/ai/batch-embed";
import { generateEmbeddedPressReleaseArticles } from "@/lib/ai/batch-generate";
import type { CrawlOptions, CrawlSiteResult } from "@/types/crawler";

export type ManualCrawlOptions = {
  siteIds?: string[];
  limitPerSite?: number;
  maxPages?: number;
  dateRange?: { from: string; to: string };
  delayMs?: number;
};

export type PipelineEvent =
  | { type: "pipeline_start"; totalSites: number; siteIds: string[]; siteNames: string[] }
  | { type: "stage_start"; stage: "crawl" | "embed" | "generate" }
  | { type: "site_complete"; siteId: string; siteName: string; found: number; inserted: number; failed: number; status: string; durationMs: number; errorMessage?: string }
  | { type: "stage_complete"; stage: "crawl" | "embed" | "generate"; durationMs: number; detail: Record<string, unknown> }
  | { type: "pipeline_complete"; success: boolean; totalDurationMs: number }
  | { type: "error"; message: string };

export type ManualCrawlResult = {
  success: boolean;
  totalDurationMs: number;
  stages: {
    crawl: { status: "success" | "failed" | "skipped"; durationMs: number; detail: object };
    embed: { status: "success" | "failed" | "skipped"; durationMs: number; detail: object };
    generate: { status: "success" | "failed" | "skipped"; durationMs: number; detail: object };
  };
  error?: string;
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

let manualRunning = false;

export async function executeManualCrawl(
  options: ManualCrawlOptions = {},
  onProgress?: (event: PipelineEvent) => void,
): Promise<ManualCrawlResult> {
  if (manualRunning) {
    onProgress?.({ type: "error", message: "Manual crawl already in progress" });
    return {
      success: false,
      totalDurationMs: 0,
      stages: {
        crawl: { status: "skipped", durationMs: 0, detail: {} },
        embed: { status: "skipped", durationMs: 0, detail: {} },
        generate: { status: "skipped", durationMs: 0, detail: {} },
      },
      error: "Manual crawl already in progress",
    };
  }

  manualRunning = true;
  const pipelineStart = Date.now();

  try {
    const supabase = getSupabaseClient();

    const { SITES, SITES_BY_ID } = await import("@/config/sites");
    const targetSites =
      options.siteIds && options.siteIds.length > 0
        ? options.siteIds.map((id) => SITES_BY_ID.get(id)).filter(Boolean)
        : SITES;

    onProgress?.({
      type: "pipeline_start",
      totalSites: targetSites.length,
      siteIds: targetSites.map((s) => s!.id),
      siteNames: targetSites.map((s) => s!.name),
    });

    // Stage 1: Crawl
    onProgress?.({ type: "stage_start", stage: "crawl" });
    const crawlStart = Date.now();
    let crawlStatus: "success" | "failed" | "skipped" = "success";
    let crawlDetail: object = {};

    try {
      const crawlOptions: CrawlOptions = {
        siteIds: options.siteIds,
        limitPerSite: options.limitPerSite,
        maxPages: options.maxPages,
        dateRange: options.dateRange,
        delayMs: options.delayMs,
      };

      const onSiteComplete = (result: CrawlSiteResult) => {
        onProgress?.({
          type: "site_complete",
          siteId: result.siteId,
          siteName: result.siteName,
          found: result.found,
          inserted: result.inserted,
          failed: result.failed,
          status: result.status,
          durationMs: Date.now() - crawlStart,
          errorMessage: result.errorMessage,
        });
      };

      const crawlResult = await runCrawler(crawlOptions, { supabase }, onSiteComplete);

      crawlDetail = {
        totalSites: crawlResult.totalSites,
        totalFound: crawlResult.totalFound,
        totalInserted: crawlResult.totalInserted,
        totalFailed: crawlResult.totalFailed,
      };
    } catch (error) {
      crawlStatus = "failed";
      crawlDetail = {
        error: error instanceof Error ? error.message : "Unknown crawl error",
      };
    }

    const crawlDurationMs = Date.now() - crawlStart;
    onProgress?.({ type: "stage_complete", stage: "crawl", durationMs: crawlDurationMs, detail: crawlDetail as Record<string, unknown> });

    // Stage 2: Embed
    onProgress?.({ type: "stage_start", stage: "embed" });
    const embedStart = Date.now();
    let embedStatus: "success" | "failed" | "skipped" = "success";
    let embedDetail: object = {};

    try {
      const embedResult = await embedCollectedPressReleases(supabase, { limit: 500 });

      embedDetail = {
        total: embedResult.total,
        embedded: embedResult.embedded,
        failed: embedResult.failed,
      };
    } catch (error) {
      embedStatus = "failed";
      embedDetail = {
        error: error instanceof Error ? error.message : "Unknown embed error",
      };
    }

    const embedDurationMs = Date.now() - embedStart;
    onProgress?.({ type: "stage_complete", stage: "embed", durationMs: embedDurationMs, detail: embedDetail as Record<string, unknown> });

    // Stage 3: Generate
    onProgress?.({ type: "stage_start", stage: "generate" });
    const generateStart = Date.now();
    let generateStatus: "success" | "failed" | "skipped" = "success";
    let generateDetail: object = {};

    try {
      const generateResult = await generateEmbeddedPressReleaseArticles(
        { limit: 500 },
        supabase,
      );

      generateDetail = {
        total: generateResult.total,
        generated: generateResult.generated,
        failed: generateResult.failed,
      };
    } catch (error) {
      generateStatus = "failed";
      generateDetail = {
        error: error instanceof Error ? error.message : "Unknown generate error",
      };
    }

    const generateDurationMs = Date.now() - generateStart;
    onProgress?.({ type: "stage_complete", stage: "generate", durationMs: generateDurationMs, detail: generateDetail as Record<string, unknown> });

    const totalDurationMs = Date.now() - pipelineStart;

    onProgress?.({ type: "pipeline_complete", success: true, totalDurationMs });

    return {
      success: true,
      totalDurationMs,
      stages: {
        crawl: { status: crawlStatus, durationMs: crawlDurationMs, detail: crawlDetail },
        embed: { status: embedStatus, durationMs: embedDurationMs, detail: embedDetail },
        generate: { status: generateStatus, durationMs: generateDurationMs, detail: generateDetail },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    onProgress?.({ type: "error", message });
    return {
      success: false,
      totalDurationMs: Date.now() - pipelineStart,
      stages: {
        crawl: { status: "failed", durationMs: 0, detail: {} },
        embed: { status: "skipped", durationMs: 0, detail: {} },
        generate: { status: "skipped", durationMs: 0, detail: {} },
      },
      error: message,
    };
  } finally {
    manualRunning = false;
  }
}
