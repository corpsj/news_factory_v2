import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const referer = request.headers.get("referer") ?? "";
  const isSameOrigin = origin.includes("localhost") || referer.includes("/admin");

  if (!isSameOrigin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");

  if (!since) {
    return NextResponse.json({ error: "since parameter required" }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const { data: logs, error } = await supabase
      .from("crawl_logs")
      .select("site_name,site_url,status,articles_found,articles_new,error_message,started_at,completed_at")
      .gte("started_at", since)
      .order("started_at", { ascending: true });

    if (error) throw new Error(error.message);

    const siteResults = (logs ?? []).filter((l) => !l.site_name.startsWith("pipeline:"));
    const stageResults = (logs ?? []).filter((l) => l.site_name.startsWith("pipeline:"));

    const hasGenerate = stageResults.some((l) => l.site_name === "pipeline:generate");
    const hasCrawl = stageResults.some((l) => l.site_name === "pipeline:crawl");
    const hasEmbed = stageResults.some((l) => l.site_name === "pipeline:embed");

    const isComplete = hasGenerate || (hasCrawl && hasEmbed && stageResults.length >= 3);

    return NextResponse.json({ siteResults, stageResults, isComplete });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
