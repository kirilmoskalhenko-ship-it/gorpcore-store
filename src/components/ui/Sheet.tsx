"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/hooks/useScrollLock";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** right — боковая панель; center — модальное окно (на телефоне — полноэкранное). */
  variant: "right" | "center";
  label: string;
  children: ReactNode;
  className?: string;
  testId?: string;
  hideClose?: boolean;
}

/** Диалог без библиотек: портал, Esc, фокус внутрь и обратно, блокировка прокрутки, анимация входа/выхода. */
export function Sheet({ open, onClose, variant, label, children, className = "", testId, hideClose }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Панель рендерится, пока open === true или пока идёт анимация закрытия (mounted).
  // setTimeout вместо requestAnimationFrame: rAF не срабатывает во вкладке в фоне.
  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      const t = window.setTimeout(() => {
        setMounted(true);
        setVisible(true);
      }, 20);
      return () => window.clearTimeout(t);
    }
    const t1 = window.setTimeout(() => setVisible(false), 0);
    const t2 = window.setTimeout(() => {
      setMounted(false);
      returnFocus.current?.focus?.({ preventScroll: true });
    }, 420);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open]);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
        );
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (visible) panelRef.current?.focus({ preventScroll: true });
  }, [visible]);

  if (!open && !mounted) return null;

  const panelBase =
    variant === "right"
      ? `right-0 top-0 h-dvh w-full sm:w-[440px] ${visible ? "translate-x-0" : "translate-x-full"}`
      : `inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[88dvh] md:w-[min(1120px,92vw)] md:-translate-x-1/2 ${
          visible ? "md:-translate-y-1/2 translate-y-0 opacity-100" : "md:-translate-y-[46%] translate-y-6 opacity-0"
        }`;

  return createPortal(
    <div className="fixed inset-0 z-[80]" data-testid={testId ? `${testId}-root` : undefined}>
      <div
        className={`absolute inset-0 bg-ink/30 backdrop-blur-[2px] transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        data-testid={testId}
        className={`absolute flex flex-col overflow-hidden bg-paper outline-none transition-[transform,opacity] duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${panelBase} ${className}`}
      >
        {!hideClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 flex size-11 items-center justify-center rounded-full bg-paper/80 backdrop-blur transition-colors hover:bg-surface md:top-3"
          >
            <X className="size-5" strokeWidth={1.25} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
