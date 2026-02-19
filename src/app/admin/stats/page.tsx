import { createClient } from "@supabase/supabase-js";
import { ARTICLE_CATEGORIES } from "@/types/article";

const CATEGORY_LABELS: Record<string, string> = {
  economy: "경제",
  politics: "정치",
  society: "사회",
  sports: "스포츠",
  culture: "문화",
  opinion: "오피니언",
  editorial: "사설",
};

const CATEGORY_COLORS: Record<string, string> = {
  economy: "bg-blue-400/60",
  politics: "bg-red-400/60",
  society: "bg-emerald-400/60",
  sports: "bg-orange-400/60",
  culture: "bg-violet-400/60",
  opinion: "bg-cyan-400/60",
  editorial: "bg-amber-400/60",
};

type CategoryStat = { category: string; count: number };

async function getStats() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || url.includes("your-project-ref")) {
    return { categoryCounts: [] as CategoryStat[], totalArticles: 0, totalPR: 0, successRate: 0 };
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const [artRes, prRes, crawlRes] = await Promise.all([
    supabase.from("articles").select("category"),
    supabase.from("press_releases").select("id", { count: "exact", head: true }),
    supabase.from("crawl_logs").select("status"),
  ]);

  const articles = artRes.data ?? [];
  const countMap = new Map<string, number>();
  for (const a of articles) {
    countMap.set(a.category, (countMap.get(a.category) ?? 0) + 1);
  }

  const categoryCounts = ARTICLE_CATEGORIES.map((cat) => ({
    category: cat,
    count: countMap.get(cat) ?? 0,
  }));

  const crawlLogs = crawlRes.data ?? [];
  const successCount = crawlLogs.filter((l) => l.status === "success").length;
  const successRate = crawlLogs.length > 0 ? Math.round((successCount / crawlLogs.length) * 100) : 0;

  return {
    categoryCounts,
    totalArticles: articles.length,
    totalPR: prRes.count ?? 0,
    successRate,
  };
}

export default async function StatsPage() {
  const { categoryCounts, totalArticles, totalPR, successRate } = await getStats();
  const maxCount = Math.max(...categoryCounts.map((c) => c.count), 1);

  return (
    <div>
      <div className="mb-8">
         <h2 className="text-[28px] font-semibold tracking-tight text-white">통계</h2>
         <p className="mt-1 text-sm text-white/40">시스템 현황 분석</p>
       </div>

       <div className="mb-8 grid gap-5 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
            <p className="text-[11px] text-white/30">보도자료</p>
            <p className="mt-1 text-4xl font-light text-white">{totalPR}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
            <p className="text-[11px] text-white/30">생성 기사</p>
            <p className="mt-1 text-4xl font-light text-white">{totalArticles}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
            <p className="text-[11px] text-white/30">크롤링 성공률</p>
            <p className="mt-1 text-4xl font-light text-white">{successRate}%</p>
          </div>
        </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
         <h3 className="mb-6 text-base font-medium text-white">카테고리별 기사 분포</h3>
        <div className="space-y-3">
           {categoryCounts.map((item) => (
             <div key={item.category} className="flex items-center gap-3">
               <span className="w-16 text-right text-xs text-white/30">
                 {CATEGORY_LABELS[item.category] ?? item.category}
               </span>
               <div className="flex-1">
                 <div className="h-6 overflow-hidden rounded-full bg-white/[0.04]">
                   <div
                     className={`h-full rounded-full ${CATEGORY_COLORS[item.category] ?? "bg-zinc-500"} transition-all duration-500`}
                     style={{ width: `${(item.count / maxCount) * 100}%` }}
                   />
                 </div>
               </div>
               <span className="w-10 text-right text-sm font-light text-white">
                 {item.count}
               </span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
