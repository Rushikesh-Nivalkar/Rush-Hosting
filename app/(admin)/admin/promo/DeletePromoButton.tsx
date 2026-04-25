"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function DeletePromoButton({ promoId, code }: { promoId: string; code: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setLoading(true);
    await fetch("/api/admin/promo", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promoId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title={confirming ? `Click again to deactivate ${code}` : `Deactivate ${code}`}
      className={`flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-xs transition-colors disabled:opacity-50 ${
        confirming
          ? "bg-[var(--status-error-bg)] text-[var(--status-error)] border border-[var(--status-error)]/30"
          : "text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)]"
      }`}
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
      {confirming ? "Confirm" : ""}
    </button>
  );
}
