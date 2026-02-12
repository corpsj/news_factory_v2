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

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, api_key_hash, is_active")
    .eq("is_active", true);

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

  // bcrypt.compare is sequential to prevent timing-based key enumeration
  for (const row of clients) {
    const match = await bcrypt.compare(apiKey, row.api_key_hash);
    if (match) {
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
