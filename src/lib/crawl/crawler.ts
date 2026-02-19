import pLimit from "p-limit";
import { SITES, SITES_BY_ID } from "@/config/sites";
import { createHttpClient } from "@/lib/crawl/http";
import { PARSERS } from "@/lib/crawl/parsers";
import type {
  CrawlOptions,
  CrawlRunResult,
  CrawlSiteResult,
  CrawlerDependencies,
  ParsedArticle,
  SiteConfig,
} from "@/types/crawler";

const DEFAULT_LIMIT_PER_SITE = 5;
const DEFAULT_DELAY_MS = 900;
const DEFAULT_SITE_CONCURRENCY = 5;

function pickSites(siteIds?: string[]): SiteConfig[] {
  if (!siteIds || siteIds.length === 0) {
    return SITES;
  }

  return siteIds.map((siteId) => {
    const site = SITES_BY_ID.get(siteId);
    if (!site) {
      throw new Error(`Unknown site id: ${siteId}`);
    }
    return site;
  });
}

async function insertArticle(
  deps: CrawlerDependencies,
  article: ParsedArticle,
): Promise<"inserted" | "duplicate"> {
  const existingResponse = await deps.supabase
    .from("press_releases")
    .select("id")
    .eq("origin_id", article.originId)
    .maybeSingle();

  if (existingResponse.error) {
    throw new Error(existingResponse.error.message);
  }

  if (existingResponse.data?.id) {
    return "duplicate";
  }

  const insertResponse = await deps.supabase.from("press_releases").insert({
    origin_id: article.originId,
    source: article.source,
    title: article.title,
    content: article.body,
    link: article.originalLink,
    images: article.imageUrls,
    attachments: article.attachmentUrls,
    published_at: article.date,
    status: "collected",
  });

  if (insertResponse.error) {
    throw new Error(insertResponse.error.message);
  }

  return "inserted";
}

async function writeCrawlLog(
  deps: CrawlerDependencies,
  site: SiteConfig,
  result: CrawlSiteResult,
  startedAt: string,
): Promise<void> {
  const { error } = await deps.supabase.from("crawl_logs").insert({
    site_name: site.name,
    site_url: site.listUrl,
    status: result.status,
    articles_found: result.found,
    articles_new: result.inserted,
    error_message: result.errorMessage ?? null,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`[${site.id}] Failed to write crawl log: ${error.message}`);
  }
}

async function crawlSite(
  site: SiteConfig,
  deps: CrawlerDependencies,
  options: Required<Omit<CrawlOptions, "siteIds" | "dateRange">> & { dateRange?: CrawlOptions["dateRange"] },
): Promise<CrawlSiteResult> {
  const startedAt = new Date().toISOString();
  let errorMessage: string | undefined;

  console.log(`Crawling ${site.name}...`);

  try {
    const parser = PARSERS[site.type];
    const maxPages = Math.min(options.maxPages ?? 1, 5);
    const allArticles: ParsedArticle[] = [];
    const seenIds = new Set<string>();
    const totalPages = site.paginationParam ? maxPages : 1;

    for (let page = 1; page <= totalPages; page += 1) {
      const pageUrl =
        !site.paginationParam || page === 1
          ? site.listUrl
          : site.listUrl +
            (site.listUrl.includes("?") ? "&" : "?") +
            site.paginationParam +
            "=" +
            page;

      const listHtml = await deps.fetchHtml(pageUrl);
      const pageArticles = await parser({
        site,
        listHtml,
        fetchHtml: deps.fetchHtml,
        limit: options.limitPerSite,
        delayMs: options.delayMs,
      });

      if (pageArticles.length === 0) {
        break;
      }

      for (const article of pageArticles) {
        if (seenIds.has(article.originId)) {
          continue;
        }
        seenIds.add(article.originId);
        allArticles.push(article);
      }

      if (
        options.dateRange?.from &&
        pageArticles.every((article) => article.date < options.dateRange!.from)
      ) {
        break;
      }
    }

    const articles = options.dateRange
      ? allArticles.filter(
          (article) =>
            article.date >= options.dateRange!.from &&
            article.date <= options.dateRange!.to,
        )
      : allArticles;

    console.log(`Found ${articles.length} articles from ${site.name}`);

    let inserted = 0;
    let failed = 0;

    for (const article of articles) {
      try {
        const insertState = await insertArticle(deps, article);
        if (insertState === "inserted") {
          inserted += 1;
        }
      } catch (error) {
        failed += 1;
        console.error(`[${site.id}] Failed to save article ${article.originId}:`, error);
      }
    }

    const status: CrawlSiteResult["status"] =
      failed > 0 ? (inserted > 0 ? "partial" : "failed") : "success";

    const result: CrawlSiteResult = {
      siteId: site.id,
      siteName: site.name,
      found: articles.length,
      inserted,
      failed,
      status,
      errorMessage,
    };

    await writeCrawlLog(deps, site, result, startedAt);
    return result;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown crawl error";

    const failedResult: CrawlSiteResult = {
      siteId: site.id,
      siteName: site.name,
      found: 0,
      inserted: 0,
      failed: 1,
      status: "failed",
      errorMessage,
    };

    await writeCrawlLog(deps, site, failedResult, startedAt);
    return failedResult;
  }
}

export async function runCrawler(
  options: CrawlOptions,
  dependencies: Partial<CrawlerDependencies>,
): Promise<CrawlRunResult> {
  if (!dependencies.supabase) {
    throw new Error("Supabase client is required for crawling");
  }

  const http = createHttpClient();
  const deps: CrawlerDependencies = {
    supabase: dependencies.supabase,
    fetchHtml: dependencies.fetchHtml ?? http.fetchHtml,
  };

  const normalizedOptions: Required<Omit<CrawlOptions, "siteIds" | "dateRange">> & { dateRange?: CrawlOptions["dateRange"] } = {
    limitPerSite: options.limitPerSite ?? DEFAULT_LIMIT_PER_SITE,
    delayMs: options.delayMs ?? DEFAULT_DELAY_MS,
    siteConcurrency: options.siteConcurrency ?? DEFAULT_SITE_CONCURRENCY,
    maxPages: options.maxPages ?? 1,
    dateRange: options.dateRange,
  };

  const sites = pickSites(options.siteIds);
  const limit = pLimit(normalizedOptions.siteConcurrency);

  const results = await Promise.all(
    sites.map((site) => limit(() => crawlSite(site, deps, normalizedOptions))),
  );

  const totalFound = results.reduce((sum, site) => sum + site.found, 0);
  const totalInserted = results.reduce((sum, site) => sum + site.inserted, 0);
  const totalFailed = results.reduce((sum, site) => sum + site.failed, 0);

  return {
    totalSites: results.length,
    totalFound,
    totalInserted,
    totalFailed,
    results,
  };
}
