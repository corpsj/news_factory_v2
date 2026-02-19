import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CrawlSettings = {
  enabled_site_ids: string[];
  schedule_hours: number[];
  updated_at: string;
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("crawl_settings")
    .select("enabled_site_ids,schedule_hours,updated_at")
    .eq("id", 1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as CrawlSettings);
}

export async function PUT(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  let body: { enabled_site_ids?: unknown; schedule_hours?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (Array.isArray(body.enabled_site_ids)) {
    const siteIds = body.enabled_site_ids.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
    updates.enabled_site_ids = siteIds;
  }

  if (Array.isArray(body.schedule_hours)) {
    const hours = body.schedule_hours.filter(
      (h): h is number => typeof h === "number" && Number.isInteger(h) && h >= 0 && h <= 23,
    );
    updates.schedule_hours = hours;
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("crawl_settings")
    .update(updates)
    .eq("id", 1)
    .select("enabled_site_ids,schedule_hours,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as CrawlSettings);
}
