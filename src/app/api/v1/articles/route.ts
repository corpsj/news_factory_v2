import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/api/rate-limit";
import { withCors, corsPreflightResponse } from "@/lib/api/cors";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getSupabaseAdmin() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return withCors(auth);

  const rateLimitResponse = checkRateLimit(auth.client.id);
  if (rateLimitResponse) return withCors(rateLimitResponse);

  const { searchParams } = new URL(request.url);

  const region = searchParams.get("region");
  const category = searchParams.get("category");
  const keyword = searchParams.get("keyword");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status") || "available";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("articles")
    .select("id, title, subtitle, body, category, source, source_url, images, created_at", { count: "exact" })
    .in("status", status === "all" ? ["generated", "available", "distributed"] : [status])
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (region) {
    const regions = region.split(",").map((r) => r.trim()).filter(Boolean);
    if (regions.length > 0) {
      query = query.in("source", regions);
    }
  }

  if (category) {
    const categories = category.split(",").map((c) => c.trim()).filter(Boolean);
    if (categories.length > 0) {
      query = query.in("category", categories);
    }
  }

  if (keyword) {
    const sanitized = keyword.replace(/[%_,.()"\\]/g, " ").trim();
    if (sanitized) {
      query = query.or(`title.ilike.%${sanitized}%,body.ilike.%${sanitized}%`);
    }
  }

  if (from) {
    query = query.gte("created_at", from);
  }
  if (to) {
    query = query.lte("created_at", to);
  }

  const { data, error, count } = await query;

  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  const articles = (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.subtitle,
    content: row.body,
    category: row.category,
    source: row.source,
    source_url: row.source_url,
    images: row.images,
    published_at: row.created_at,
    processed_at: row.created_at,
  }));

  const response = NextResponse.json({
    articles,
    total: count ?? 0,
    limit,
    offset,
  });

  for (const [key, value] of Object.entries(getRateLimitHeaders(auth.client.id))) {
    response.headers.set(key, value);
  }

  return withCors(response);
}
