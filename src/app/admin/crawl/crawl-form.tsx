"use client";

import { useState, Fragment } from "react";
import {
  usePipeline,
  STAGE_KEYS,
  STAGE_LABELS,
  DETAIL_KEY_LABELS,
  formatElapsed,
  formatDuration,
} from "@/components/admin/pipeline-provider";

type SiteOption = { id: string; name: string };

const SITE_GROUPS: { label: string; ids: string[] }[] = [
  {
    label: "광주광역시",
    ids: ["gwangsan", "gwangju-city", "namgu", "donggu", "bukgu", "seogu"],
  },
  {
    label: "전라남도 시",
    ids: ["gwangyang", "naju", "mokpo", "suncheon", "yeosu"],
  },
  {
    label: "전라남도 군",
    ids: [
      "gangjin", "goheung", "gokseong", "gurye", "damyang", "muan", "boseong",
      "shinan", "yeonggwang", "wando", "jangseong", "jangheung", "jeonnam-province",
      "hampyeong", "haenam", "hwasun",
    ],
  },
];



type DatePreset = { label: string; key: string; days: number | null };

const DATE_PRESETS: DatePreset[] = [
  { label: "오늘", key: "today", days: 0 },
  { label: "3일", key: "3d", days: 3 },
  { label: "7일", key: "7d", days: 7 },
  { label: "한달", key: "1m", days: 30 },
  { label: "전체", key: "all", days: null },
];

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CrawlForm({ sites }: { sites: SiteOption[] }) {
  const {
    running, error, totalSites, completedCount, siteProgress,
    stages, pipelineResult, elapsedMs, showProgress,
    startPipeline, resetPipeline,
  } = usePipeline();

  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const siteMap = new Map(sites.map((s) => [s.id, s.name]));
  const allSelected = selectedSites.length === sites.length;
  const isComplete = pipelineResult !== null;

  function toggleAll() {
    setSelectedSites(allSelected ? [] : sites.map((s) => s.id));
  }

  function toggleSite(id: string) {
    setSelectedSites((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function selectPreset(preset: DatePreset) {
    setActivePreset(preset.key);
    if (preset.days === null) {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const today = new Date();
    setDateTo(toDateString(today));
    if (preset.days === 0) {
      setDateFrom(toDateString(today));
    } else {
      const from = new Date(today);
      from.setDate(from.getDate() - preset.days);
      setDateFrom(toDateString(from));
    }
  }

  function handleDateChange(field: "from" | "to", value: string) {
    setActivePreset(null);
    if (field === "from") setDateFrom(value);
    else setDateTo(value);
  }

  function handleSubmit() {
    startPipeline({
      siteIds: selectedSites.length > 0 ? selectedSites : undefined,
      dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/60">기관 선택</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/30">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4" />
            전체 {allSelected ? "해제" : "선택"}
          </label>
        </div>
        <div className="space-y-5">
          {SITE_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-[11px] font-medium text-white/25">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.ids.map((id) => {
                  const checked = selectedSites.includes(id);
                  return (
                    <label
                      key={id}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        checked
                          ? "border-white/[0.15] bg-white/[0.08] text-white"
                          : "border-white/[0.06] bg-white/[0.02] text-white/30 hover:border-white/[0.10] hover:text-white/50"
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleSite(id)} className="sr-only" />
                      {siteMap.get(id) ?? id}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {selectedSites.length > 0 && (
          <p className="mt-3 text-xs text-white/20">{selectedSites.length}개 선택됨</p>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <h3 className="mb-4 text-sm font-medium text-white/60">수집 기간</h3>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => selectPreset(preset)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                activePreset === preset.key
                  ? "border-white/[0.20] bg-white/[0.12] text-white"
                  : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:border-white/[0.12] hover:text-white/60"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="crawl-date-from" className="mb-1.5 block text-[11px] text-white/25">시작일</label>
            <input
              id="crawl-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateChange("from", e.target.value)}
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white/70 transition-colors focus:border-white/[0.15] focus:text-white focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="crawl-date-to" className="mb-1.5 block text-[11px] text-white/25">종료일</label>
            <input
              id="crawl-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => handleDateChange("to", e.target.value)}
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white/70 transition-colors focus:border-white/[0.15] focus:text-white focus:outline-none"
            />
          </div>
        </div>
        {dateFrom && dateTo && (
          <p className="mt-2.5 text-xs text-white/25">
            {dateFrom} ~ {dateTo}
          </p>
        )}
        {!dateFrom && !dateTo && (
          <p className="mt-2.5 text-xs text-white/20">미선택 시 전체 기간 수집</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={running}
        className="rounded-lg bg-white px-6 py-2.5 font-medium text-black transition-colors hover:bg-white/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running ? "파이프라인 실행 중..." : "수집 시작"}
      </button>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {showProgress && (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
            <div className="flex items-start justify-center">
              {STAGE_KEYS.map((stage, i) => {
                const info = stages[stage];
                const status = info?.status ?? "pending";
                const isLast = i === STAGE_KEYS.length - 1;
                return (
                  <Fragment key={stage}>
                    <div className="flex flex-col items-center gap-2.5">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                          status === "completed"
                            ? "border-emerald-500/60 bg-emerald-500/15"
                            : status === "active"
                              ? "border-white/30 bg-white/[0.08] animate-pulse"
                              : "border-white/[0.08] bg-white/[0.03]"
                        }`}
                      >
                        {status === "completed" ? (
                          <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div
                            className={`h-2.5 w-2.5 rounded-full transition-colors duration-500 ${
                              status === "active" ? "bg-white" : "bg-white/15"
                            }`}
                          />
                        )}
                      </div>
                      <div className="text-center">
                        <p
                          className={`text-xs font-medium transition-colors duration-500 ${
                            status === "completed"
                              ? "text-emerald-400"
                              : status === "active"
                                ? "text-white"
                                : "text-white/25"
                          }`}
                        >
                          {STAGE_LABELS[stage]}
                        </p>
                        {info?.durationMs != null && (
                          <p className="mt-0.5 text-[10px] text-white/20">{formatDuration(info.durationMs)}</p>
                        )}
                      </div>
                    </div>
                    {!isLast && (
                      <div
                        className={`mt-5 h-[2px] w-12 sm:w-20 transition-colors duration-500 ${
                          status === "completed" ? "bg-emerald-500/30" : "bg-white/[0.06]"
                        }`}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-white/50">
              <span className="text-lg font-semibold text-white">{completedCount}</span>
              <span className="text-white/30"> / {totalSites} 사이트 완료</span>
            </p>
            <p className="font-mono text-sm text-white/30">
              {formatElapsed(pipelineResult ? pipelineResult.totalDurationMs : elapsedMs)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from(siteProgress.entries()).map(([siteId, site]) => {
              const cfg =
                site.status === "success"
                  ? { dot: "bg-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]", text: "text-emerald-400/70", label: "성공" }
                  : site.status === "failed"
                    ? { dot: "bg-red-400", border: "border-red-500/20", bg: "bg-red-500/[0.04]", text: "text-red-400/70", label: "실패" }
                    : site.status === "partial"
                      ? { dot: "bg-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/[0.04]", text: "text-amber-400/70", label: "부분" }
                      : { dot: "bg-white/15", border: "border-white/[0.04]", bg: "bg-white/[0.02]", text: "text-white/20", label: "대기" };

              const hasError = !!site.errorMessage;
              const isExpanded = expandedSite === siteId;

              return (
                <button
                  type="button"
                  key={siteId}
                  onClick={hasError ? () => setExpandedSite(isExpanded ? null : siteId) : undefined}
                  className={`rounded-lg border text-left ${cfg.border} ${cfg.bg} px-3 py-2.5 transition-all duration-500 ${
                    hasError ? "cursor-pointer hover:border-red-500/30" : ""
                  } ${isExpanded ? "col-span-2 sm:col-span-3" : ""}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot} transition-colors duration-500`} />
                      <p className="truncate text-xs font-medium text-white/70">{site.siteName}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] ${cfg.text}`}>{cfg.label}</span>
                  </div>
                  {site.status !== "waiting" && (
                    <div className="mt-1.5 flex gap-3 text-[10px] text-white/25">
                      <span>발견 {site.found}</span>
                      <span>수집 {site.inserted}</span>
                    </div>
                  )}
                  {site.errorMessage && (
                    isExpanded ? (
                      <p className="mt-2 break-all text-[11px] leading-relaxed text-red-400/80">{site.errorMessage}</p>
                    ) : (
                      <p className="mt-1 truncate text-[10px] text-red-400/60">{site.errorMessage}</p>
                    )
                  )}
                </button>
              );
            })}
          </div>

          {isComplete && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {STAGE_KEYS.map((stage) => {
                  const info = stages[stage];
                  const detail = info?.detail ?? {};
                  const hasError = "error" in detail;
                  return (
                    <div key={stage} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-white/80">{STAGE_LABELS[stage]}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            info?.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400/70"
                              : "bg-red-500/10 text-red-400/70"
                          }`}
                        >
                          {info?.status === "completed" ? "완료" : "실패"}
                        </span>
                      </div>
                      {info?.durationMs != null && (
                        <p className="text-xs text-white/30">{formatDuration(info.durationMs)}</p>
                      )}
                      {hasError ? (
                        <p className="mt-2 text-xs text-red-400/70">{String(detail.error)}</p>
                      ) : (
                        Object.keys(detail).length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {Object.entries(detail).map(([k, v]) => (
                              <p key={k} className="text-xs text-white/20">
                                {DETAIL_KEY_LABELS[k] ?? k}: {String(v)}
                              </p>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={resetPipeline}
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-5 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
              >
                새로운 수집
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
