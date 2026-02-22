import { createClient } from "@supabase/supabase-js";
import { PressReleaseTable } from "@/components/admin/press-release-table";

type PressReleaseRow = {
  id: string;
  source: string;
  title: string;
  status: string;
  published_at: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  collected: "수집됨",
  embedded: "분석됨",
  processed: "발행됨",
  failed: "실패",
};

async function getPressReleases(
  searchParams: Record<string, string | undefined>,
) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || url.includes("your-project-ref")) {
    return { data: [] as PressReleaseRow[], total: 0 };
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const page = Number(searchParams.page ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const status = searchParams.status;

  let query = supabase
    .from("press_releases")
    .select("id,source,title,status,published_at,created_at", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, count } = await query;

  return { data: (data ?? []) as PressReleaseRow[], total: count ?? 0 };
}

function buildHref(params: Record<string, string>) {
  const filtered = Object.entries(params).filter(([, v]) => v);
  if (filtered.length === 0) return "/admin/press-releases";
  return `/admin/press-releases?${filtered.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}

export default async function PressReleasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: releases, total } = await getPressReleases(params);
  const currentStatus = params.status ?? "";
  const limit = 20;
  const currentPage = Number(params.page ?? "1");
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
       <div className="mb-8 flex items-center justify-between">
         <div>
           <h2 className="text-[28px] font-semibold tracking-tight text-white">보도자료</h2>
           <p className="mt-1 text-sm text-white/40">수집된 보도자료 {total}건</p>
         </div>
       </div>

        <div className="mb-4 flex gap-2">
          {["", "collected", "embedded", "processed", "failed"].map((s) => (
            <a
              key={s}
              href={s ? `/admin/press-releases?status=${s}` : "/admin/press-releases"}
              className={`rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b] ${
                currentStatus === s
                  ? "bg-white/[0.08] text-white"
                  : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"
              }`}
            >
              {STATUS_LABELS[s] ?? "전체"}
            </a>
          ))}
        </div>

        <PressReleaseTable releases={releases} currentStatus={currentStatus} />

       {totalPages > 1 && (
         <div className="mt-4 flex items-center justify-between">
           <p className="text-sm text-white/30">
             총 {total}건 중 {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)}건
           </p>
           <div className="flex items-center gap-1">
             {currentPage > 1 && (
               <a
                 href={buildHref({ status: currentStatus, page: String(currentPage - 1) })}
                 className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b]"
               >
                 ← 이전
               </a>
             )}
             {Array.from({ length: totalPages }, (_, i) => i + 1)
               .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
               .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                 if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                 acc.push(p);
                 return acc;
               }, [])
               .map((p) =>
                 p === "..." ? (
                   <span key="ellipsis" className="px-2 text-xs text-white/20">
                     …
                   </span>
                 ) : (
                   <a
                     key={`page-${p}`}
                     href={buildHref({ status: currentStatus, page: String(p) })}
                     className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b] ${
                       p === currentPage
                         ? "bg-white/[0.08] text-white"
                         : "text-white/40 hover:bg-white/[0.06] hover:text-white"
                     }`}
                   >
                     {p}
                   </a>
                 ),
               )}
             {currentPage < totalPages && (
               <a
                 href={buildHref({ status: currentStatus, page: String(currentPage + 1) })}
                 className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b]"
               >
                 다음 →
               </a>
             )}
           </div>
         </div>
       )}
     </div>
  );
}
