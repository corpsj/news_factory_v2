import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";
import { PipelineProvider } from "@/components/admin/pipeline-provider";
import { PipelineToast } from "@/components/admin/pipeline-toast";

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
    <PipelineProvider>
      <div className="min-h-screen bg-[#09090b] text-white/90">
        <AdminSidebar />
        <main className="ml-0 min-h-screen md:ml-60">
          <div className="mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-10">{children}</div>
        </main>
        <PipelineToast />
      </div>
    </PipelineProvider>
  );
}
