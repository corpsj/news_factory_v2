import { createClient } from "@supabase/supabase-js";
import { ARTICLE_CATEGORIES } from "@/types/article";
import SourceFilter from "./source-filter";
import { ArticleTable } from "@/components/admin/article-table";

type ArticleRow = {
  id: string;
  title: string;
  category: string;
  source: string;
  status: string;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  press_release: "보도자료",
  economy: "경제",
  politics: "정치",
  society: "사회",
  sports: "스포츠",
  culture: "문화",
  opinion: "오피니언",
  editorial: "사설",
};

async function getArticles(searchParams: Record<string, string | undefined>) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || url.includes("your-project-ref")) {
    return { data: [] as ArticleRow[], total: 0 };
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const page = Number(searchParams.page ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const category = searchParams.category;
  const source = searchParams.source;

  let query = supabase
    .from("articles")
    .select("id,title,category,source,status,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq("category", category);
  }

  if (source) {
    query = query.eq("source", source);
  }

  const { data, count } = await query;

  return { data: (data ?? []) as ArticleRow[], total: count ?? 0 };
}

function buildHref(params: Record<string, string>) {
  const filtered = Object.entries(params).filter(([, v]) => v);
  if (filtered.length === 0) return "/admin/articles";
  return `/admin/articles?${filtered.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: articles, total } = await getArticles(params);
  const currentCategory = params.category ?? "";
  const currentSource = params.source ?? "";
  const limit = 20;
  const currentPage = Number(params.page ?? "1");
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-8">
         <h2 className="text-[28px] font-semibold tracking-tight text-white">기사</h2>
         <p className="mt-1 text-sm text-white/40">기사 {total}건</p>
       </div>

       <div className="mb-4 space-y-3">
         <div className="flex flex-wrap gap-2">
           <a
             href={buildHref({ source: currentSource })}
             className={`rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b] ${
               !currentCategory
                 ? "bg-white/[0.08] text-white"
                 : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"
             }`}
           >
             전체
           </a>
           {ARTICLE_CATEGORIES.map((cat) => (
             <a
               key={cat}
               href={buildHref({ category: cat, source: currentSource })}
               className={`rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b] ${
                 currentCategory === cat
                   ? "bg-white/[0.08] text-white"
                   : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"
               }`}
             >
               {CATEGORY_LABELS[cat] ?? cat}
             </a>
           ))}
         </div>

          <SourceFilter currentSource={currentSource} currentCategory={currentCategory} />
       </div>

       <ArticleTable
         articles={articles}
         currentCategory={currentCategory}
         currentSource={currentSource}
       />

       {totalPages > 1 && (
         <div className="mt-4 flex items-center justify-between">
           <p className="text-sm text-white/30">
             총 {total}건 중 {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)}건
           </p>
           <div className="flex items-center gap-1">
              {currentPage > 1 && (
                <a
                  href={buildHref({ category: currentCategory, source: currentSource, page: String(currentPage - 1) })}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b]"
                >
                  ← 이전
                </a>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                 .map((p) =>
                   p === "..." ? (
                     <span key="ellipsis" className="px-2 text-xs text-white/20">
                       …
                     </span>
                   ) : (
                    <a
                      key={`page-${p}`}
                      href={buildHref({ category: currentCategory, source: currentSource, page: String(p) })}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b] ${
                        p === currentPage
                          ? "bg-white/[0.08] text-white"
                          : "text-white/40 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {p}
                    </a>
                  ),
                )}
              {currentPage < totalPages && (
                <a
                  href={buildHref({ category: currentCategory, source: currentSource, page: String(currentPage + 1) })}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b]"
                >
                  다음 →
                </a>
              )}
           </div>
         </div>
       )}
     </div>
  );
}
