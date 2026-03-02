"use client";

import { useState, useEffect, useCallback } from "react";
import type { HealthStatus, CrawlStatus } from "@/lib/services/crawl-monitor";

interface CrawlHistoryEntry {
  status: CrawlStatus;
  articles_found: number;
  articles_new: number;
  error_message: string | null;
  started_at: string;
  completed_at: string;
  duration_ms: number;
}

interface SiteCrawlHistory {
  site_id: string;
  site_name: string;
  site_url: string;
  health: HealthStatus;
  total_crawls: number;
  successful_crawls: number;
  success_rate: number;
  avg_duration_ms: number;
  total_articles_found: number;
  total_articles_new: number;
  history: CrawlHistoryEntry[];
}

const HEALTH_CONFIG: Record<HealthStatus, { color: string; dot: string; label: string }> = {
  healthy: { color: "text-emerald-400", dot: "bg-emerald-400", label: "정상" },
  warning: { color: "text-amber-400", dot: "bg-amber-400", label: "주의" },
  critical: { color: "text-red-400", dot: "bg-red-400", label: "위험" },
  unknown: { color: "text-white/25", dot: "bg-zinc-600", label: "미확인" },
};

const STATUS_CONFIG: Record<CrawlStatus, { color: string; bg: string; label: string }> = {
  success: { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "성공" },
  failed: { color: "text-red-400", bg: "bg-red-500/10", label: "실패" },
  partial: { color: "text-amber-400", bg: "bg-amber-500/10", label: "부분" },
};

function formatFullTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

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

export function SiteDetailDrawer({
  siteId,
  onClose,
}: {
  siteId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<SiteCrawlHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/monitoring/${id}`);
      if (!res.ok) {
        const body = await res.text();
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(body).error ?? msg; } catch { /* intentional: non-JSON fallback */ }
        throw new Error(msg);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터 조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (siteId) {
      fetchHistory(siteId);
    } else {
      setData(null);
    }
  }, [siteId, fetchHistory]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (siteId) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [siteId, onClose]);

  const isOpen = siteId !== null;

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-label="닫기"
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-white/[0.06] bg-[#0c0c0e] transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="min-w-0 flex-1">
            {data ? (
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-lg font-semibold text-white">
                    {data.site_name}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`h-2 w-2 rounded-full ${HEALTH_CONFIG[data.health].dot}`} />
                    <span className={`text-xs font-medium ${HEALTH_CONFIG[data.health].color}`}>
                      {HEALTH_CONFIG[data.health].label}
                    </span>
                  </div>
                </div>
                <a
                  href={data.site_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-xs text-white/30 hover:text-white/50 transition-colors"
                >
                  {data.site_url}
                </a>
              </div>
            ) : (
              <div className="h-6 w-32 animate-pulse rounded bg-white/[0.06]" />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60 cursor-pointer"
            aria-label="닫기"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white/50" />
            </div>
          )}

          {error && (
            <div className="m-6 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {data && !loading && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="총 수집 횟수" value={`${data.total_crawls}회`} />
                <StatCard
                  label="성공률"
                  value={`${data.success_rate}%`}
                  valueColor={
                    data.success_rate >= 90
                      ? "text-emerald-400"
                      : data.success_rate >= 70
                        ? "text-amber-400"
                        : "text-red-400"
                  }
                />
                <StatCard label="수집된 보도자료" value={`${data.total_articles_found}건`} />
                <StatCard label="신규 보도자료" value={`${data.total_articles_new}건`} sub={data.avg_duration_ms > 0 ? `평균 ${formatDuration(data.avg_duration_ms)}` : undefined} />
              </div>

              <div>
                <h4 className="mb-3 text-sm font-medium text-white/50">수집 이력</h4>
                {data.history.length === 0 ? (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 text-center">
                    <p className="text-sm text-white/30">수집 이력이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.history.map((entry, idx) => {
                      const statusCfg = STATUS_CONFIG[entry.status];
                      return (
                        <div
                          key={`${entry.started_at}-${idx}`}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusCfg.color} ${statusCfg.bg}`}>
                              {statusCfg.label}
                            </span>
                            <div className="text-right">
                              <p className="text-xs text-white/50">
                                {formatFullTimestamp(entry.completed_at)}
                              </p>
                              <p className="text-[10px] text-white/25">
                                {formatRelativeTime(entry.completed_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            <span className="text-white/30">
                              발견 <span className="text-white/60">{entry.articles_found}건</span>
                            </span>
                            {entry.articles_new > 0 && (
                              <span className="text-white/30">
                                신규 <span className="text-emerald-400">+{entry.articles_new}건</span>
                              </span>
                            )}
                            {entry.duration_ms > 0 && (
                              <span className="text-white/30">
                                소요 <span className="text-white/60">{formatDuration(entry.duration_ms)}</span>
                              </span>
                            )}
                          </div>

                          {entry.error_message && (
                            <div className="mt-2 rounded-lg bg-red-500/[0.07] px-2.5 py-1.5">
                              <p className="text-[11px] text-red-400/80 break-all">
                                {entry.error_message}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function StatCard({
  label,
  value,
  valueColor,
  sub,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] text-white/30">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueColor ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-[10px] text-white/25">{sub}</p>}
    </div>
  );
}
