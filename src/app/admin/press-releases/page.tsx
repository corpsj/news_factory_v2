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

  return (
    <div>
       <div className="mb-6 flex items-center justify-between">
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
             className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
               currentStatus === s
                 ? "bg-white/[0.08] text-white"
                 : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"
             }`}
           >
             {s || "전체"}
           </a>
         ))}
       </div>

       <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
         <table className="w-full text-left text-sm">
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
                 <td colSpan={4} className="px-5 py-16 text-center text-white/20">
                   데이터 없음
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
                       className="text-white/80 hover:text-white transition-colors"
                     >
                       {pr.title}
                     </Link>
                   </td>
                   <td className="px-5 py-4">
                     <span
                       className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[pr.status] ?? "bg-zinc-700 text-zinc-300"}`}
                     >
                       {pr.status}
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
    </div>
  );
}
