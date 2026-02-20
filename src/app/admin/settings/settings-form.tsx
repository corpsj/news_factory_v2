"use client";

import { useState, useTransition } from "react";

type SiteInfo = {
  id: string;
  name: string;
  group: string;
};

type CrawlSettings = {
  enabled_site_ids: string[];
  schedule_hours: number[];
  updated_at: string;
};

const GWANGJU_SITES: SiteInfo[] = [
  { id: "gwangju-city", name: "광주시", group: "광주광역시" },
  { id: "donggu", name: "광주 동구", group: "광주광역시" },
  { id: "seogu", name: "광주 서구", group: "광주광역시" },
  { id: "namgu", name: "광주 남구", group: "광주광역시" },
  { id: "bukgu", name: "광주 북구", group: "광주광역시" },
  { id: "gwangsan", name: "광주 광산구", group: "광주광역시" },
];

const JEONNAM_SITES: SiteInfo[] = [
  { id: "jeonnam-province", name: "전라남도", group: "전라남도" },
  { id: "mokpo", name: "목포시", group: "전라남도" },
  { id: "yeosu", name: "여수시", group: "전라남도" },
  { id: "suncheon", name: "순천시", group: "전라남도" },
  { id: "naju", name: "나주시", group: "전라남도" },
  { id: "gwangyang", name: "광양시", group: "전라남도" },
  { id: "damyang", name: "담양군", group: "전라남도" },
  { id: "gokseong", name: "곡성군", group: "전라남도" },
  { id: "gurye", name: "구례군", group: "전라남도" },
  { id: "goheung", name: "고흥군", group: "전라남도" },
  { id: "boseong", name: "보성군", group: "전라남도" },
  { id: "hwasun", name: "화순군", group: "전라남도" },
  { id: "jangheung", name: "장흥군", group: "전라남도" },
  { id: "gangjin", name: "강진군", group: "전라남도" },
  { id: "haenam", name: "해남군", group: "전라남도" },
  { id: "muan", name: "무안군", group: "전라남도" },
  { id: "hampyeong", name: "함평군", group: "전라남도" },
  { id: "yeonggwang", name: "영광군", group: "전라남도" },
  { id: "jangseong", name: "장성군", group: "전라남도" },
  { id: "wando", name: "완도군", group: "전라남도" },
  { id: "shinan", name: "신안군", group: "전라남도" },
];

const ALL_SITES = [...GWANGJU_SITES, ...JEONNAM_SITES];
const ALL_SITE_IDS = ALL_SITES.map((s) => s.id);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function SettingsForm({ initial }: { initial: CrawlSettings | null }) {
  const [enabledSites, setEnabledSites] = useState<Set<string>>(
    new Set(initial?.enabled_site_ids ?? ALL_SITE_IDS),
  );
  const [scheduleHours, setScheduleHours] = useState<Set<number>>(
    new Set(initial?.schedule_hours ?? [6, 12, 18]),
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSite(siteId: string) {
    setEnabledSites((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
    setSaved(false);
  }

  function toggleGroupAll(sites: SiteInfo[]) {
    const groupIds = sites.map((s) => s.id);
    const allEnabled = groupIds.every((id) => enabledSites.has(id));
    setEnabledSites((prev) => {
      const next = new Set(prev);
      for (const id of groupIds) {
        if (allEnabled) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
    setSaved(false);
  }

  function toggleAll() {
    setEnabledSites((prev) => {
      if (prev.size === ALL_SITE_IDS.length) {
        return new Set<string>();
      }
      return new Set(ALL_SITE_IDS);
    });
    setSaved(false);
  }

  function toggleHour(hour: number) {
    setScheduleHours((prev) => {
      const next = new Set(prev);
      if (next.has(hour)) {
        next.delete(hour);
      } else {
        next.add(hour);
      }
      return next;
    });
    setSaved(false);
  }

  function handleSave() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/crawl-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled_site_ids: Array.from(enabledSites),
            schedule_hours: Array.from(scheduleHours).sort((a, b) => a - b),
          }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        setSaved(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "저장 실패";
        setError(msg);
      }
    });
  }

  function renderSiteGroup(label: string, sites: SiteInfo[]) {
    const groupIds = sites.map((s) => s.id);
    const allEnabled = groupIds.every((id) => enabledSites.has(id));
    const enabledCount = groupIds.filter((id) => enabledSites.has(id)).length;

    return (
      <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
         <div className="mb-3 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <h3 className="text-sm font-medium text-white">{label}</h3>
             <span className="text-xs text-white/20">
               {enabledCount}/{sites.length}
             </span>
           </div>
            <button
              type="button"
              onClick={() => toggleGroupAll(sites)}
              className="text-xs text-white/30 transition-colors hover:text-white/70 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b] active:scale-[0.98]"
            >
              {allEnabled ? "전체 해제" : "전체 선택"}
            </button>
         </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {sites.map((site) => {
            const checked = enabledSites.has(site.id);
            return (
              <button
                 key={site.id}
                 type="button"
                 onClick={() => toggleSite(site.id)}
                 className={`rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b] active:scale-[0.98] ${
                    checked
                      ? "bg-white/[0.10] text-white ring-1 ring-white/[0.15]"
                      : "bg-white/[0.02] text-white/25 hover:bg-white/[0.05] hover:text-white/50"
                  }`}
               >
                 {site.name}
               </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
         <div className="mb-4 flex items-center justify-between">
           <div>
             <h2 className="text-base font-medium text-white">수집 시간</h2>
             <p className="mt-1 text-xs text-white/30">
               선택한 시간(KST)에 정기 수집이 실행됩니다
             </p>
           </div>
           <span className="text-xs text-white/20">
             {scheduleHours.size}개 선택
           </span>
         </div>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
          {HOURS.map((h) => {
            const active = scheduleHours.has(h);
            return (
               <button
                 key={h}
                 type="button"
                 onClick={() => toggleHour(h)}
                 className={`rounded-lg px-2 py-2.5 text-center text-xs font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b] active:scale-[0.98] ${
                    active
                      ? "bg-white/[0.10] text-white ring-1 ring-white/[0.15]"
                      : "bg-white/[0.02] text-white/25 hover:bg-white/[0.05] hover:text-white/50"
                  }`}
               >
                 {String(h).padStart(2, "0")}시
               </button>
            );
          })}
        </div>
      </div>

       <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
         <div className="mb-4 flex items-center justify-between">
           <div>
             <h2 className="text-base font-medium text-white">대상 지역</h2>
             <p className="mt-1 text-xs text-white/30">
               정기 수집에 포함할 지역을 선택하세요
             </p>
           </div>
           <div className="flex items-center gap-3">
             <span className="text-xs text-white/20">
               {enabledSites.size}/{ALL_SITE_IDS.length}
             </span>
              <button
                type="button"
                onClick={toggleAll}
                className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b] active:scale-[0.98]"
              >
                {enabledSites.size === ALL_SITE_IDS.length ? "전체 해제" : "전체 선택"}
              </button>
           </div>
         </div>
        <div className="space-y-4">
          {renderSiteGroup("광주광역시", GWANGJU_SITES)}
          {renderSiteGroup("전라남도", JEONNAM_SITES)}
        </div>
      </div>

      <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "저장 중..." : "설정 저장"}
          </button>
        {saved && (
          <span className="text-sm text-emerald-400">저장되었습니다</span>
        )}
        {error && (
          <span className="text-sm text-red-400">{error}</span>
        )}
      </div>
    </div>
  );
}
