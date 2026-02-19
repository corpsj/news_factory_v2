import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type PressRelease = {
  id: string;
  origin_id: string | null;
  source: string;
  title: string;
  content: string;
  link: string;
  images: string[];
  attachments: string[];
  status: string;
  published_at: string;
  created_at: string;
  processed_at: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  collected: "bg-white/[0.06] text-white/50",
  embedded: "bg-blue-500/10 text-blue-300/70",
  processed: "bg-emerald-500/10 text-emerald-400/70",
  failed: "bg-red-500/10 text-red-400/70",
};

async function getPressRelease(id: string): Promise<PressRelease | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || url.includes("your-project-ref")) {
    return null;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase
    .from("press_releases")
    .select("id,origin_id,source,title,content,link,images,attachments,status,published_at,created_at,processed_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as PressRelease;
}

export default async function PressReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pr = await getPressRelease(id);

  if (!pr) {
    notFound();
  }

  return (
    <div>
        <div className="mb-6">
          <Link
            href="/admin/press-releases"
            className="text-sm text-white/30 transition-colors hover:text-white/70 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b]"
          >
            &larr; 보도자료 목록
          </Link>
        </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-semibold tracking-tight text-white">
              {pr.title}
            </h1>
            <p className="mt-2 text-base text-white/50">{pr.source}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[pr.status] ?? "bg-white/[0.06] text-white/50"}`}
          >
            {pr.status}
          </span>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-[11px] text-white/25">게시일</p>
            <p className="mt-0.5 text-white/60">
              {new Date(pr.published_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-white/25">수집일</p>
            <p className="mt-0.5 text-white/60">
              {new Date(pr.created_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {pr.processed_at && (
            <div>
              <p className="text-[11px] text-white/25">처리일</p>
              <p className="mt-0.5 text-white/60">
                {new Date(pr.processed_at).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
          <div>
            <p className="text-[11px] text-white/25">원본 링크</p>
             <a
               href={pr.link}
               target="_blank"
               rel="noopener noreferrer"
               className="mt-0.5 block truncate text-white/50 underline underline-offset-2 decoration-white/20 transition-colors hover:text-white/80 cursor-pointer"
             >
               원본 보기 &rarr;
             </a>
          </div>
        </div>

        {pr.images.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-xs uppercase tracking-wider text-white/30 font-medium">이미지</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pr.images.map((imgUrl) => (
                <div
                  key={imgUrl}
                  className="overflow-hidden rounded-lg border border-white/[0.06]"
                >
                  <img
                    src={imgUrl}
                    alt={pr.title}
                    className="h-auto w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="mb-3 text-xs uppercase tracking-wider text-white/30 font-medium">본문</h2>
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/60">
              {pr.content}
            </p>
          </div>
        </div>

        {pr.attachments.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs uppercase tracking-wider text-white/30 font-medium">첨부파일</h2>
            <div className="space-y-2">
              {pr.attachments.map((attachment) => (
                 <a
                   key={attachment}
                   href={attachment}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="block rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-2 text-sm text-white/50 underline underline-offset-2 decoration-white/20 transition-colors hover:bg-white/[0.04] hover:text-white/80 cursor-pointer"
                 >
                   {attachment.split("/").pop() ?? "첨부파일"} &rarr;
                 </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
