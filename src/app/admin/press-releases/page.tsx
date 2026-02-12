import { createClient } from "@supabase/supabase-js";

type PressReleaseRow = {
  id: string;
  source: string;
  title: string;
  status: string;
  published_at: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  collected: "bg-yellow-500/20 text-yellow-300",
  embedded: "bg-blue-500/20 text-blue-300",
  processed: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-red-500/20 text-red-300",
};

async function getPressReleases(
  searchParams: Record<string, string | undefined>,
) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || url.includes("your-project-ref")) {
    return { data: [] as PressReleaseRow[], total: 0 };
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const page = Number(searchParams.page ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const status = searchParams.status;

  let query = supabase
    .from("press_releases")
    .select("id,source,title,status,published_at,created_at", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, count } = await query;

  return { data: (data ?? []) as PressReleaseRow[], total: count ?? 0 };
}

export default async function PressReleasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: releases, total } = await getPressReleases(params);
  const currentStatus = params.status ?? "";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">보도자료</h2>
          <p className="mt-1 text-sm text-zinc-400">수집된 보도자료 {total}건</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {["", "collected", "embedded", "processed", "failed"].map((s) => (
          <a
            key={s}
            href={s ? `/admin/press-releases?status=${s}` : "/admin/press-releases"}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              currentStatus === s
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {s || "전체"}
          </a>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-xs font-medium text-zinc-400">출처</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400">제목</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400">상태</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400">날짜</th>
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-zinc-500">
                  데이터 없음
                </td>
              </tr>
            ) : (
              releases.map((pr) => (
                <tr
                  key={pr.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/5"
                >
                  <td className="px-4 py-3 text-zinc-300">{pr.source}</td>
                  <td className="max-w-md truncate px-4 py-3 text-white">
                    {pr.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[pr.status] ?? "bg-zinc-700 text-zinc-300"}`}
                    >
                      {pr.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(pr.published_at).toLocaleDateString("ko-KR")}
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
