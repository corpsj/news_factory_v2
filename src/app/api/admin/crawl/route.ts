import { NextResponse } from "next/server";
import { SITES_BY_ID } from "@/config/sites";
import { executeManualCrawl, type PipelineEvent } from "@/lib/pipeline/manual";

const DEFAULT_MAX_PAGES = 10;
const DEFAULT_LIMIT_PER_SITE = 200;

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
    const { siteIds, dateRange, delayMs } = body;

    if (siteIds && Array.isArray(siteIds)) {
      const unknownIds = siteIds.filter((id: string) => !SITES_BY_ID.has(id));
      if (unknownIds.length > 0) {
        return NextResponse.json(
          { error: `Unknown site IDs: ${unknownIds.join(", ")}` },
          { status: 400 },
        );
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: PipelineEvent) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          } catch {
            // stream closed by client
          }
        };

        try {
          await executeManualCrawl(
            {
              siteIds,
              limitPerSite: DEFAULT_LIMIT_PER_SITE,
              maxPages: DEFAULT_MAX_PAGES,
              dateRange,
              delayMs,
            },
            send,
          );
        } catch (err) {
          send({ type: "error", message: err instanceof Error ? err.message : "Internal error" });
        } finally {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
