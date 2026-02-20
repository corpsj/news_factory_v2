"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePipeline, STAGE_KEYS, STAGE_LABELS, formatElapsed } from "./pipeline-provider";

export function PipelineToast() {
  const { running, showProgress, pipelineResult, error, completedCount, totalSites, stages, elapsedMs } = usePipeline();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (running) setDismissed(false);
  }, [running]);

  useEffect(() => {
    if (!pipelineResult || running) return;
    const timer = setTimeout(() => setDismissed(true), 12000);
    return () => clearTimeout(timer);
  }, [pipelineResult, running]);

  const isComplete = pipelineResult !== null;
  const isVisible = showProgress && !dismissed;

  if (!isVisible) return null;

  const activeStage = STAGE_KEYS.find((k) => stages[k]?.status === "active");
  const activeLabel = activeStage ? STAGE_LABELS[activeStage] : null;
  const elapsed = formatElapsed(pipelineResult ? pipelineResult.totalDurationMs : elapsedMs);
  const progress = totalSites > 0 ? Math.round((completedCount / totalSites) * 100) : 0;

  return (
    <div className="fixed right-5 top-5 z-50 w-72 animate-[toast-in_0.3s_ease-out] rounded-xl border border-white/[0.08] bg-[#111114] shadow-2xl shadow-black/50">
      <Link
        href="/admin/crawl"
        className="block p-4 transition-colors hover:bg-white/[0.03] rounded-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {running ? (
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            ) : isComplete && pipelineResult?.success ? (
              <svg className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium text-white/80">
              {running
                ? (activeLabel ? `${activeLabel} 중` : "파이프라인 준비 중")
                : isComplete && pipelineResult?.success
                  ? "파이프라인 완료"
                  : "파이프라인 오류"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs text-white/30">{elapsed}</span>
            {!running && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true); }}
                className="rounded p-0.5 text-white/20 transition-colors hover:text-white/50 cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {running && activeStage === "crawl" && totalSites > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 flex justify-between text-[11px]">
              <span className="text-white/30">{completedCount}/{totalSites} 사이트</span>
              <span className="text-white/20">{progress}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-white/25 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {running && activeStage && activeStage !== "crawl" && (
          <p className="mt-2 text-xs text-white/25">처리 중...</p>
        )}

        {error && !running && (
          <p className="mt-2 truncate text-xs text-red-400/70">{error}</p>
        )}

        {isComplete && pipelineResult?.success && (
          <p className="mt-1.5 text-xs text-white/20">{totalSites}개 사이트 처리 완료</p>
        )}
      </Link>
    </div>
  );
}
