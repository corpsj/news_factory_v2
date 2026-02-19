import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runCrawler } from "@/lib/crawl/crawler";
import { embedCollectedPressReleases } from "@/lib/ai/batch-embed";
import { generateEmbeddedPressReleaseArticles } from "@/lib/ai/batch-generate";
import type { CrawlOptions } from "@/types/crawler";

export type ManualCrawlOptions = {
  siteIds?: string[];
  limitPerSite?: number;
  maxPages?: number;
  dateRange?: { from: string; to: string };
  delayMs?: number;
};

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
): Promise<ManualCrawlResult> {
  // Check if already running
  if (manualRunning) {
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

    // Stage 1: Crawl
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

      const crawlResult = await runCrawler(crawlOptions, { supabase });

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

    // Stage 2: Embed
    const embedStart = Date.now();
    let embedStatus: "success" | "failed" | "skipped" = "success";
    let embedDetail: object = {};

    try {
      const embedResult = await embedCollectedPressReleases(supabase, { limit: 200 });

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

    // Stage 3: Generate
    const generateStart = Date.now();
    let generateStatus: "success" | "failed" | "skipped" = "success";
    let generateDetail: object = {};

    try {
      const generateResult = await generateEmbeddedPressReleaseArticles(
        { limit: 200 },
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

    const totalDurationMs = Date.now() - pipelineStart;

    return {
      success: true,
      totalDurationMs,
      stages: {
        crawl: { status: crawlStatus, durationMs: crawlDurationMs, detail: crawlDetail },
        embed: { status: embedStatus, durationMs: embedDurationMs, detail: embedDetail },
        generate: {
          status: generateStatus,
          durationMs: generateDurationMs,
          detail: generateDetail,
        },
      },
    };
  } finally {
    manualRunning = false;
  }
}
