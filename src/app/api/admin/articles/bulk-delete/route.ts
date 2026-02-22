import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing: ${name}`);
  return value;
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isAdmin = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const origin = request.headers.get("origin") ?? "";
  const referer = request.headers.get("referer") ?? "";
  const isSameOrigin = origin.includes("localhost") || referer.includes("/admin");
  return Boolean(isAdmin || isSameOrigin);
}

function getSupabaseAdmin() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, all, category, source } = body as {
      ids?: string[];
      all?: boolean;
      category?: string;
      source?: string;
    };

    if (!all && (!ids || ids.length === 0)) {
      return NextResponse.json({ error: "ids or all required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (all) {
      let countQuery = supabase.from("articles").select("id", { count: "exact", head: true });
      if (category) countQuery = countQuery.eq("category", category);
      if (source) countQuery = countQuery.eq("source", source);
      const { count } = await countQuery;

      let deleteQuery = supabase.from("articles").delete();
      if (category) deleteQuery = deleteQuery.eq("category", category);
      if (source) deleteQuery = deleteQuery.eq("source", source);

      if (!category && !source) {
        deleteQuery = deleteQuery.gte("created_at", "1970-01-01");
      }

      const { error } = await deleteQuery;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: count ?? 0 });
    }

    const { error } = await supabase
      .from("articles")
      .delete()
      .in("id", ids!);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: ids!.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
