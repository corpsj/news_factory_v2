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

export const STAGE_KEYS = ["crawl", "publish"] as const;
export const STAGE_LABELS: Record<string, string> = {
  crawl: "수집",
  publish: "발행",
};

export const DETAIL_KEY_LABELS: Record<string, string> = {
  totalSites: "사이트",
  totalFound: "발견",
  totalInserted: "수집",
  totalFailed: "실패",
  total: "대상",
  published: "발행",
  generated: "발행",
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
  publish: { status: "pending" },
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
const STORAGE_KEY = "nf_pipeline_session";

type PersistedSession = { triggeredAt: string; totalSites: number; startTime: number };

function saveSession(session: PersistedSession) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch {}
}

function loadSession(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearSession() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

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
  const recoveredRef = useRef(false);

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
    clearSession();
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
    setCompletedCount(progress.size);

    const stageMap = new Map<string, CrawlLogRow>();
    for (const log of data.stageResults) {
      stageMap.set(log.site_name, log);
    }

    setStages(() => {
      const next: Record<string, StageProgress> = {
        crawl: { status: "active" },
        publish: { status: "pending" },
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
        next.publish = { status: stageMap.has("pipeline:publish") ? "completed" : "active" };
      }

      const publishLog = stageMap.get("pipeline:publish");
      if (publishLog) {
        const durationMs = new Date(publishLog.completed_at).getTime() - new Date(publishLog.started_at).getTime();
        next.publish = { status: "completed", durationMs };
      }

      return next;
    });

    if (data.isComplete) {
      stopPolling();
      clearSession();
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

  useEffect(() => {
    if (recoveredRef.current) return;
    recoveredRef.current = true;

    const session = loadSession();
    if (!session) return;

    activeRef.current = true;
    triggeredAtRef.current = session.triggeredAt;
    startTimeRef.current = session.startTime;
    setRunning(true);
    setStartTime(session.startTime);
    setTotalSites(session.totalSites);
    setStages({ crawl: { status: "active" }, publish: { status: "pending" } });

    fetch(`/api/admin/pipeline-runs?since=${session.triggeredAt}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PollResponse | null) => {
        if (data) processPollData(data);
        if (!data?.isComplete) {
          pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
        }
      })
      .catch(() => {
        clearSession();
        setRunning(false);
        activeRef.current = false;
      });
  }, [processPollData, poll]);

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
        publish: { status: "pending" },
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
          saveSession({ triggeredAt: result.triggeredAt, totalSites: config.siteIds?.length || 27, startTime: now });

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
