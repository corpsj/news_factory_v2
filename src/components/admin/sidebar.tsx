"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/crawl", label: "크롤링" },
  { href: "/admin/press-releases", label: "수집 보도자료" },
  { href: "/admin/articles", label: "생성 기사" },
  { href: "/admin/clients", label: "클라이언트" },
  { href: "/admin/stats", label: "통계" },
  { href: "/admin/monitoring", label: "모니터링" },
  { href: "/admin/settings", label: "설정" },
] as const;

function SidebarContent({
  pathname,
  onNavClick,
}: {
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center gap-3 px-5">
        <svg width="28" height="28" viewBox="0 0 32 32" className="shrink-0" role="img" aria-label="News Factory">
          <rect width="32" height="32" rx="8" fill="white" />
          <path d="M8 25V7h3l10 13V7h3v18h-3L11 12v13H8z" fill="#09090b" />
        </svg>
        <span className="text-sm font-semibold tracking-wide text-white">NEWS FACTORY</span>
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
              onClick={onNavClick}
              className={`relative flex cursor-pointer items-center rounded-lg px-4 py-2.5 text-[13px] transition-colors focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] ${
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
    </>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-white/[0.06] bg-[#09090b] md:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setOpen(true);
          }
        }}
        aria-label="메뉴 열기"
        className="fixed left-4 top-4 z-50 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/[0.06] text-white/60 transition-colors hover:bg-white/[0.10] hover:text-white md:hidden"
      >
        <span className="text-base leading-none">☰</span>
      </button>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="메뉴 닫기"
        />
      )}

      {open && (
        <aside className="fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-white/[0.06] bg-[#09090b] md:hidden">
          <SidebarContent pathname={pathname} onNavClick={() => setOpen(false)} />
        </aside>
      )}
    </>
  );
}
