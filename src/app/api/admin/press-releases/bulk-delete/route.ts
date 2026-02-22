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
    const { ids, all, status } = body as {
      ids?: string[];
      all?: boolean;
      status?: string;
    };

    if (!all && (!ids || ids.length === 0)) {
      return NextResponse.json({ error: "ids or all required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (all) {
      let prQuery = supabase.from("press_releases").select("id");
      if (status) {
        prQuery = prQuery.eq("status", status);
      }
      const { data: prRows, error: prFetchError } = await prQuery;
      if (prFetchError) {
        return NextResponse.json({ error: prFetchError.message }, { status: 500 });
      }

      const prIds = (prRows ?? []).map((r: { id: string }) => r.id);

      if (prIds.length > 0) {
        const { error: articlesError } = await supabase
          .from("articles")
          .delete()
          .in("press_release_id", prIds);

        if (articlesError) {
          return NextResponse.json({ error: articlesError.message }, { status: 500 });
        }

        let deleteQuery = supabase.from("press_releases").delete();
        if (status) {
          deleteQuery = deleteQuery.eq("status", status);
        }
        const { error: deleteError } = await deleteQuery;

        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true, deleted: prIds.length });
    }

    const { error: articlesError } = await supabase
      .from("articles")
      .delete()
      .in("press_release_id", ids!);

    if (articlesError) {
      return NextResponse.json({ error: articlesError.message }, { status: 500 });
    }

    const { error } = await supabase
      .from("press_releases")
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
