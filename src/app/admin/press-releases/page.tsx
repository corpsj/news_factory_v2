import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type PressReleaseRow = {
  id: string;
  source: string;
  title: string;
  status: string;
  published_at: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  collected: "bg-white/[0.06] text-white/50",
  embedded: "bg-blue-500/10 text-blue-300/70",
  processed: "bg-emerald-500/10 text-emerald-400/70",
  failed: "bg-red-500/10 text-red-400/70",
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

         <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
           <table className="min-w-[640px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">출처</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">제목</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">상태</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">날짜</th>
              </tr>
            </thead>
            <tbody>
               {releases.length === 0 ? (
                 <tr>
                   <td colSpan={4} className="px-5 py-16 text-center">
                     <div className="flex flex-col items-center gap-2">
                       <span className="text-4xl text-white/10">◇</span>
                       <p className="text-sm text-white/30">수집된 보도자료가 없습니다</p>
                       <p className="text-xs text-white/20">수집을 실행하면 자동으로 추가됩니다</p>
                     </div>
                   </td>
                 </tr>
               ) : (
                releases.map((pr) => (
                  <tr
                    key={pr.id}
                    className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4 text-white/50">{pr.source}</td>
                     <td className="max-w-md truncate px-5 py-4">
                       <Link
                         href={`/admin/press-releases/${pr.id}`}
                         className="text-white/80 hover:text-white transition-colors cursor-pointer"
                       >
                         {pr.title}
                       </Link>
                     </td>
                    <td className="px-5 py-4">
                       <span
                         className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[pr.status] ?? "bg-white/[0.06] text-white/50"}`}
                        >
                         {STATUS_LABELS[pr.status] ?? pr.status}
                       </span>
                    </td>
                    <td className="px-5 py-4 text-white/30">
                      {new Date(pr.published_at).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
         </table>
       </div>

       {totalPages > 1 && (
         <div className="mt-4 flex items-center justify-between">
           <p className="text-sm text-white/30">
             총 {total}건 중 {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)}건
           </p>
           <div className="flex items-center gap-1">
             {currentPage > 1 && (
               <a
                 href={currentStatus ? `/admin/press-releases?status=${currentStatus}&page=${currentPage - 1}` : `/admin/press-releases?page=${currentPage - 1}`}
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
                     href={currentStatus ? `/admin/press-releases?status=${currentStatus}&page=${p}` : `/admin/press-releases?page=${p}`}
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
                 href={currentStatus ? `/admin/press-releases?status=${currentStatus}&page=${currentPage + 1}` : `/admin/press-releases?page=${currentPage + 1}`}
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
