import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ClientDetailActions } from "./client-detail-actions";

type ClientDetail = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  api_key_prefix: string | null;
  api_key_last4: string | null;
  webhook_url: string | null;
  last_used_at: string | null;
  request_count: number | null;
  created_at: string;
  updated_at: string;
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "기록 없음";
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return "기록 없음";
  const diff = Date.now() - target;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function formatActivePeriod(createdAt: string): string {
  const target = new Date(createdAt).getTime();
  if (Number.isNaN(target)) return "계산 불가";
  const diff = Date.now() - target;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "1일 미만";
  if (days < 30) return `${days}일`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월`;
  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  if (remainMonths === 0) return `${years}년`;
  return `${years}년 ${remainMonths}개월`;
}

async function getClient(id: string): Promise<ClientDetail> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || url.includes("your-project-ref")) {
    notFound();
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase
    .from("clients")
    .select(
      "id,name,description,is_active,api_key_prefix,api_key_last4,webhook_url,last_used_at,request_count,created_at,updated_at",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    notFound();
  }

  return data as ClientDetail;
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/clients"
        className="inline-flex items-center rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
      >
        ← 클라이언트
      </Link>

      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-white">{client.name}</h1>
        <p className="mt-1 text-sm text-white/40">{client.description || "설명 없음"}</p>
      </div>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <p className="text-[11px] uppercase tracking-wider text-white/30">프로필</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-white/35">이름</dt>
            <dd className="mt-1 text-sm text-white/90">{client.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/35">상태</dt>
            <dd className="mt-1">
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  client.is_active ? "bg-emerald-500/10 text-emerald-400/80" : "bg-red-500/10 text-red-400/80"
                }`}
              >
                {client.is_active ? "활성" : "비활성"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/35">설명</dt>
            <dd className="mt-1 text-sm text-white/80">{client.description || "설명 없음"}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/35">등록일</dt>
            <dd className="mt-1 text-sm text-white/80">{new Date(client.created_at).toLocaleDateString("ko-KR")}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/35">최종수정</dt>
            <dd className="mt-1 text-sm text-white/80">{new Date(client.updated_at).toLocaleDateString("ko-KR")}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <p className="text-[11px] uppercase tracking-wider text-white/30">API 키</p>
        <div className="mt-4 space-y-2">
          <p className="font-mono text-sm text-white/90">
            {client.api_key_prefix && client.api_key_last4
              ? `${client.api_key_prefix}...${client.api_key_last4}`
              : "레거시 키"}
          </p>
          <p className="text-xs text-white/35">키는 발급 시에만 확인할 수 있습니다</p>
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <p className="text-[11px] uppercase tracking-wider text-white/30">사용 현황</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-white/[0.06] bg-black/20 p-4">
            <p className="text-xs text-white/35">총 요청</p>
            <p className="mt-2 text-2xl font-semibold text-white">{(client.request_count ?? 0).toLocaleString("ko-KR")}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 p-4">
            <p className="text-xs text-white/35">마지막 사용</p>
            <p className="mt-2 text-lg font-medium text-white/90">{formatRelativeTime(client.last_used_at)}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 p-4">
            <p className="text-xs text-white/35">활성 기간</p>
            <p className="mt-2 text-lg font-medium text-white/90">{formatActivePeriod(client.created_at)}</p>
          </div>
        </div>
      </section>

      <ClientDetailActions client={client} />
    </div>
  );
}
