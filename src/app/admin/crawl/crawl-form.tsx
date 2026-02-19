"use client";

import { useState } from "react";

type SiteOption = { id: string; name: string };

type ManualCrawlResult = {
  success: boolean;
  totalDurationMs: number;
  stages: {
    crawl: {
      status: string;
      durationMs: number;
      detail: Record<string, unknown>;
    };
    embed: {
      status: string;
      durationMs: number;
      detail: Record<string, unknown>;
    };
    generate: {
      status: string;
      durationMs: number;
      detail: Record<string, unknown>;
    };
  };
  error?: string;
};

const SITE_GROUPS: { label: string; ids: string[] }[] = [
  {
    label: "광주광역시",
    ids: [
      "gwangju-city",
      "donggu",
      "seogu",
      "namgu",
      "bukgu",
      "gwangsan",
    ],
  },
  {
    label: "전라남도",
    ids: [
      "jeonnam-province",
      "mokpo",
      "yeosu",
      "suncheon",
      "naju",
      "gwangyang",
    ],
  },
  {
    label: "군·군",
    ids: [
      "damyang",
      "gokseong",
      "gurye",
      "goheung",
      "boseong",
      "hwasun",
      "jangheung",
      "gangjin",
      "haenam",
      "muan",
      "hampyeong",
      "yeonggwang",
      "jangseong",
      "wando",
      "shinan",
    ],
  },
];

const STAGE_LABELS: Record<string, string> = {
  crawl: "크롤링",
  embed: "임베딩",
  generate: "기사 생성",
};

export function CrawlForm({ sites }: { sites: SiteOption[] }) {
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [maxPages, setMaxPages] = useState(1);
  const [limitPerSite, setLimitPerSite] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ManualCrawlResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const siteMap = new Map(sites.map((s) => [s.id, s.name]));
  const allSelected = selectedSites.length === sites.length;

  function toggleAll() {
    setSelectedSites(allSelected ? [] : sites.map((s) => s.id));
  }

  function toggleSite(id: string) {
    setSelectedSites((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        siteIds: selectedSites.length > 0 ? selectedSites : undefined,
        limitPerSite,
        maxPages,
      };
      if (dateFrom && dateTo) {
        body.dateRange = { from: dateFrom, to: dateTo };
      }
      const res = await fetch("/api/admin/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "크롤링 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
         <div className="mb-4 flex items-center justify-between">
           <h3 className="text-sm font-medium text-white/60">기관 선택</h3>
           <label className="flex cursor-pointer items-center gap-2 text-sm text-white/30">
             <input
               type="checkbox"
               checked={allSelected}
               onChange={toggleAll}
               className="h-4 w-4"
             />
             전체 {allSelected ? "해제" : "선택"}
           </label>
         </div>

        <div className="space-y-5">
           {SITE_GROUPS.map((group) => (
             <div key={group.label}>
               <p className="mb-2 text-[11px] font-medium text-white/25">
                 {group.label}
               </p>
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
                       <input
                         type="checkbox"
                         checked={checked}
                         onChange={() => toggleSite(id)}
                         className="sr-only"
                       />
                       {siteMap.get(id) ?? id}
                     </label>
                   );
                 })}
               </div>
             </div>
           ))}
         </div>

         {selectedSites.length > 0 && (
           <p className="mt-3 text-xs text-white/20">
             {selectedSites.length}개 선택됨
           </p>
         )}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
         <h3 className="mb-4 text-sm font-medium text-white/60">
           크롤링 옵션
         </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
           <div>
             <label htmlFor="crawl-date-from" className="mb-1.5 block text-xs text-white/30">
               시작일
             </label>
             <input
               id="crawl-date-from"
               type="date"
               value={dateFrom}
               onChange={(e) => setDateFrom(e.target.value)}
               className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none transition-colors"
             />
           </div>
           <div>
             <label htmlFor="crawl-date-to" className="mb-1.5 block text-xs text-white/30">
               종료일
             </label>
             <input
               id="crawl-date-to"
               type="date"
               value={dateTo}
               onChange={(e) => setDateTo(e.target.value)}
               className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none transition-colors"
             />
           </div>
           <div>
             <label htmlFor="crawl-max-pages" className="mb-1.5 block text-xs text-white/30">
               페이지 수 (최대 5)
             </label>
             <input
               id="crawl-max-pages"
               type="number"
               min={1}
               max={5}
               value={maxPages}
               onChange={(e) => setMaxPages(Number(e.target.value))}
               className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none transition-colors"
             />
           </div>
           <div>
             <label htmlFor="crawl-limit-per-site" className="mb-1.5 block text-xs text-white/30">
               사이트당 제한
             </label>
             <input
               id="crawl-limit-per-site"
               type="number"
               min={1}
               max={100}
               value={limitPerSite}
               onChange={(e) => setLimitPerSite(Number(e.target.value))}
               className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none transition-colors"
             />
           </div>
        </div>
      </div>

        <button
           type="button"
           onClick={handleSubmit}
           disabled={loading}
           className="rounded-lg bg-white px-6 py-2.5 font-medium text-black transition-colors hover:bg-white/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
         >
           {loading ? "크롤링 진행 중... (수분 소요될 수 있습니다)" : "크롤링 시작"}
         </button>

       {error && (
         <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-4">
           <p className="text-sm text-red-400">{error}</p>
         </div>
       )}

       {result && (
         <div className="space-y-4">
           <p className="text-sm text-white/40">
             완료 · 총 소요 시간: {(result.totalDurationMs / 1000).toFixed(1)}초
           </p>
           <div className="grid gap-4 sm:grid-cols-3">
             {(["crawl", "embed", "generate"] as const).map((key) => {
               const stage = result.stages[key];
               return (
                 <div
                   key={key}
                   className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
                 >
                   <div className="mb-2 flex items-center justify-between">
                     <span className="text-sm font-medium text-white/80">
                       {STAGE_LABELS[key]}
                     </span>
                     <span
                       className={`rounded-full px-2 py-0.5 text-xs ${
                         stage.status === "success"
                           ? "bg-emerald-500/10 text-emerald-400/70"
                           : stage.status === "failed"
                             ? "bg-red-500/10 text-red-400/70"
                             : "bg-white/[0.06] text-white/40"
                       }`}
                     >
                       {stage.status}
                     </span>
                   </div>
                   <p className="text-xs text-white/30">
                     {(stage.durationMs / 1000).toFixed(1)}초
                   </p>
                   {Object.keys(stage.detail).length > 0 && (
                     <div className="mt-2 space-y-0.5">
                       {Object.entries(stage.detail).map(([k, v]) => (
                         <p key={k} className="text-xs text-white/20">
                           {k}: {String(v)}
                         </p>
                       ))}
                     </div>
                   )}
                 </div>
               );
             })}
           </div>
         </div>
       )}
    </div>
  );
}
