"use client";

import { useRouter } from "next/navigation";

const SOURCE_GROUPS = [
  {
    label: "광주광역시",
    sources: ["광산구청", "광주시청", "남구청", "동구청", "북구청", "서구청"],
  },
  {
    label: "전라남도 시",
    sources: ["광양시청", "나주시청", "목포시청", "순천시청", "여수시청"],
  },
  {
    label: "전라남도 군",
    sources: [
      "강진군청", "고흥군청", "곡성군청", "구례군청", "담양군청", "무안군청",
      "보성군청", "신안군청", "영광군청", "완도군청", "장성군청", "장흥군청",
      "전라남도청", "함평군청", "해남군청", "화순군청",
    ],
  },
];

function buildHref(params: Record<string, string>) {
  const filtered = Object.entries(params).filter(([, v]) => v);
  if (filtered.length === 0) return "/admin/articles";
  return `/admin/articles?${filtered.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}

export default function SourceFilter({
  currentSource,
  currentCategory,
}: {
  currentSource: string;
  currentCategory: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] uppercase tracking-wider text-white/30 font-medium">
        기관
      </span>
      <select
        value={currentSource}
        onChange={(e) => {
          router.push(buildHref({ category: currentCategory, source: e.target.value }));
        }}
        className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white/80 focus:border-white/[0.15] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.3)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8"
      >
        <option value="" className="bg-[#09090b] text-white/80">
          전체 기관
        </option>
        {SOURCE_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label} className="bg-[#09090b] text-white/60">
            {group.sources.map((name) => (
              <option key={name} value={name} className="bg-[#09090b] text-white/80">
                {name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
