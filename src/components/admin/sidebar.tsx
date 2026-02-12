"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드", icon: "◆" },
  { href: "/admin/press-releases", label: "보도자료", icon: "◇" },
  { href: "/admin/articles", label: "기사", icon: "▤" },
  { href: "/admin/clients", label: "클라이언트", icon: "⊡" },
  { href: "/admin/stats", label: "통계", icon: "◫" },
  { href: "/admin/monitoring", label: "모니터링", icon: "◉" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/10 bg-zinc-950/80 backdrop-blur-xl transition-all duration-300 ${collapsed ? "w-16" : "w-56"}`}
    >
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-wide text-white">
            News Factory
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        {!collapsed && (
          <p className="text-xs text-zinc-500">v2.0.0 · Admin</p>
        )}
      </div>
    </aside>
  );
}
