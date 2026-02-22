"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteButtonProps = {
  endpoint: string;
  redirectTo: string;
  label?: string;
  confirmMessage?: string;
};

export function DeleteButton({
  endpoint,
  redirectTo,
  label = "삭제",
  confirmMessage = "정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
}: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        router.push(redirectTo);
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "삭제에 실패했습니다.");
        setConfirming(false);
      }
    } catch {
      alert("오류가 발생했습니다.");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20 cursor-pointer"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-white/50">{confirmMessage}</span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-40 cursor-pointer"
      >
        {loading ? "삭제 중..." : "확인"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={loading}
        className="rounded-lg bg-white/[0.06] px-4 py-2 text-sm text-white/50 transition-colors hover:bg-white/[0.1] disabled:opacity-40 cursor-pointer"
      >
        취소
      </button>
    </div>
  );
}
