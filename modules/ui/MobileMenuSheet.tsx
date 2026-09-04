"use client";

import { useState } from "react";

// Generic bottom-sheet: trigger + slide-up panel + backdrop. The content is
// passed in as children so both the signed-out hamburger menu and the
// signed-in bottom tab bar's "Menu" tab can reuse it without duplicating
// the (server-rendered, role-gated) link list itself.
export function MobileMenuSheet({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu">
        {trigger}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* bg-black, not bg-neutral-900 — neutral-900 is near-white
              under the inverted dark scale (see tailwind.config.ts), so a
              dimming backdrop needs a color the theme inversion doesn't
              touch. `black` wasn't overridden, only `white` was. */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-card border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-popover">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <span className="text-sm font-medium">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
            <div onClick={() => setOpen(false)}>{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
