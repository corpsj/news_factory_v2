import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata: Metadata = {
  title: "News Factory Admin",
  description: "News Factory v2 관리 대시보드",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <AdminSidebar />
      <main className="ml-56 min-h-screen">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-white/10 bg-zinc-950/80 px-8 backdrop-blur-xl">
          <h1 className="text-sm font-medium text-zinc-300">
            News Factory v2
          </h1>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
