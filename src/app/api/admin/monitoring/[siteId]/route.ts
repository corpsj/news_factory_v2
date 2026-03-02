import { NextResponse } from "next/server";
import { getSiteCrawlHistory } from "@/lib/services/crawl-monitor";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const origin = request.headers.get("origin") ?? "";
  const referer = request.headers.get("referer") ?? "";
  const isSameOrigin = origin.includes("localhost") || referer.includes("/admin");

  if (!isSameOrigin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId } = await params;

  try {
    const history = await getSiteCrawlHistory(siteId);

    if (!history) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json(history);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
