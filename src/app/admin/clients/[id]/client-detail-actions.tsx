"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ClientActionTarget = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  api_key_prefix: string | null;
  api_key_last4: string | null;
};

type ClientDetailActionsProps = {
  client: ClientActionTarget;
};

const focusRingClass =
  "focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]";

export function ClientDetailActions({ client }: ClientDetailActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(client.name);
  const [description, setDescription] = useState(client.description ?? "");
  const [busyAction, setBusyAction] = useState<"edit" | "toggle" | "rotate" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  useEffect(() => {
    setName(client.name);
    setDescription(client.description ?? "");
  }, [client.name, client.description]);

  async function handleEditSave() {
    if (!name.trim()) return;
    setBusyAction("edit");
    setError(null);

    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "수정에 실패했습니다");
      }

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "수정에 실패했습니다");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleToggleActive() {
    setBusyAction("toggle");
    setError(null);

    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !client.is_active }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "상태 변경에 실패했습니다");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "상태 변경에 실패했습니다");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRotateKey() {
    setBusyAction("rotate");
    setError(null);

    try {
      const res = await fetch(`/api/admin/clients/${client.id}/rotate`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "키 재발급에 실패했습니다");
      }

      const body = (await res.json()) as { api_key?: string };
      if (!body.api_key) {
        throw new Error("키를 불러올 수 없습니다");
      }

      setNewApiKey(body.api_key);
      setShowRotateConfirm(false);
      setCopied(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "키 재발급에 실패했습니다");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCopyKey() {
    if (!newApiKey) return;
    try {
      await navigator.clipboard.writeText(newApiKey);
      setCopied(true);
    } catch {
      setError("복사에 실패했습니다");
    }
  }

  async function handleDelete() {
    setBusyAction("delete");
    setError(null);

    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "삭제에 실패했습니다");
      }

      router.push("/admin/clients");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다");
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <p className="text-[11px] uppercase tracking-wider text-white/30">관리</p>
        <div className="mt-4 space-y-3">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className={`rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] cursor-pointer active:scale-[0.98] ${focusRingClass}`}
            >
              수정
            </button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="client-name" className="text-xs text-white/35">
                  이름
                </label>
                <input
                  id="client-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={`w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none ${focusRingClass}`}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="client-description" className="text-xs text-white/35">
                  설명
                </label>
                <textarea
                  id="client-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className={`w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none ${focusRingClass}`}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={busyAction === "edit" || !name.trim()}
                  className={`rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 cursor-pointer active:scale-[0.98] disabled:opacity-50 ${focusRingClass}`}
                >
                  {busyAction === "edit" ? "저장 중" : "저장"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(client.name);
                    setDescription(client.description ?? "");
                  }}
                  className={`rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] cursor-pointer active:scale-[0.98] ${focusRingClass}`}
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6">
        <p className="text-[11px] uppercase tracking-wider text-white/30">키 관리</p>
        <div className="mt-4 space-y-3">
          <p className="text-xs text-white/35">
            현재 키: {client.api_key_prefix && client.api_key_last4 ? `${client.api_key_prefix}...${client.api_key_last4}` : "레거시 키"}
          </p>

          {!showRotateConfirm ? (
            <button
              type="button"
              onClick={() => setShowRotateConfirm(true)}
              className={`rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] cursor-pointer active:scale-[0.98] ${focusRingClass}`}
            >
              키 재발급
            </button>
          ) : (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.07] p-4">
              <p className="text-xs text-amber-300">기존 키가 즉시 만료됩니다. 계속하시겠습니까?</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleRotateKey}
                  disabled={busyAction === "rotate"}
                  className={`rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 cursor-pointer active:scale-[0.98] disabled:opacity-50 ${focusRingClass}`}
                >
                  {busyAction === "rotate" ? "재발급 중" : "재발급 진행"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRotateConfirm(false)}
                  className={`rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] cursor-pointer active:scale-[0.98] ${focusRingClass}`}
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {newApiKey && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] p-4">
              <p className="text-sm font-medium text-emerald-300">새 API 키</p>
              <code className="mt-2 block break-all rounded bg-black/30 p-2 text-xs text-white">{newApiKey}</code>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className={`rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] cursor-pointer active:scale-[0.98] ${focusRingClass}`}
                >
                  {copied ? "복사됨" : "복사"}
                </button>
                <button
                  type="button"
                  onClick={() => setNewApiKey(null)}
                  className={`rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] cursor-pointer active:scale-[0.98] ${focusRingClass}`}
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-red-500/10 bg-white/[0.03] p-6">
        <p className="text-[11px] uppercase tracking-wider text-white/30">위험 구역</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={busyAction === "toggle"}
            className={`rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer active:scale-[0.98] disabled:opacity-50 ${focusRingClass}`}
          >
            {busyAction === "toggle" ? "변경 중" : client.is_active ? "비활성화" : "활성화"}
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className={`rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer active:scale-[0.98] ${focusRingClass}`}
          >
            삭제
          </button>
        </div>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/[0.06] bg-[#09090b] p-6">
            <p className="text-lg font-semibold text-white">클라이언트 삭제</p>
            <p className="mt-2 text-sm text-white/60">
              삭제하려면 아래 입력창에 클라이언트 이름을 정확히 입력하세요.
            </p>
            <p className="mt-2 text-sm text-white/80">확인 문자열: {client.name}</p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(event) => setDeleteConfirmName(event.target.value)}
              className={`mt-4 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none ${focusRingClass}`}
              placeholder="클라이언트 이름 입력"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmName("");
                }}
                className={`rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] cursor-pointer active:scale-[0.98] ${focusRingClass}`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busyAction === "delete" || deleteConfirmName !== client.name}
                className={`rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer active:scale-[0.98] disabled:opacity-50 ${focusRingClass}`}
              >
                {busyAction === "delete" ? "삭제 중" : "삭제 실행"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
