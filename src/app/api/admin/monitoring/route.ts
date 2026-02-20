import { NextResponse } from "next/server";
import { getAllSiteCrawlStatus } from "@/lib/services/crawl-monitor";
import type { HealthStatus } from "@/lib/services/crawl-monitor";

export async function GET(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const referer = request.headers.get("referer") ?? "";
  const isSameOrigin = origin.includes("localhost") || referer.includes("/admin");

  if (!isSameOrigin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sites = await getAllSiteCrawlStatus();

    const summary: Record<HealthStatus, number> = { healthy: 0, warning: 0, critical: 0, unknown: 0 };
    for (const s of sites) {
      summary[s.health]++;
    }

    return NextResponse.json({ sites, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
