import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ARTICLE_CATEGORIES } from "@/types/article";

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

const CATEGORY_COLORS: Record<string, string> = {
  press_release: "bg-white/[0.08] text-white/70",
  economy: "bg-blue-500/10 text-blue-300/70",
  politics: "bg-red-500/10 text-red-300/70",
  society: "bg-emerald-500/10 text-emerald-300/70",
  sports: "bg-orange-500/10 text-orange-300/70",
  culture: "bg-violet-500/10 text-violet-300/70",
  opinion: "bg-cyan-500/10 text-cyan-300/70",
  editorial: "bg-amber-500/10 text-amber-300/70",
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

  let query = supabase
    .from("articles")
    .select("id,title,category,source,status,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, count } = await query;

  return { data: (data ?? []) as ArticleRow[], total: count ?? 0 };
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: articles, total } = await getArticles(params);
  const currentCategory = params.category ?? "";
  const limit = 20;
  const currentPage = Number(params.page ?? "1");
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-8">
         <h2 className="text-[28px] font-semibold tracking-tight text-white">기사</h2>
         <p className="mt-1 text-sm text-white/40">기사 {total}건</p>
       </div>

       <div className="mb-4 flex flex-wrap gap-2">
          <a
            href="/admin/articles"
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
              href={`/admin/articles?category=${cat}`}
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

        <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
           <table className="min-w-[640px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">제목</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">카테고리</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">출처</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">생성일</th>
              </tr>
            </thead>
            <tbody>
               {articles.length === 0 ? (
                 <tr>
                   <td colSpan={4} className="px-5 py-16 text-center">
                     <div className="flex flex-col items-center gap-2">
                       <span className="text-4xl text-white/10">▤</span>
                       <p className="text-sm text-white/30">아직 생성된 기사가 없습니다</p>
                       <p className="text-xs text-white/20">크롤링을 먼저 실행해 주세요</p>
                     </div>
                   </td>
                 </tr>
               ) : (
                articles.map((article) => (
                  <tr
                    key={article.id}
                    className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                  >
                     <td className="max-w-md truncate px-5 py-4">
                       <Link
                         href={`/admin/articles/${article.id}`}
                         className="text-white/80 hover:text-white transition-colors cursor-pointer"
                       >
                         {article.title}
                       </Link>
                     </td>
                    <td className="px-5 py-4">
                       <span
                         className={`rounded-full px-2 py-0.5 text-xs ${CATEGORY_COLORS[article.category] ?? "bg-white/[0.06] text-white/50"}`}
                       >
                        {CATEGORY_LABELS[article.category] ?? article.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white/50">{article.source}</td>
                    <td className="px-5 py-4 text-white/30">
                      {new Date(article.created_at).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
         </table>
       </div>

       {totalPages > 1 && (
         <div className="mt-4 flex items-center justify-between">
           <p className="text-sm text-white/30">
             총 {total}건 중 {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)}건
           </p>
           <div className="flex items-center gap-1">
             {currentPage > 1 && (
               <a
                 href={currentCategory ? `/admin/articles?category=${currentCategory}&page=${currentPage - 1}` : `/admin/articles?page=${currentPage - 1}`}
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
                     href={currentCategory ? `/admin/articles?category=${currentCategory}&page=${p}` : `/admin/articles?page=${p}`}
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
                 href={currentCategory ? `/admin/articles?category=${currentCategory}&page=${currentPage + 1}` : `/admin/articles?page=${currentPage + 1}`}
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
