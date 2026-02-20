"use client";

import { useState, useCallback } from "react";
import type { HealthStatus, CrawlStatus, FailureReason } from "@/lib/services/crawl-monitor";

interface SiteStatus {
  site_id: string;
  site_name: string;
  site_url: string;
  last_crawl_at: string | null;
  status: CrawlStatus | null;
  health: HealthStatus;
  articles_found: number;
  articles_new: number;
  error_message: string | null;
  failure_reason: FailureReason | null;
  consecutive_failures: number;
  crawl_duration_ms: number | null;
}

interface MonitoringData {
  sites: SiteStatus[];
  summary: Record<HealthStatus, number>;
}

const HEALTH_CONFIG: Record<HealthStatus, { color: string; border: string; dot: string; label: string; glow: string }> = {
  healthy: {
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
    label: "정상",
    glow: "shadow-emerald-500/5",
  },
  warning: {
    color: "text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    label: "주의",
    glow: "shadow-amber-500/5",
  },
  critical: {
    color: "text-red-400",
    border: "border-red-500/20",
    dot: "bg-red-400",
    label: "위험",
    glow: "shadow-red-500/5",
  },
  unknown: {
    color: "text-white/25",
    border: "border-white/[0.06]",
    dot: "bg-zinc-600",
    label: "미확인",
    glow: "",
  },
};

const FAILURE_LABELS: Record<FailureReason, string> = {
  network_error: "네트워크 오류",
  structure_change: "구조 변경",
  server_maintenance: "서버 점검",
  unknown: "알 수 없음",
};

const SITE_GROUPS: { label: string; ids: string[] }[] = [
  {
    label: "광주광역시",
    ids: ["gwangju-city", "donggu", "seogu", "namgu", "bukgu", "gwangsan"],
  },
  {
    label: "전라남도",
    ids: ["jeonnam-province", "mokpo", "yeosu", "suncheon", "naju", "gwangyang"],
  },
  {
    label: "군 지역",
    ids: [
      "damyang", "gokseong", "gurye", "goheung", "boseong", "hwasun",
      "jangheung", "gangjin", "haenam", "muan", "hampyeong", "yeonggwang",
      "jangseong", "wando", "shinan",
    ],
  },
];

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

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function MonitoringPanel({ initial }: { initial: MonitoringData }) {
  const [data, setData] = useState<MonitoringData>(initial);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/monitoring");
      if (!res.ok) {
        const body = await res.text();
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(body).error ?? msg; } catch { /* non-JSON */ }
        throw new Error(msg);
      }
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "상태 확인 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  const siteMap = new Map(data.sites.map((s) => [s.site_id, s]));
  const { summary } = data;

  const summaryCards: { key: HealthStatus; label: string; color: string; dotColor: string; borderColor: string; bgColor: string }[] = [
    { key: "healthy", label: "정상", color: "text-emerald-400", dotColor: "bg-emerald-400", borderColor: "border-emerald-500/20", bgColor: "bg-emerald-500/[0.05]" },
    { key: "warning", label: "주의", color: "text-amber-400", dotColor: "bg-amber-400", borderColor: "border-amber-500/20", bgColor: "bg-amber-500/[0.05]" },
    { key: "critical", label: "위험", color: "text-red-400", dotColor: "bg-red-400", borderColor: "border-red-500/20", bgColor: "bg-red-500/[0.05]" },
    { key: "unknown", label: "미확인", color: "text-white/40", dotColor: "bg-zinc-600", borderColor: "border-white/[0.06]", bgColor: "bg-white/[0.03]" },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-white">수집 현황</h2>
          <p className="mt-1 text-sm text-white/40">
            {data.sites.length}개 사이트 상태 현황
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-white/20">
              {formatTimestamp(lastRefreshed)} 갱신
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="group relative flex items-center gap-2 rounded-lg border border-white/[0.10] bg-white/[0.05] px-4 py-2 text-sm font-medium text-white/70 transition-all hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            <svg
              className={`h-4 w-4 transition-transform ${loading ? "animate-spin" : "group-hover:rotate-45"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? "확인 중..." : "상태 확인"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.key}
            className={`flex items-center gap-3 rounded-xl border ${card.borderColor} ${card.bgColor} px-4 py-3 transition-all duration-300`}
          >
            <div className={`h-2.5 w-2.5 rounded-full ${card.dotColor} ${card.key !== "unknown" && summary[card.key] > 0 ? "animate-pulse" : ""}`} />
            <div>
              <p className="text-[11px] text-white/30">{card.label}</p>
              <p className={`text-xl font-bold ${card.key === "unknown" ? "font-light text-white/40" : card.color}`}>
                {summary[card.key]}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {SITE_GROUPS.map((group) => {
          const groupSites = group.ids.map((id) => siteMap.get(id)).filter(Boolean) as SiteStatus[];
          if (groupSites.length === 0) return null;

          const healthOrder: HealthStatus[] = ["critical", "warning", "unknown", "healthy"];
          const sorted = [...groupSites].sort(
            (a, b) => healthOrder.indexOf(a.health) - healthOrder.indexOf(b.health),
          );

          const groupHealthy = groupSites.filter((s) => s.health === "healthy").length;
          const groupTotal = groupSites.length;

          return (
            <div key={group.label}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-sm font-medium text-white/50">{group.label}</h3>
                <div className="h-px flex-1 bg-white/[0.04]" />
                <span className="text-xs text-white/20">
                  {groupHealthy}/{groupTotal} 정상
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sorted.map((site) => {
                  const cfg = HEALTH_CONFIG[site.health];

                  return (
                    <a
                      key={site.site_id}
                      href={site.site_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group block rounded-xl border ${cfg.border} bg-white/[0.03] p-4 shadow-lg ${cfg.glow} transition-all duration-300 hover:bg-white/[0.06] hover:shadow-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white/90 truncate pr-2">
                          {site.site_name}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className={`h-2 w-2 rounded-full ${cfg.dot} ${site.health !== "unknown" ? "animate-pulse" : ""}`} />
                          <span className={`text-xs font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-white/30">
                          <span>마지막 수집</span>
                          <span className="text-white/50">
                            {site.last_crawl_at
                              ? formatRelativeTime(site.last_crawl_at)
                              : "기록 없음"}
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
                            <span className="text-red-400 font-medium">
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

                      <div className="mt-3 flex items-center gap-1 text-[10px] text-white/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span>원문 보기</span>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
