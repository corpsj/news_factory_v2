import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { executePipeline, isPipelineRunning } from "@/lib/pipeline/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type CrawlSettingsRow = {
  enabled_site_ids: string[];
  schedule_hours: number[];
};

function getCurrentKstHour(): number {
  const now = new Date();
  const kstOffset = 9 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const kstMinutes = (utcMinutes + kstOffset) % (24 * 60);
  return Math.floor(kstMinutes / 60);
}

async function loadCrawlSettings(): Promise<CrawlSettingsRow | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase
    .from("crawl_settings")
    .select("enabled_site_ids,schedule_hours")
    .eq("id", 1)
    .single();

  if (error || !data) return null;
  return data as CrawlSettingsRow;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await loadCrawlSettings();
  const kstHour = getCurrentKstHour();

  if (settings) {
    const scheduledHours = settings.schedule_hours;
    if (scheduledHours.length > 0 && !scheduledHours.includes(kstHour)) {
      return NextResponse.json({
        skipped: true,
        reason: `Current KST hour (${kstHour}) is not in scheduled hours [${scheduledHours.join(", ")}]`,
      });
    }
  }

  if (isPipelineRunning()) {
    return NextResponse.json(
      { error: "Pipeline is already running" },
      { status: 409 },
    );
  }

  const siteIds = settings?.enabled_site_ids;

  try {
    const result = await executePipeline({
      siteIds: siteIds && siteIds.length > 0 ? siteIds : undefined,
      verbose: true,
    });

    const status = result.success ? 200 : 207;
    return NextResponse.json(
      {
        success: result.success,
        totalDurationMs: result.totalDurationMs,
        kstHour,
        sitesUsed: siteIds?.length ?? 27,
        stages: result.stages.map((s) => ({
          stage: s.stage,
          status: s.status,
          durationMs: s.durationMs,
          detail: s.detail,
          error: s.errorMessage ?? null,
        })),
      },
      { status },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown pipeline error";
    console.error("Pipeline execution failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
