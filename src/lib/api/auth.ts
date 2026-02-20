import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabaseClient(client?: SupabaseClient) {
  if (client) return client;
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export interface AuthenticatedClient {
  id: string;
  name: string;
  is_active: boolean;
}

export interface AuthResult {
  client: AuthenticatedClient;
}

export async function authenticateRequest(
  request: Request,
  client?: SupabaseClient,
): Promise<AuthResult | NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header. Expected: Bearer {api_key}" },
      { status: 401 },
    );
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Empty API key" },
      { status: 401 },
    );
  }

  const supabase = getSupabaseClient(client);
  const apiKeyPrefix = apiKey.slice(0, 12);

  const toRequestCount = (value: number | string | null | undefined) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const trackUsage = (targetClientId: string, requestCount: number) => {
    void supabase
      .from("clients")
      .update({
        last_used_at: new Date().toISOString(),
        request_count: requestCount + 1,
      })
      .eq("id", targetClientId);
  };

  const { data: prefixedClient, error: prefixedError } = await supabase
    .from("clients")
    .select("id, name, api_key_hash, is_active, request_count")
    .eq("api_key_prefix", apiKeyPrefix)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (prefixedError) {
    console.error("Auth lookup error:", prefixedError.message);
    return NextResponse.json(
      { error: "Internal authentication error" },
      { status: 500 },
    );
  }

  if (prefixedClient) {
    const match = await bcrypt.compare(apiKey, prefixedClient.api_key_hash);
    if (match) {
      trackUsage(prefixedClient.id, toRequestCount(prefixedClient.request_count));
      return {
        client: {
          id: prefixedClient.id,
          name: prefixedClient.name,
          is_active: prefixedClient.is_active,
        },
      };
    }
  }

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, api_key_hash, is_active, request_count")
    .eq("is_active", true)
    .is("deleted_at", null)
    .is("api_key_prefix", null);

  if (error) {
    console.error("Auth lookup error:", error.message);
    return NextResponse.json(
      { error: "Internal authentication error" },
      { status: 500 },
    );
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json(
      { error: "Invalid or inactive API key" },
      { status: 401 },
    );
  }

  for (const row of clients) {
    const match = await bcrypt.compare(apiKey, row.api_key_hash);
    if (match) {
      trackUsage(row.id, toRequestCount(row.request_count));
      return {
        client: {
          id: row.id,
          name: row.name,
          is_active: row.is_active,
        },
      };
    }
  }

  return NextResponse.json(
    { error: "Invalid or inactive API key" },
    { status: 401 },
  );
}

export function isAuthError(
  result: AuthResult | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
