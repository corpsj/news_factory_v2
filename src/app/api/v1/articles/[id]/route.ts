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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return withCors(auth);

  const rateLimitResponse = checkRateLimit(auth.client.id);
  if (rateLimitResponse) return withCors(rateLimitResponse);

  const { id } = await params;

  if (!id) {
    return withCors(NextResponse.json({ error: "Missing article id" }, { status: 400 }));
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select("id, title, subtitle, body, category, source, source_url, images, created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return withCors(NextResponse.json({ error: "Article not found" }, { status: 404 }));
  }

  const article = {
    id: data.id,
    title: data.title,
    summary: data.subtitle,
    content: data.body,
    category: data.category,
    source: data.source,
    source_url: data.source_url,
    images: data.images,
    published_at: data.created_at,
    processed_at: data.created_at,
  };

  const response = NextResponse.json({ article });

  for (const [key, value] of Object.entries(getRateLimitHeaders(auth.client.id))) {
    response.headers.set(key, value);
  }

  return withCors(response);
}
