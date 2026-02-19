import { createClient } from "@supabase/supabase-js";
import { SITES, SITES_BY_ID } from "@/config/sites";
import type { HealthStatus, CrawlStatus, FailureReason } from "@/lib/services/crawl-monitor";

interface SiteStatusCard {
  site_id: string;
  site_name: string;
  list_url: string;
  health: HealthStatus;
  status: CrawlStatus | null;
  last_crawl_at: string | null;
  articles_found: number;
  articles_new: number;
  consecutive_failures: number;
  crawl_duration_ms: number | null;
  error_message: string | null;
  failure_reason: FailureReason | null;
}

const HEALTH_CONFIG: Record<HealthStatus, { color: string; border: string; dot: string; label: string }> = {
  healthy: {
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
    label: "정상",
  },
  warning: {
    color: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
    label: "주의",
  },
  critical: {
    color: "text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-400",
    label: "위험",
  },
  unknown: {
    color: "text-zinc-500",
    border: "border-zinc-700",
    dot: "bg-zinc-600",
    label: "미확인",
  },
};

const FAILURE_LABELS: Record<FailureReason, string> = {
  network_error: "네트워크 오류",
  structure_change: "구조 변경",
  server_maintenance: "서버 점검",
  unknown: "알 수 없음",
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

async function getSiteStatuses(): Promise<{
  sites: SiteStatusCard[];
  summary: { healthy: number; warning: number; critical: number; unknown: number };
}> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key || url.includes("your-project-ref")) {
    const emptySites: SiteStatusCard[] = SITES.map((s) => ({
      site_id: s.id,
      site_name: s.name,
      list_url: s.listUrl,
      health: "unknown" as HealthStatus,
      status: null,
      last_crawl_at: null,
      articles_found: 0,
      articles_new: 0,
      consecutive_failures: 0,
      crawl_duration_ms: null,
      error_message: null,
      failure_reason: null,
    }));
    return { sites: emptySites, summary: { healthy: 0, warning: 0, critical: 0, unknown: SITES.length } };
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: logs, error } = await supabase
    .from("crawl_logs")
    .select("site_name, site_url, status, articles_found, articles_new, error_message, started_at, completed_at")
    .not("site_name", "like", "pipeline:%")
    .order("completed_at", { ascending: false })
    .limit(300);

  if (error) {
    const fallback: SiteStatusCard[] = SITES.map((s) => ({
      site_id: s.id,
      site_name: s.name,
      list_url: s.listUrl,
      health: "unknown" as HealthStatus,
      status: null,
      last_crawl_at: null,
      articles_found: 0,
      articles_new: 0,
      consecutive_failures: 0,
      crawl_duration_ms: null,
      error_message: null,
      failure_reason: null,
    }));
    return { sites: fallback, summary: { healthy: 0, warning: 0, critical: 0, unknown: SITES.length } };
  }

  const typedLogs = (logs ?? []) as Array<{
    site_name: string;
    site_url: string;
    status: CrawlStatus;
    articles_found: number;
    articles_new: number;
    error_message: string | null;
    started_at: string;
    completed_at: string;
  }>;

  const logsBySite = new Map<string, typeof typedLogs>();
  for (const log of typedLogs) {
    const existing = logsBySite.get(log.site_name) ?? [];
    existing.push(log);
    logsBySite.set(log.site_name, existing);
  }

  const CONSECUTIVE_FAILURE_THRESHOLD = 3;
  const NETWORK_KEYWORDS = ["econnrefused", "enotfound", "etimedout", "econnreset", "socket hang up", "network", "timeout", "getaddrinfo"];
  const STRUCTURE_KEYWORDS = ["no articles found", "selector", "parse", "cannot read propert", "undefined", "null", "expected", "cheerio"];
  const MAINTENANCE_KEYWORDS = ["503", "502", "500", "403", "maintenance", "service unavailable", "temporarily", "under construction"];

  function classifyReason(msg: string | null): FailureReason | null {
    if (!msg) return null;
    const lower = msg.toLowerCase();
    if (NETWORK_KEYWORDS.some((kw) => lower.includes(kw))) return "network_error";
    if (STRUCTURE_KEYWORDS.some((kw) => lower.includes(kw))) return "structure_change";
    if (MAINTENANCE_KEYWORDS.some((kw) => lower.includes(kw))) return "server_maintenance";
    return "unknown";
  }

  const sites: SiteStatusCard[] = SITES.map((site) => {
    const siteLogs = logsBySite.get(site.name) ?? [];
    const latest = siteLogs[0] ?? null;

    let consecutiveFailures = 0;
    for (const log of siteLogs) {
      if (log.status === "failed") consecutiveFailures++;
      else break;
    }

    let health: HealthStatus = "unknown";
    if (latest) {
      if (latest.status === "success") {
        health = "healthy";
      } else if (latest.status === "partial") {
        health = consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD ? "warning" : "healthy";
      } else if (latest.status === "failed") {
        health = consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD ? "critical" : "warning";
      }
    }

    const durationMs =
      latest?.started_at && latest?.completed_at
        ? new Date(latest.completed_at).getTime() - new Date(latest.started_at).getTime()
        : null;

    return {
      site_id: site.id,
      site_name: site.name,
      list_url: site.listUrl,
      health,
      status: latest?.status ?? null,
      last_crawl_at: latest?.completed_at ?? null,
      articles_found: latest?.articles_found ?? 0,
      articles_new: latest?.articles_new ?? 0,
      consecutive_failures: consecutiveFailures,
      crawl_duration_ms: durationMs,
      error_message: latest?.error_message ?? null,
      failure_reason: latest?.status === "failed" ? classifyReason(latest.error_message) : null,
    };
  });

  const summary = { healthy: 0, warning: 0, critical: 0, unknown: 0 };
  for (const s of sites) {
    summary[s.health]++;
  }

  return { sites, summary };
}

export default async function MonitoringPage() {
  const { sites, summary } = await getSiteStatuses();

  const healthOrder: HealthStatus[] = ["critical", "warning", "unknown", "healthy"];
  const sorted = [...sites].sort(
    (a, b) => healthOrder.indexOf(a.health) - healthOrder.indexOf(b.health),
  );

  return (
    <div>
      <div className="mb-8">
         <h2 className="text-[28px] font-semibold tracking-tight text-white">크롤러 모니터링</h2>
         <p className="mt-1 text-sm text-white/40">
           {SITES.length}개 사이트 실시간 상태
         </p>
       </div>

      <div className="mb-8 grid grid-cols-4 gap-3">
         <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3">
           <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
           <div>
             <p className="text-[11px] text-white/30">정상</p>
             <p className="text-xl font-bold text-emerald-400">{summary.healthy}</p>
           </div>
         </div>
         <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3">
           <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
           <div>
             <p className="text-[11px] text-white/30">주의</p>
             <p className="text-xl font-bold text-amber-400">{summary.warning}</p>
           </div>
         </div>
         <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3">
           <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
           <div>
             <p className="text-[11px] text-white/30">위험</p>
             <p className="text-xl font-bold text-red-400">{summary.critical}</p>
           </div>
         </div>
         <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
           <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
           <div>
             <p className="text-[11px] text-white/30">미확인</p>
             <p className="text-xl font-light text-white/40">{summary.unknown}</p>
           </div>
         </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map((site) => {
          const cfg = HEALTH_CONFIG[site.health];

          return (
            <a
               key={site.site_id}
               href={site.list_url}
               target="_blank"
               rel="noopener noreferrer"
               className={`block rounded-xl border ${cfg.border} bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]`}
            >
              <div className="mb-3 flex items-center justify-between">
                 <h3 className="text-sm font-medium text-white/90 truncate pr-2">
                   {site.site_name}
                 </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-xs font-medium ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                 <div className="flex justify-between text-white/30">
                   <span>마지막 크롤링</span>
                   <span className="text-white/50">
                     {site.last_crawl_at
                       ? formatRelativeTime(site.last_crawl_at)
                       : "—"}
                   </span>
                 </div>
                 <div className="flex justify-between text-white/30">
                   <span>수집 건수</span>
                   <span className="text-white/50">
                     {site.articles_found}건
                     {site.articles_new > 0 && (
                       <span className="ml-1 text-emerald-400">
                         (+{site.articles_new})
                       </span>
                     )}
                   </span>
                 </div>
                 {site.crawl_duration_ms !== null && (
                   <div className="flex justify-between text-white/30">
                     <span>소요 시간</span>
                     <span className="text-white/50">
                       {formatDuration(site.crawl_duration_ms)}
                     </span>
                   </div>
                 )}
                 {site.consecutive_failures > 0 && (
                   <div className="flex justify-between text-white/30">
                     <span>연속 실패</span>
                     <span className="text-red-400">
                       {site.consecutive_failures}회
                     </span>
                   </div>
                 )}
               </div>

              {site.failure_reason && (
                 <div className="mt-3 rounded-lg bg-red-500/[0.07] px-2.5 py-1.5">
                   <p className="text-xs text-red-400">
                     {FAILURE_LABELS[site.failure_reason]}
                   </p>
                   {site.error_message && (
                     <p className="mt-0.5 truncate text-[10px] text-red-400/70">
                       {site.error_message}
                     </p>
                   )}
                 </div>
               )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
