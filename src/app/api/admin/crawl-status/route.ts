import { NextResponse } from "next/server";
import {
  getAllSiteCrawlStatus,
  getCrawlStatistics,
  type CrawlStatistics,
} from "@/lib/services/crawl-monitor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeStats = searchParams.get("stats") === "true";
  const statsPeriod = (searchParams.get("period") ?? "daily") as
    | "daily"
    | "weekly"
    | "monthly";

  try {
    const sites = await getAllSiteCrawlStatus();

    const healthySites = sites.filter((s) => s.health === "healthy").length;
    const warningSites = sites.filter((s) => s.health === "warning").length;
    const criticalSites = sites.filter((s) => s.health === "critical").length;
    const unknownSites = sites.filter((s) => s.health === "unknown").length;

    let statistics: CrawlStatistics | undefined;
    if (includeStats) {
      statistics = await getCrawlStatistics(statsPeriod);
    }

    return NextResponse.json({
      total_sites: sites.length,
      summary: {
        healthy: healthySites,
        warning: warningSites,
        critical: criticalSites,
        unknown: unknownSites,
      },
      sites,
      ...(statistics ? { statistics } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Crawl status API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
