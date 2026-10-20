"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible dialog built on native <dialog> (focus trap, Esc to close, inert background).
 * `variant="sheet"` slides up from the bottom on phones and centres on larger screens.
 */
export function Modal({
  open, onClose, title, description, children, footer, variant = "dialog", className, hideTitle,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "dialog" | "sheet";
  className?: string;
  hideTitle?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="pm-modal-title"
      aria-describedby={description ? "pm-modal-desc" : undefined}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={cn(
        "m-0 max-h-[100dvh] max-w-none bg-transparent p-0 text-text backdrop:bg-[rgb(16_21_31/0.55)] backdrop:backdrop-blur-[2px]",
        variant === "sheet"
          ? "fixed inset-x-0 bottom-0 top-auto w-full sm:inset-0 sm:m-auto sm:h-fit sm:max-w-lg"
          : "fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-lg",
      )}
    >
      {open && (
        <div
          className={cn(
            "flex max-h-[90dvh] flex-col bg-surface shadow-[var(--shadow-lift)]",
            variant === "sheet"
              ? "rounded-t-[var(--radius-xl)] pb-safe animate-[pm-slide-up_220ms_ease-out] sm:rounded-[var(--radius-xl)] sm:animate-[pm-fade_160ms_ease-out]"
              : "rounded-[var(--radius-xl)] animate-[pm-fade_160ms_ease-out]",
            className,
          )}
        >
          {variant === "sheet" && <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border sm:hidden" aria-hidden />}
          <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
            <div>
              <h2 id="pm-modal-title" className={cn("text-2xl font-semibold", hideTitle && "sr-only")}>{title}</h2>
              {description && <p id="pm-modal-desc" className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="-mr-2 rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 pb-6">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-border px-6 py-3.5">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function BottomSheet(props: Omit<Parameters<typeof Modal>[0], "variant">) {
  return <Modal {...props} variant="sheet" />;
}
