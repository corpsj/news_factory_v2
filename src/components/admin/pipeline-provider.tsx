"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";

export type PipelineEvent =
  | { type: "pipeline_start"; totalSites: number; siteIds: string[]; siteNames: string[] }
  | { type: "stage_start"; stage: string }
  | { type: "site_complete"; siteId: string; siteName: string; found: number; inserted: number; failed: number; status: string; durationMs: number; errorMessage?: string }
  | { type: "stage_complete"; stage: string; durationMs: number; detail: Record<string, unknown> }
  | { type: "pipeline_complete"; success: boolean; totalDurationMs: number; partial?: boolean; message?: string }
  | { type: "error"; message: string };

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
  const completedCountRef = useRef(0);

  const showProgress = totalSites > 0;

  useEffect(() => {
    if (!running || !startTime) return;
    const interval = setInterval(() => setElapsedMs(Date.now() - startTime), 1000);
    return () => clearInterval(interval);
  }, [running, startTime]);

  const resetPipeline = useCallback(() => {
    setTotalSites(0);
    setCompletedCount(0);
    completedCountRef.current = 0;
    setSiteProgress(new Map());
    setStages({ ...INITIAL_STAGES });
    setPipelineResult(null);
    setStartTime(null);
    setElapsedMs(0);
    setError(null);
  }, []);

  const startPipeline = useCallback((config: PipelineConfig) => {
    if (activeRef.current) return;
    activeRef.current = true;

    resetPipeline();
    setRunning(true);
    const pipelineStartMs = Date.now();
    setStartTime(pipelineStartMs);

    function processEvent(event: PipelineEvent) {
      switch (event.type) {
        case "pipeline_start": {
          setTotalSites(event.totalSites);
          const initial = new Map<string, SiteProgress>();
          event.siteIds.forEach((id, i) => {
            initial.set(id, { siteName: event.siteNames[i], status: "waiting", found: 0, inserted: 0 });
          });
          setSiteProgress(initial);
          break;
        }
        case "stage_start":
          setStages((prev) => ({ ...prev, [event.stage]: { status: "active" } }));
          break;
        case "site_complete":
          setSiteProgress((prev) => {
            const next = new Map(prev);
            next.set(event.siteId, {
              siteName: event.siteName,
              status: event.status as "success" | "failed" | "partial",
              found: event.found,
              inserted: event.inserted,
              errorMessage: event.errorMessage,
            });
            return next;
          });
          completedCountRef.current += 1;
          setCompletedCount((prev) => prev + 1);
          break;
        case "stage_complete":
          setStages((prev) => ({
            ...prev,
            [event.stage]: { status: "completed", durationMs: event.durationMs, detail: event.detail },
          }));
          break;
        case "pipeline_complete":
          setPipelineResult(event);
          break;
        case "error":
          setError(event.message);
          break;
      }
    }

    (async () => {
      try {
        const body: Record<string, unknown> = {
          siteIds: config.siteIds?.length ? config.siteIds : undefined,
        };
        if (config.dateRange) {
          body.dateRange = config.dateRange;
        }

        const res = await fetch("/api/admin/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text();
          let msg = `HTTP ${res.status}`;
          try { msg = JSON.parse(text).error ?? msg; } catch { /* non-JSON */ }
          throw new Error(msg);
        }

        if (!res.body) throw new Error("응답 스트림 없음");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try { processEvent(JSON.parse(line)); } catch { /* skip malformed */ }
          }
        }

        if (buffer.trim()) {
          try { processEvent(JSON.parse(buffer)); } catch { /* skip trailing */ }
        }
      } catch (err) {
        if (completedCountRef.current > 0) {
          setPipelineResult({
            success: true,
            totalDurationMs: Date.now() - pipelineStartMs,
            partial: true,
            message: "연결이 끊어졌지만 일부 사이트가 처리되었습니다",
          });
        } else {
          setError(err instanceof Error ? err.message : "파이프라인 실행 실패");
        }
      } finally {
        setRunning(false);
        activeRef.current = false;
      }
    })();
  }, [resetPipeline]);

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
