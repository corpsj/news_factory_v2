"use client";

import { useState } from "react";

export function ClientActions() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setApiKey(data.api_key);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setLoading(false);
    }
  }

  if (apiKey) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-4">
        <p className="text-sm font-medium text-amber-300">
          API 키가 발급되었습니다
        </p>
         <code className="mt-2 block break-all rounded bg-white/[0.03] p-2 text-xs text-white">
          {apiKey}
        </code>
         <p className="mt-2 text-xs text-amber-400/80">
          이 키는 다시 표시되지 않습니다. 안전한 곳에 저장하세요.
        </p>
          <button
            type="button"
            onClick={() => {
              setApiKey(null);
              setShowForm(false);
            }}
            className="mt-3 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] active:scale-[0.98]"
          >
            닫기
          </button>
      </div>
    );
  }

  if (!showForm) {
    return (
       <button
         type="button"
         onClick={() => setShowForm(true)}
         className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] active:scale-[0.98]"
       >
         새 클라이언트 등록
       </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="언론사 이름"
         className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none transition-colors"
      />
       <button
         type="button"
         onClick={handleCreate}
         disabled={loading || !name.trim()}
          className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] active:scale-[0.98]"
       >
         {loading ? "..." : "등록"}
       </button>
       <button
         type="button"
         onClick={() => setShowForm(false)}
          className="rounded-lg px-3 py-2 text-sm text-white/40 transition-colors hover:text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] active:scale-[0.98]"
       >
         취소
       </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
