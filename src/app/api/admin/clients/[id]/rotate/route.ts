import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

type RouteParams = { params: Promise<{ id: string }> };

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

function generateApiKey() {
  return `nf_live_${crypto.randomBytes(32).toString("hex")}`;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: existingClient, error: existingError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const apiKey = generateApiKey();
    const apiKeyHash = await bcrypt.hash(apiKey, 12);
    const apiKeyPrefix = apiKey.slice(0, 12);
    const apiKeyLast4 = apiKey.slice(-4);

    const { error } = await supabase
      .from("clients")
      .update({
        api_key_hash: apiKeyHash,
        api_key_prefix: apiKeyPrefix,
        api_key_last4: apiKeyLast4,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ api_key: apiKey, api_key_last4: apiKeyLast4 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
