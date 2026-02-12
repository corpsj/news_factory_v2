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

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select("source")
    .not("source", "is", null);

  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  const uniqueRegions = [...new Set((data || []).map((row) => row.source))].sort();

  const response = NextResponse.json({ regions: uniqueRegions });

  for (const [key, value] of Object.entries(getRateLimitHeaders(auth.client.id))) {
    response.headers.set(key, value);
  }

  return withCors(response);
}
