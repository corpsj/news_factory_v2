"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/press-releases", label: "보도자료" },
  { href: "/admin/articles", label: "기사" },
  { href: "/admin/clients", label: "클라이언트" },
  { href: "/admin/stats", label: "통계" },
  { href: "/admin/monitoring", label: "모니터링" },
  { href: "/admin/crawl", label: "크롤링" },
  { href: "/admin/settings", label: "설정" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-white/[0.06] bg-[#09090b]">
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
          <span className="text-xs font-bold text-black">NF</span>
        </div>
        <span className="text-sm font-semibold text-white">News Factory</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center rounded-lg px-4 py-2.5 text-[13px] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] ${
                isActive
                  ? "bg-white/[0.08] font-medium text-white"
                  : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-white" />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] px-5 py-4">
        <p className="text-[11px] text-white/20">v2.0</p>
      </div>
    </aside>
  );
}
