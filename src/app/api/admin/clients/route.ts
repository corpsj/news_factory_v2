import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing: ${name}`);
  return value;
}

function generateApiKey() {
  return `sk_live_${crypto.randomBytes(32).toString("hex")}`;
}

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    const isAdmin =
      cronSecret && authHeader === `Bearer ${cronSecret}`;

    const origin = request.headers.get("origin") ?? "";
    const referer = request.headers.get("referer") ?? "";
    const isSameOrigin = origin.includes("localhost") || referer.includes("/admin");

    if (!isAdmin && !isSameOrigin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const apiKey = generateApiKey();
    const apiKeyHash = await bcrypt.hash(apiKey, 12);

    const supabase = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
    );

    const { data, error } = await supabase
      .from("clients")
      .insert({ name, api_key_hash: apiKeyHash })
      .select("id,name,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ...data, api_key: apiKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
