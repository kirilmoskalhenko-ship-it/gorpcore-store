"use client";

import { useEffect } from "react";
import { useUI } from "@/store/ui";

export function Toast() {
  const toast = useUI((s) => s.toast);
  const dismiss = useUI((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(dismiss, 3600);
    return () => window.clearTimeout(t);
  }, [toast, dismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[120] flex justify-center px-4"
    >
      {toast && (
        <div
          key={toast.id}
          role="status"
          data-testid="toast"
          className={`pointer-events-auto max-w-md px-5 py-3 text-sm shadow-[0_10px_40px_-12px_rgba(0,0,0,.35)] ${
            toast.tone === "error" ? "bg-alert text-paper" : "bg-ink text-paper"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
