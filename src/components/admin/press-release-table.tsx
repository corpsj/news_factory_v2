"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PressReleaseRow = {
  id: string;
  source: string;
  title: string;
  status: string;
  published_at: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  collected: "bg-white/[0.06] text-white/50",
  embedded: "bg-blue-500/10 text-blue-300/70",
  processed: "bg-emerald-500/10 text-emerald-400/70",
  failed: "bg-red-500/10 text-red-400/70",
};

const STATUS_LABELS: Record<string, string> = {
  collected: "수집됨",
  embedded: "분석됨",
  processed: "발행됨",
  failed: "실패",
};

export function PressReleaseTable({
  releases,
  currentStatus,
}: {
  releases: PressReleaseRow[];
  currentStatus: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const allSelected = releases.length > 0 && selected.size === releases.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(releases.map((r) => r.id)));
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
    if (!confirm(`선택한 ${selected.size}건의 보도자료를 삭제하시겠습니까?\n관련 기사도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/press-releases/bulk-delete", {
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
      const res = await fetch("/api/admin/press-releases/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, status: currentStatus || undefined }),
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

        {releases.length > 0 && (
          <div className="flex items-center gap-2">
            {confirmAll ? (
              <>
                <span className="text-xs text-white/40">
                  {currentStatus ? `${STATUS_LABELS[currentStatus] ?? currentStatus} 상태의 보도자료를` : "전체 보도자료를"} 삭제합니다
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

      <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="w-10 px-3 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={releases.length === 0}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-white/80 cursor-pointer"
                />
              </th>
              <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">출처</th>
              <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">제목</th>
              <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">상태</th>
              <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">날짜</th>
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl text-white/10">◇</span>
                    <p className="text-sm text-white/30">수집된 보도자료가 없습니다</p>
                    <p className="text-xs text-white/20">수집을 실행하면 자동으로 추가됩니다</p>
                  </div>
                </td>
              </tr>
            ) : (
              releases.map((pr) => (
                <tr
                  key={pr.id}
                  className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${
                    selected.has(pr.id) ? "bg-white/[0.04]" : ""
                  }`}
                >
                  <td className="w-10 px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selected.has(pr.id)}
                      onChange={() => toggle(pr.id)}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-white/80 cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-4 text-white/50">{pr.source}</td>
                  <td className="max-w-md truncate px-5 py-4">
                    <Link
                      href={`/admin/press-releases/${pr.id}`}
                      className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                      {pr.title}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[pr.status] ?? "bg-white/[0.06] text-white/50"}`}
                    >
                      {STATUS_LABELS[pr.status] ?? pr.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white/30">
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
