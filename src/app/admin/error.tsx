"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <span className="text-4xl text-red-400">⚠</span>
      <h2 className="mt-4 text-lg font-medium text-white">
        문제가 발생했습니다
      </h2>
      <p className="mt-2 max-w-sm text-center text-sm text-white/40">
        {error.message || "알 수 없는 오류가 발생했습니다."}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="cursor-pointer rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
        >
          다시 시도
        </button>
        <a
          href="/admin"
          className="cursor-pointer rounded-lg border border-white/[0.06] px-5 py-2.5 text-sm text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
        >
          대시보드로 돌아가기
        </a>
      </div>
    </div>
  );
}
