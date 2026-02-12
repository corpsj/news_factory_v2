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
  economy: "경제",
  politics: "정치",
  society: "사회",
  sports: "스포츠",
  culture: "문화",
  opinion: "오피니언",
  editorial: "사설",
};

const CATEGORY_COLORS: Record<string, string> = {
  economy: "bg-blue-500/20 text-blue-300",
  politics: "bg-red-500/20 text-red-300",
  society: "bg-emerald-500/20 text-emerald-300",
  sports: "bg-orange-500/20 text-orange-300",
  culture: "bg-violet-500/20 text-violet-300",
  opinion: "bg-cyan-500/20 text-cyan-300",
  editorial: "bg-amber-500/20 text-amber-300",
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white">기사</h2>
        <p className="mt-1 text-sm text-zinc-400">AI 생성 기사 {total}건</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <a
          href="/admin/articles"
          className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
            !currentCategory
              ? "bg-white/10 text-white"
              : "text-zinc-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          전체
        </a>
        {ARTICLE_CATEGORIES.map((cat) => (
          <a
            key={cat}
            href={`/admin/articles?category=${cat}`}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              currentCategory === cat
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </a>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-xs font-medium text-zinc-400">제목</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400">카테고리</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400">출처</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400">생성일</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-zinc-500">
                  데이터 없음
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr
                  key={article.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/5"
                >
                  <td className="max-w-md truncate px-4 py-3 text-white">
                    {article.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${CATEGORY_COLORS[article.category] ?? "bg-zinc-700 text-zinc-300"}`}
                    >
                      {CATEGORY_LABELS[article.category] ?? article.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{article.source}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(article.created_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
