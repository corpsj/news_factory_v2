import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(request: Request, { params }: RouteParams) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("clients")
      .select(
        "id, name, description, is_active, api_key_prefix, api_key_last4, webhook_url, last_used_at, request_count, created_at, updated_at",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type PatchBody = {
  name?: string;
  description?: string;
  is_active?: boolean;
  webhook_url?: string;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as PatchBody;
    const updateData: {
      name?: string;
      description?: string | null;
      is_active?: boolean;
      webhook_url?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      updateData.name = trimmed;
    }

    if (typeof body.description === "string") {
      updateData.description = body.description.trim() || null;
    }

    if (typeof body.is_active === "boolean") {
      updateData.is_active = body.is_active;
    }

    if (typeof body.webhook_url === "string") {
      updateData.webhook_url = body.webhook_url.trim() || null;
    }

    const hasChanges =
      updateData.name !== undefined ||
      updateData.description !== undefined ||
      updateData.is_active !== undefined ||
      updateData.webhook_url !== undefined;

    if (!hasChanges) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", id)
      .is("deleted_at", null)
      .select(
        "id, name, description, is_active, api_key_prefix, api_key_last4, webhook_url, last_used_at, request_count, created_at, updated_at",
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("clients")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
