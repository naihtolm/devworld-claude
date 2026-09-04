"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/modules/ui/Button";

// Fund / approve / accept / resolve-dispute — anywhere real state changes
// irreversibly. <dialog> gives us Escape-to-close and a focus trap for
// free, rather than hand-rolling both.
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // bg-black, not bg-neutral-900, on the backdrop below — see
  // MobileMenuSheet for why: the inverted dark scale makes neutral-900
  // near-white, wrong for a dimming backdrop.
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself, not its content) cancels.
        if (e.target === ref.current) onCancel();
      }}
      className="rounded-card border border-neutral-200 p-0 shadow-popover backdrop:bg-black/60"
    >
      <div className="w-80 p-5 sm:w-96">
        <h2 className="mb-2 text-h2">{title}</h2>
        <p className="mb-5 text-sm text-neutral-600">{body}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant={danger ? "danger" : "primary"} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
