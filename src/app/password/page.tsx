"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function PasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError("암호가 올바르지 않습니다.");
        setPassword("");
      }
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-white/90">News Factory</h1>
          <p className="mt-2 text-sm text-white/50">
            접속하려면 암호를 입력하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              ref={(el) => el?.focus()}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="암호 입력"
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-white/25 focus:bg-white/[0.07]"
            />
          </div>

          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-white/10 px-4 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "확인 중..." : "접속"}
          </button>
        </form>
      </div>
    </div>
  );
}
