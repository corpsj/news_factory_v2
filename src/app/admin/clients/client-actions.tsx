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
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm font-medium text-amber-300">
          API 키가 발급되었습니다
        </p>
        <code className="mt-2 block break-all rounded bg-black/40 p-2 text-xs text-white">
          {apiKey}
        </code>
        <p className="mt-2 text-xs text-amber-400">
          이 키는 다시 표시되지 않습니다. 안전한 곳에 저장하세요.
        </p>
        <button
          type="button"
          onClick={() => {
            setApiKey(null);
            setShowForm(false);
          }}
          className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
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
        className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
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
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
      />
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading || !name.trim()}
        className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-50"
      >
        {loading ? "..." : "등록"}
      </button>
      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white"
      >
        취소
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
