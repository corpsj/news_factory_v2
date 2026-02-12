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
  economy: "bg-blue-500",
  politics: "bg-red-500",
  society: "bg-emerald-500",
  sports: "bg-orange-500",
  culture: "bg-violet-500",
  opinion: "bg-cyan-500",
  editorial: "bg-amber-500",
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
        <h2 className="text-2xl font-bold tracking-tight text-white">통계</h2>
        <p className="mt-1 text-sm text-zinc-400">시스템 현황 분석</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <p className="text-xs text-zinc-400">보도자료</p>
          <p className="mt-1 text-3xl font-bold text-white">{totalPR}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <p className="text-xs text-zinc-400">생성 기사</p>
          <p className="mt-1 text-3xl font-bold text-white">{totalArticles}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <p className="text-xs text-zinc-400">크롤링 성공률</p>
          <p className="mt-1 text-3xl font-bold text-white">{successRate}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h3 className="mb-6 text-lg font-semibold text-white">카테고리별 기사 분포</h3>
        <div className="space-y-3">
          {categoryCounts.map((item) => (
            <div key={item.category} className="flex items-center gap-3">
              <span className="w-16 text-right text-xs text-zinc-400">
                {CATEGORY_LABELS[item.category] ?? item.category}
              </span>
              <div className="flex-1">
                <div className="h-6 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full ${CATEGORY_COLORS[item.category] ?? "bg-zinc-500"} transition-all duration-500`}
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
              <span className="w-10 text-right text-sm font-medium text-white">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
