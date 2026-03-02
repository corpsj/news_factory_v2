import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SITES, SITES_BY_ID } from "@/config/sites";

export type CrawlStatus = "success" | "failed" | "partial";
export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

export type FailureReason =
  | "network_error"
  | "structure_change"
  | "server_maintenance"
  | "unknown";

export interface SiteCrawlStatus {
  site_id: string;
  site_name: string;
  site_url: string;
  last_crawl_at: string | null;
  status: CrawlStatus | null;
  health: HealthStatus;
  articles_found: number;
  articles_new: number;
  error_message: string | null;
  failure_reason: FailureReason | null;
  consecutive_failures: number;
  crawl_duration_ms: number | null;
}

export interface CrawlStatistics {
  period: "daily" | "weekly" | "monthly";
  total_crawls: number;
  successful_crawls: number;
  failed_crawls: number;
  partial_crawls: number;
  success_rate: number;
  total_articles_found: number;
  total_articles_new: number;
  avg_crawl_duration_ms: number;
  per_site: SiteStatistics[];
}

export interface SiteStatistics {
  site_id: string;
  site_name: string;
  total_crawls: number;
  successful_crawls: number;
  success_rate: number;
  avg_articles_found: number;
  avg_crawl_duration_ms: number;
}

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

const CONSECUTIVE_FAILURE_THRESHOLD = 3;

// Error keyword → failure reason classification for crawl diagnostics
const NETWORK_KEYWORDS = [
  "econnrefused", "enotfound", "etimedout", "econnreset",
  "socket hang up", "network", "timeout", "getaddrinfo",
];
const STRUCTURE_KEYWORDS = [
  "no articles found", "selector", "parse", "cannot read propert",
  "undefined", "null", "expected", "cheerio",
];
const MAINTENANCE_KEYWORDS = [
  "503", "502", "500", "403", "maintenance",
  "service unavailable", "temporarily", "under construction",
];

export function classifyFailureReason(errorMessage: string | null): FailureReason | null {
  if (!errorMessage) return null;

  const lower = errorMessage.toLowerCase();

  if (NETWORK_KEYWORDS.some((kw) => lower.includes(kw))) return "network_error";
  if (STRUCTURE_KEYWORDS.some((kw) => lower.includes(kw))) return "structure_change";
  if (MAINTENANCE_KEYWORDS.some((kw) => lower.includes(kw))) return "server_maintenance";

  return "unknown";
}

function calculateDurationMs(startedAt: string, completedAt: string): number {
  return new Date(completedAt).getTime() - new Date(startedAt).getTime();
}

interface CrawlLogRow {
  site_name: string;
  site_url: string;
  status: CrawlStatus;
  articles_found: number;
  articles_new: number;
  error_message: string | null;
  started_at: string;
  completed_at: string;
}

export async function getAllSiteCrawlStatus(
  client?: SupabaseClient,
): Promise<SiteCrawlStatus[]> {
  const supabase = getSupabaseClient(client);

  const { data: logs, error } = await supabase
    .from("crawl_logs")
    .select("site_name, site_url, status, articles_found, articles_new, error_message, started_at, completed_at")
    .not("site_name", "like", "pipeline:%")
    .order("completed_at", { ascending: false })
    .limit(300);

  if (error) {
    throw new Error(`Failed to fetch crawl logs: ${error.message}`);
  }

  const typedLogs = (logs ?? []) as CrawlLogRow[];

  const logsBySite = new Map<string, CrawlLogRow[]>();
  for (const log of typedLogs) {
    const existing = logsBySite.get(log.site_name) ?? [];
    existing.push(log);
    logsBySite.set(log.site_name, existing);
  }

  const results: SiteCrawlStatus[] = SITES.map((site) => {
    const siteLogs = logsBySite.get(site.name) ?? [];
    const latest = siteLogs[0] ?? null;

    let consecutiveFailures = 0;
    for (const log of siteLogs) {
      if (log.status === "failed") {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    let health: HealthStatus = "unknown";
    if (latest) {
      if (latest.status === "success") {
        health = "healthy";
      } else if (latest.status === "partial") {
        health = consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD ? "warning" : "healthy";
      } else if (latest.status === "failed") {
        health = consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD ? "critical" : "warning";
      }
    }

    const failureReason =
      latest?.status === "failed"
        ? classifyFailureReason(latest.error_message)
        : null;

    const crawlDurationMs =
      latest?.started_at && latest?.completed_at
        ? calculateDurationMs(latest.started_at, latest.completed_at)
        : null;

    return {
      site_id: site.id,
      site_name: site.name,
      site_url: site.listUrl,
      last_crawl_at: latest?.completed_at ?? null,
      status: latest?.status ?? null,
      health,
      articles_found: latest?.articles_found ?? 0,
      articles_new: latest?.articles_new ?? 0,
      error_message: latest?.error_message ?? null,
      failure_reason: failureReason,
      consecutive_failures: consecutiveFailures,
      crawl_duration_ms: crawlDurationMs,
    };
  });

  return results;
}

function getPeriodStart(period: "daily" | "weekly" | "monthly"): string {
  const now = new Date();
  switch (period) {
    case "daily":
      now.setDate(now.getDate() - 1);
      break;
    case "weekly":
      now.setDate(now.getDate() - 7);
      break;
    case "monthly":
      now.setMonth(now.getMonth() - 1);
      break;
  }
  return now.toISOString();
}

export async function getCrawlStatistics(
  period: "daily" | "weekly" | "monthly",
  client?: SupabaseClient,
): Promise<CrawlStatistics> {
  const supabase = getSupabaseClient(client);
  const since = getPeriodStart(period);

  const { data: logs, error } = await supabase
    .from("crawl_logs")
    .select("site_name, site_url, status, articles_found, articles_new, started_at, completed_at")
    .not("site_name", "like", "pipeline:%")
    .gte("completed_at", since)
    .order("completed_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(`Failed to fetch crawl statistics: ${error.message}`);
  }

  const typedLogs = (logs ?? []) as CrawlLogRow[];

  let successful = 0;
  let failed = 0;
  let partial = 0;
  let totalArticlesFound = 0;
  let totalArticlesNew = 0;
  let totalDurationMs = 0;
  let durationCount = 0;

  const siteMap = new Map<
    string,
    {
      site_name: string;
      total: number;
      success: number;
      articlesFound: number;
      durationMs: number;
      durationEntries: number;
    }
  >();

  for (const log of typedLogs) {
    if (log.status === "success") successful++;
    else if (log.status === "failed") failed++;
    else if (log.status === "partial") partial++;

    totalArticlesFound += log.articles_found ?? 0;
    totalArticlesNew += log.articles_new ?? 0;

    if (log.started_at && log.completed_at) {
      const dur = calculateDurationMs(log.started_at, log.completed_at);
      totalDurationMs += dur;
      durationCount++;
    }

    const existing = siteMap.get(log.site_name) ?? {
      site_name: log.site_name,
      total: 0,
      success: 0,
      articlesFound: 0,
      durationMs: 0,
      durationEntries: 0,
    };
    existing.total++;
    if (log.status === "success") existing.success++;
    existing.articlesFound += log.articles_found ?? 0;
    if (log.started_at && log.completed_at) {
      existing.durationMs += calculateDurationMs(log.started_at, log.completed_at);
      existing.durationEntries++;
    }
    siteMap.set(log.site_name, existing);
  }

  const totalCrawls = successful + failed + partial;

  const siteIdMap = new Map(SITES.map((s) => [s.name, s.id]));

  const perSite: SiteStatistics[] = Array.from(siteMap.values()).map((s) => ({
    site_id: siteIdMap.get(s.site_name) ?? s.site_name,
    site_name: s.site_name,
    total_crawls: s.total,
    successful_crawls: s.success,
    success_rate: s.total > 0 ? Math.round((s.success / s.total) * 10000) / 100 : 0,
    avg_articles_found: s.total > 0 ? Math.round((s.articlesFound / s.total) * 100) / 100 : 0,
    avg_crawl_duration_ms:
      s.durationEntries > 0 ? Math.round(s.durationMs / s.durationEntries) : 0,
  }));

  return {
    period,
    total_crawls: totalCrawls,
    successful_crawls: successful,
    failed_crawls: failed,
    partial_crawls: partial,
    success_rate: totalCrawls > 0 ? Math.round((successful / totalCrawls) * 10000) / 100 : 0,
    total_articles_found: totalArticlesFound,
    total_articles_new: totalArticlesNew,
    avg_crawl_duration_ms: durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0,
    per_site: perSite,
  };
}

export interface CrawlHistoryEntry {
  status: CrawlStatus;
  articles_found: number;
  articles_new: number;
  error_message: string | null;
  started_at: string;
  completed_at: string;
  duration_ms: number;
}

export interface SiteCrawlHistory {
  site_id: string;
  site_name: string;
  site_url: string;
  health: HealthStatus;
  total_crawls: number;
  successful_crawls: number;
  success_rate: number;
  avg_duration_ms: number;
  total_articles_found: number;
  total_articles_new: number;
  history: CrawlHistoryEntry[];
}

export async function getSiteCrawlHistory(
  siteId: string,
  limit = 20,
  client?: SupabaseClient,
): Promise<SiteCrawlHistory | null> {
  const site = SITES_BY_ID.get(siteId);
  if (!site) return null;

  const supabase = getSupabaseClient(client);

  const { data: logs, error } = await supabase
    .from("crawl_logs")
    .select("status, articles_found, articles_new, error_message, started_at, completed_at")
    .eq("site_name", site.name)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch crawl history for ${siteId}: ${error.message}`);
  }

  const typedLogs = (logs ?? []) as CrawlLogRow[];

  let successful = 0;
  let failed = 0;
  let totalArticlesFound = 0;
  let totalArticlesNew = 0;
  let totalDurationMs = 0;
  let durationCount = 0;
  let consecutiveFailures = 0;
  let countingFailures = true;

  const history: CrawlHistoryEntry[] = typedLogs.map((log) => {
    if (log.status === "success") successful++;
    else if (log.status === "failed") failed++;
    totalArticlesFound += log.articles_found ?? 0;
    totalArticlesNew += log.articles_new ?? 0;

    if (countingFailures) {
      if (log.status === "failed") consecutiveFailures++;
      else countingFailures = false;
    }

    const durationMs =
      log.started_at && log.completed_at
        ? calculateDurationMs(log.started_at, log.completed_at)
        : 0;

    if (durationMs > 0) {
      totalDurationMs += durationMs;
      durationCount++;
    }

    return {
      status: log.status,
      articles_found: log.articles_found ?? 0,
      articles_new: log.articles_new ?? 0,
      error_message: log.error_message,
      started_at: log.started_at,
      completed_at: log.completed_at,
      duration_ms: durationMs,
    };
  });

  const totalCrawls = typedLogs.length;
  const latest = typedLogs[0] ?? null;

  let health: HealthStatus = "unknown";
  if (latest) {
    if (latest.status === "success") {
      health = "healthy";
    } else if (latest.status === "partial") {
      health = consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD ? "warning" : "healthy";
    } else if (latest.status === "failed") {
      health = consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD ? "critical" : "warning";
    }
  }

  return {
    site_id: site.id,
    site_name: site.name,
    site_url: site.listUrl,
    health,
    total_crawls: totalCrawls,
    successful_crawls: successful,
    success_rate: totalCrawls > 0 ? Math.round((successful / totalCrawls) * 10000) / 100 : 0,
    avg_duration_ms: durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0,
    total_articles_found: totalArticlesFound,
    total_articles_new: totalArticlesNew,
    history,
  };
}
