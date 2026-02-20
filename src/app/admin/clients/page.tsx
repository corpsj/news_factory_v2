import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ClientActions } from "./client-actions";

type ClientRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  api_key_prefix: string | null;
  api_key_last4: string | null;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
};

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "방금 전";

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString("ko-KR");
}

async function getClients() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || url.includes("your-project-ref")) {
    return [] as ClientRow[];
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data } = await supabase
    .from("clients")
    .select(
      "id,name,description,is_active,api_key_prefix,api_key_last4,last_used_at,request_count,created_at",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as ClientRow[];
}

export default async function ClientsPage() {
  const clients = await getClients();
  const totalRequests = clients.reduce((sum, client) => sum + (client.request_count ?? 0), 0);
  const activeClients = clients.filter((client) => client.is_active).length;

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-white">클라이언트</h2>
          <p className="mt-1 text-sm text-white/40">
            등록 {clients.length}곳 · 총 {totalRequests.toLocaleString()} 요청
          </p>
        </div>
        <ClientActions />
      </div>

      <div className="flex gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-3">
          <p className="text-[11px] text-white/35">전체</p>
          <p className="mt-1 text-sm font-medium text-white">{clients.length.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-3">
          <p className="text-[11px] text-white/35">활성</p>
          <p className="mt-1 text-sm font-medium text-white">{activeClients.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-3">
          <p className="text-[11px] text-white/35">총 요청</p>
          <p className="mt-1 text-sm font-medium text-white">{totalRequests.toLocaleString()}</p>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-16 text-center text-sm text-white/35">
          등록된 클라이언트가 없습니다
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => {
            const keyHint =
              client.api_key_prefix && client.api_key_last4
                ? `${client.api_key_prefix}...${client.api_key_last4}`
                : "레거시 키";

            return (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.10] hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="truncate font-medium text-white">{client.name}</h3>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      client.is_active ? "bg-emerald-400" : "bg-white/20"
                    }`}
                  />
                </div>
                <p className="mt-2 font-mono text-xs text-white/30">{keyHint}</p>
                {client.description ? (
                  <p className="mt-2 truncate text-xs text-white/25">{client.description}</p>
                ) : null}
                <div className="mt-4 flex items-center justify-between text-[11px] text-white/25">
                  <span>{(client.request_count ?? 0).toLocaleString()} 요청</span>
                  <span>{client.last_used_at ? relativeTime(client.last_used_at) : "미사용"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </div>
  );
}
