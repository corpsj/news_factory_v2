"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";

export type SiteProgress = {
  siteName: string;
  status: "waiting" | "success" | "failed" | "partial";
  found: number;
  inserted: number;
  errorMessage?: string;
};

export type StageProgress = {
  status: "pending" | "active" | "completed";
  durationMs?: number;
  detail?: Record<string, unknown>;
};

export interface PipelineConfig {
  siteIds?: string[];
  dateRange?: { from: string; to: string };
}

export const STAGE_KEYS = ["crawl", "embed", "generate"] as const;
export const STAGE_LABELS: Record<string, string> = {
  crawl: "크롤링",
  embed: "임베딩",
  generate: "기사 생성",
};

export const DETAIL_KEY_LABELS: Record<string, string> = {
  totalSites: "사이트",
  totalFound: "발견",
  totalInserted: "수집",
  totalFailed: "실패",
  total: "대상",
  embedded: "임베딩",
  generated: "생성",
  failed: "실패",
};

export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}초`;
  const min = Math.floor(sec / 60);
  const remainSec = Math.round(sec % 60);
  return `${min}분 ${remainSec}초`;
}

const INITIAL_STAGES: Record<string, StageProgress> = {
  crawl: { status: "pending" },
  embed: { status: "pending" },
  generate: { status: "pending" },
};

type CrawlLogRow = {
  site_name: string;
  status: string;
  articles_found: number;
  articles_new: number;
  error_message: string | null;
  started_at: string;
  completed_at: string;
};

type PollResponse = {
  siteResults: CrawlLogRow[];
  stageResults: CrawlLogRow[];
  isComplete: boolean;
};

interface PipelineContextValue {
  running: boolean;
  error: string | null;
  totalSites: number;
  completedCount: number;
  siteProgress: Map<string, SiteProgress>;
  stages: Record<string, StageProgress>;
  pipelineResult: { success: boolean; totalDurationMs: number; partial?: boolean; message?: string } | null;
  elapsedMs: number;
  showProgress: boolean;
  startPipeline: (config: PipelineConfig) => void;
  resetPipeline: () => void;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
  return ctx;
}

const POLL_INTERVAL_MS = 5_000;

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSites, setTotalSites] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [siteProgress, setSiteProgress] = useState<Map<string, SiteProgress>>(new Map());
  const [stages, setStages] = useState<Record<string, StageProgress>>({ ...INITIAL_STAGES });
  const [pipelineResult, setPipelineResult] = useState<{ success: boolean; totalDurationMs: number; partial?: boolean; message?: string } | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const activeRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triggeredAtRef = useRef<string | null>(null);
  const startTimeRef = useRef(0);

  const showProgress = running || totalSites > 0;

  useEffect(() => {
    if (!running || !startTime) return;
    const interval = setInterval(() => setElapsedMs(Date.now() - startTime), 1000);
    return () => clearInterval(interval);
  }, [running, startTime]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const resetPipeline = useCallback(() => {
    stopPolling();
    triggeredAtRef.current = null;
    setTotalSites(0);
    setCompletedCount(0);
    setSiteProgress(new Map());
    setStages({ ...INITIAL_STAGES });
    setPipelineResult(null);
    setStartTime(null);
    setElapsedMs(0);
    setError(null);
  }, [stopPolling]);

  const processPollData = useCallback((data: PollResponse) => {
    const progress = new Map<string, SiteProgress>();
    for (const log of data.siteResults) {
      progress.set(log.site_name, {
        siteName: log.site_name,
        status: log.status as "success" | "failed" | "partial",
        found: log.articles_found,
        inserted: log.articles_new,
        errorMessage: log.error_message ?? undefined,
      });
    }
    setSiteProgress(progress);
    setCompletedCount(data.siteResults.length);

    const stageMap = new Map<string, CrawlLogRow>();
    for (const log of data.stageResults) {
      stageMap.set(log.site_name, log);
    }

    setStages(() => {
      const next: Record<string, StageProgress> = {
        crawl: { status: "active" },
        embed: { status: "pending" },
        generate: { status: "pending" },
      };

      const crawlLog = stageMap.get("pipeline:crawl");
      if (crawlLog) {
        const durationMs = new Date(crawlLog.completed_at).getTime() - new Date(crawlLog.started_at).getTime();
        const totalFound = data.siteResults.reduce((sum, s) => sum + s.articles_found, 0);
        const totalInserted = data.siteResults.reduce((sum, s) => sum + s.articles_new, 0);
        const totalFailed = data.siteResults.filter((s) => s.status === "failed").length;
        next.crawl = {
          status: "completed",
          durationMs,
          detail: { totalSites: data.siteResults.length, totalFound, totalInserted, totalFailed },
        };
        next.embed = { status: stageMap.has("pipeline:embed") ? "completed" : "active" };
      }

      const embedLog = stageMap.get("pipeline:embed");
      if (embedLog) {
        const durationMs = new Date(embedLog.completed_at).getTime() - new Date(embedLog.started_at).getTime();
        next.embed = { status: "completed", durationMs };
        next.generate = { status: stageMap.has("pipeline:generate") ? "completed" : "active" };
      }

      const generateLog = stageMap.get("pipeline:generate");
      if (generateLog) {
        const durationMs = new Date(generateLog.completed_at).getTime() - new Date(generateLog.started_at).getTime();
        next.generate = { status: "completed", durationMs };
      }

      return next;
    });

    if (data.isComplete) {
      stopPolling();
      const hasFailed = data.stageResults.some((s) => s.status === "failed");
      setPipelineResult({
        success: !hasFailed,
        totalDurationMs: Date.now() - startTimeRef.current,
      });
      setRunning(false);
      activeRef.current = false;
    }
  }, [stopPolling]);

  const poll = useCallback(() => {
    if (!triggeredAtRef.current) return;

    fetch(`/api/admin/pipeline-runs?since=${triggeredAtRef.current}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PollResponse | null) => {
        if (data) processPollData(data);
      })
      .catch(() => {
        /* retry next interval */
      });
  }, [processPollData]);

  const startPipeline = useCallback(
    (config: PipelineConfig) => {
      if (activeRef.current) return;
      activeRef.current = true;

      resetPipeline();
      setRunning(true);
      const now = Date.now();
      startTimeRef.current = now;
      setStartTime(now);
      setTotalSites(config.siteIds?.length || 27);
      setStages({
        crawl: { status: "active" },
        embed: { status: "pending" },
        generate: { status: "pending" },
      });

      (async () => {
        try {
          const body: Record<string, unknown> = {};
          if (config.siteIds?.length) body.siteIds = config.siteIds;
          if (config.dateRange) body.dateRange = config.dateRange;

          const res = await fetch("/api/admin/trigger-crawl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
          }

          const result = (await res.json()) as { triggeredAt: string };
          triggeredAtRef.current = result.triggeredAt;

          pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
        } catch (err) {
          setError(err instanceof Error ? err.message : "파이프라인 트리거 실패");
          setRunning(false);
          activeRef.current = false;
        }
      })();
    },
    [resetPipeline, poll],
  );

  const value: PipelineContextValue = {
    running,
    error,
    totalSites,
    completedCount,
    siteProgress,
    stages,
    pipelineResult,
    elapsedMs,
    showProgress,
    startPipeline,
    resetPipeline,
  };

  return (
    <PipelineContext.Provider value={value}>
      {children}
    </PipelineContext.Provider>
  );
}
