import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";
const REPO = process.env.GITHUB_REPO ?? "corpsj/news_factory_v2";
const WORKFLOW_FILE = "cron-pipeline.yml";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const origin = request.headers.get("origin") ?? "";
  const referer = request.headers.get("referer") ?? "";
  const isSameOrigin = origin.includes("localhost") || referer.includes("/admin");

  if (!cronSecret || !isSameOrigin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN 환경변수가 설정되지 않았습니다" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { siteIds, dateRange, maxPages, limitPerSite } = body;

    const inputs: Record<string, string> = {};

    if (siteIds && Array.isArray(siteIds) && siteIds.length > 0) {
      inputs.siteIds = siteIds.join(",");
    }
    if (maxPages) {
      inputs.maxPages = String(maxPages);
    }
    if (limitPerSite) {
      inputs.limitPerSite = String(limitPerSite);
    }
    if (dateRange?.from && dateRange?.to) {
      inputs.dateFrom = dateRange.from;
      inputs.dateTo = dateRange.to;
    }

    const res = await fetch(
      `${GITHUB_API}/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ ref: "main", inputs }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `GitHub API 오류: ${res.status} ${text}` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      triggered: true,
      triggeredAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
