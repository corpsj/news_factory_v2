"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export function ArticleTable({
  articles,
  currentCategory,
  currentSource,
}: {
  articles: ArticleRow[];
  currentCategory: string;
  currentSource: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const allSelected = articles.length > 0 && selected.size === articles.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(articles.map((a) => a.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}건의 기사를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/articles/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (res.ok) {
        setSelected(new Set());
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "삭제에 실패했습니다.");
      }
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAll() {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/articles/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          all: true,
          category: currentCategory || undefined,
          source: currentSource || undefined,
        }),
      });
      if (res.ok) {
        setSelected(new Set());
        setConfirmAll(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "삭제에 실패했습니다.");
      }
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  const filterLabel = [
    currentCategory ? CATEGORY_LABELS[currentCategory] ?? currentCategory : "",
    currentSource || "",
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-white/50">{selected.size}건 선택</span>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={deleting}
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-40 cursor-pointer"
              >
                {deleting ? "삭제 중..." : "선택 삭제"}
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                disabled={deleting}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/[0.1] disabled:opacity-40 cursor-pointer"
              >
                선택 해제
              </button>
            </>
          )}
        </div>

        {articles.length > 0 && (
          <div className="flex items-center gap-2">
            {confirmAll ? (
              <>
                <span className="text-xs text-white/40">
                  {filterLabel ? `${filterLabel} 기사를` : "전체 기사를"} 삭제합니다
                </span>
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={deleting}
                  className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-40 cursor-pointer"
                >
                  {deleting ? "삭제 중..." : "확인"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAll(false)}
                  disabled={deleting}
                  className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/[0.1] disabled:opacity-40 cursor-pointer"
                >
                  취소
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmAll(true)}
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20 cursor-pointer"
              >
                전체 삭제
              </button>
            )}
          </div>
        )}
      </div>

      <div className="md:hidden space-y-3">
        {articles.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-16 text-center">
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl text-white/10">▤</span>
              <p className="text-sm text-white/30">아직 생성된 기사가 없습니다</p>
              <p className="text-xs text-white/20">수집을 먼저 실행해 주세요</p>
            </div>
          </div>
        ) : (
          articles.map((article) => (
            <div
              key={article.id}
              className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors ${
                selected.has(article.id) ? "bg-white/[0.05]" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(article.id)}
                  onChange={() => toggle(article.id)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-transparent accent-white/80 cursor-pointer"
                />
                <Link
                  href={`/admin/articles/${article.id}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-white/80 line-clamp-2">{article.title}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${CATEGORY_COLORS[article.category] ?? "bg-white/[0.06] text-white/50"}`}
                    >
                      {CATEGORY_LABELS[article.category] ?? article.category}
                    </span>
                    <span className="text-xs text-white/30">{article.source}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-white/20">
                    {new Date(article.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="w-10 px-3 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={articles.length === 0}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-white/80 cursor-pointer"
                />
              </th>
              <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">제목</th>
              <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">카테고리</th>
              <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">출처</th>
              <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">생성일</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl text-white/10">▤</span>
                    <p className="text-sm text-white/30">아직 생성된 기사가 없습니다</p>
                    <p className="text-xs text-white/20">수집을 먼저 실행해 주세요</p>
                  </div>
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr
                  key={article.id}
                  className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${
                    selected.has(article.id) ? "bg-white/[0.04]" : ""
                  }`}
                >
                  <td className="w-10 px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selected.has(article.id)}
                      onChange={() => toggle(article.id)}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-white/80 cursor-pointer"
                    />
                  </td>
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
    </div>
  );
}
