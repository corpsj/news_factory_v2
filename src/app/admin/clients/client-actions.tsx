"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClientActions() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setApiKey(data.api_key);
      setName("");
      setDesc("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (apiKey) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <p className="text-sm font-medium text-emerald-300">API 키가 발급되었습니다</p>
        <code className="mt-3 block break-all select-all rounded-lg bg-white/[0.04] p-3 font-mono text-xs text-white">
          {apiKey}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-3 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
        >
          {copied ? "복사됨" : "복사"}
        </button>
        <p className="mt-3 text-xs text-emerald-200/80">
          이 키는 다시 표시되지 않습니다. 안전한 곳에 저장하세요.
        </p>
        <button
          type="button"
          onClick={() => {
            setApiKey(null);
            setShowForm(false);
            setCopied(false);
            router.refresh();
          }}
          className="mt-3 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
        >
          확인
        </button>
      </div>
    );
  }

  if (!showForm) {
    return (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
        >
          새 클라이언트
        </button>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none transition-colors"
        />
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="설명 (선택)"
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none transition-colors"
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
        >
          {loading ? "등록 중" : "등록"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowForm(false);
            setName("");
            setDesc("");
            setError(null);
          }}
          className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
        >
          취소
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
