import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Article = {
  id: string;
  press_release_id: string;
  title: string;
  subtitle: string | null;
  body: string;
  images: string[];
  category: string;
  source: string;
  source_url: string;
  status: string;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  economy: "경제",
  politics: "정치",
  society: "사회",
  sports: "스포츠",
  culture: "문화",
  opinion: "오피니언",
  editorial: "사설",
};

const CATEGORY_COLORS: Record<string, string> = {
  economy: "bg-blue-500/10 text-blue-300/70",
  politics: "bg-red-500/10 text-red-300/70",
  society: "bg-emerald-500/10 text-emerald-300/70",
  sports: "bg-orange-500/10 text-orange-300/70",
  culture: "bg-violet-500/10 text-violet-300/70",
  opinion: "bg-cyan-500/10 text-cyan-300/70",
  editorial: "bg-amber-500/10 text-amber-300/70",
};

const STATUS_STYLES: Record<string, string> = {
  generated: "bg-white/[0.06] text-white/50",
  available: "bg-emerald-500/10 text-emerald-400/70",
  distributed: "bg-blue-500/10 text-blue-300/70",
};

async function getArticle(id: string): Promise<Article | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || url.includes("your-project-ref")) {
    return null;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase
    .from("articles")
    .select("id,press_release_id,title,subtitle,body,images,category,source,source_url,status,created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Article;
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    notFound();
  }

  return (
    <div>
        <div className="mb-6">
          <Link
             href="/admin/articles"
             className="inline-block py-2 text-sm text-white/30 transition-colors hover:text-white/70 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b]"
           >
             &larr; 기사 목록
           </Link>
        </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-semibold tracking-tight text-white">
              {article.title}
            </h1>
            {article.subtitle && (
              <p className="mt-2 text-base text-white/50">{article.subtitle}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${CATEGORY_COLORS[article.category] ?? "bg-white/[0.06] text-white/50"}`}
            >
              {CATEGORY_LABELS[article.category] ?? article.category}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[article.status] ?? "bg-white/[0.06] text-white/50"}`}
            >
              {article.status}
            </span>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-[11px] text-white/25">출처</p>
            <p className="mt-0.5 text-white/60">{article.source}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/25">생성일</p>
            <p className="mt-0.5 text-white/60">
              {new Date(article.created_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-white/25">원본 링크</p>
             <a
               href={article.source_url}
               target="_blank"
               rel="noopener noreferrer"
               className="mt-0.5 block truncate text-white/50 underline underline-offset-2 decoration-white/20 transition-colors hover:text-white/80 cursor-pointer"
             >
               원본 보기 &rarr;
             </a>
          </div>
          <div>
            <p className="text-[11px] text-white/25">원본 보도자료</p>
             <Link
               href={`/admin/press-releases/${article.press_release_id}`}
               className="mt-0.5 block truncate text-white/50 underline underline-offset-2 decoration-white/20 transition-colors hover:text-white/80 cursor-pointer"
             >
               보도자료 보기 &rarr;
             </Link>
          </div>
        </div>

        {article.images.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-xs uppercase tracking-wider text-white/30 font-medium">이미지</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {article.images.map((imgUrl) => (
                <div
                  key={imgUrl}
                  className="overflow-hidden rounded-lg border border-white/[0.06]"
                >
                  <img
                    src={imgUrl}
                    alt={article.title}
                    className="h-auto w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-xs uppercase tracking-wider text-white/30 font-medium">본문</h2>
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/60">
              {article.body}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
