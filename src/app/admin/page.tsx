import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

async function getDashboardStats() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key || url.includes("your-project-ref")) {
    return {
      pressReleases: { total: 0, collected: 0, embedded: 0, processed: 0 },
      articles: { total: 0 },
      clients: { total: 0, active: 0 },
      recentCrawl: null as string | null,
    };
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const [prCount, artCount, clientCount, lastCrawl] = await Promise.all([
    supabase.from("press_releases").select("status", { count: "exact", head: true }),
    supabase.from("articles").select("id", { count: "exact", head: true }),
    supabase.from("clients").select("is_active", { count: "exact", head: true }),
    supabase
      .from("crawl_logs")
      .select("started_at")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    pressReleases: {
      total: prCount.count ?? 0,
      collected: 0,
      embedded: 0,
      processed: 0,
    },
    articles: { total: artCount.count ?? 0 },
    clients: { total: clientCount.count ?? 0, active: 0 },
    recentCrawl: lastCrawl.data?.started_at ?? null,
  };
}

const STAT_CARDS = [
  { key: "pressReleases", label: "보도자료", icon: "◇", color: "from-blue-500/20 to-blue-600/5", href: "/admin/press-releases" },
  { key: "articles", label: "기사", icon: "▤", color: "from-emerald-500/20 to-emerald-600/5", href: "/admin/articles" },
  { key: "clients", label: "클라이언트", icon: "⊡", color: "from-violet-500/20 to-violet-600/5", href: "/admin/clients" },
  { key: "crawl", label: "수집 현황", icon: "◫", color: "from-amber-500/20 to-amber-600/5", href: "/admin/monitoring" },
] as const;

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const recentCrawlDate = stats.recentCrawl ? new Date(stats.recentCrawl) : null;
  const recentCrawlRelative = recentCrawlDate
    ? formatRelativeTime(recentCrawlDate)
    : "—";
  const recentCrawlAbsolute = recentCrawlDate
    ? recentCrawlDate.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    : "";

  const cardData = [
    { ...STAT_CARDS[0], value: stats.pressReleases.total, sub: "전체 수집" },
    { ...STAT_CARDS[1], value: stats.articles.total, sub: "AI 생성" },
    { ...STAT_CARDS[2], value: stats.clients.total, sub: "등록됨" },
    {
      ...STAT_CARDS[3],
      value: recentCrawlRelative,
      sub: recentCrawlAbsolute || "기록 없음",
    },
  ];

  return (
    <div>
      <div className="mb-8">
         <h2 className="text-[28px] font-semibold tracking-tight text-white">
           대시보드
         </h2>
         <p className="mt-1 text-sm text-white/40">
           News Factory v2 시스템 현황
         </p>
       </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cardData.map((card) => (
          <Link
             key={card.key}
             href={card.href}
             className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all hover:bg-white/[0.05] hover:border-white/[0.10]"
           >
             <div className="flex items-center justify-between">
               <span className="text-lg text-white/20">{card.icon}</span>
               <span className="text-[11px] text-white/30">{card.sub}</span>
             </div>
             <div className="mt-4">
               <p className="text-4xl font-light text-white">{card.value}</p>
               <p className="mt-1 text-sm text-white/40">{card.label}</p>
             </div>
           </Link>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
         <h3 className="text-base font-medium text-white">파이프라인 상태</h3>
         <div className="mt-4 flex flex-wrap items-center gap-4">
            {["수집", "발행", "배포"].map((step, idx) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold text-white">
                  {idx + 1}
                </div>
                <span className="text-sm text-white/50">{step}</span>
                {idx < 2 && (
                  <span className="text-white/15">→</span>
                )}
              </div>
            ))}
         </div>
       </div>
    </div>
  );
}
