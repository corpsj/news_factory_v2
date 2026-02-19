import { NextResponse } from "next/server";
import { SITES_BY_ID } from "@/config/sites";
import { executeManualCrawl } from "@/lib/pipeline/manual";

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    const isAdmin =
      cronSecret && authHeader === `Bearer ${cronSecret}`;

    const origin = request.headers.get("origin") ?? "";
    const referer = request.headers.get("referer") ?? "";
    const isSameOrigin = origin.includes("localhost") || referer.includes("/admin");

    if (!isAdmin && !isSameOrigin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { siteIds, limitPerSite, maxPages, dateRange, delayMs } = body;

    if (siteIds && Array.isArray(siteIds)) {
      const unknownIds = siteIds.filter((id: string) => !SITES_BY_ID.has(id));
      if (unknownIds.length > 0) {
        return NextResponse.json(
          { error: `Unknown site IDs: ${unknownIds.join(", ")}` },
          { status: 400 },
        );
      }
    }

    const clampedMaxPages = Math.min(Math.max(maxPages ?? 1, 1), 5);
    const clampedLimitPerSite = Math.min(Math.max(limitPerSite ?? 10, 1), 100);

    const result = await executeManualCrawl({
      siteIds,
      limitPerSite: clampedLimitPerSite,
      maxPages: clampedMaxPages,
      dateRange,
      delayMs,
    });

    if (!result.success && result.error === "Manual crawl already in progress") {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
