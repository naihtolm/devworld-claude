"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CountBadge } from "@/modules/ui/CountBadge";
import { MobileMenuSheet } from "@/modules/ui/MobileMenuSheet";

const iconClass = "h-5 w-5";

function HomeIcon() {
  return (
    <svg viewBox="0 0 20 20" className={iconClass} fill="currentColor">
      <path d="M10 2 2 9h2v8h5v-5h2v5h5V9h2z" />
    </svg>
  );
}
function BrowseIcon() {
  return (
    <svg viewBox="0 0 20 20" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="9" r="6" />
      <path d="m17 17-4-4" strokeLinecap="round" />
    </svg>
  );
}
function MessagesIcon() {
  return (
    <svg viewBox="0 0 20 20" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 4h16v10H7l-4 4V4z" strokeLinejoin="round" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" className={iconClass} fill="currentColor">
      <path d="M10 2a5 5 0 0 0-5 5v2.6c0 .5-.2 1-.5 1.4L3 13.5c-.6.8 0 1.9 1 1.9h12c1 0 1.6-1.1 1-1.9l-1.5-2.5a2.3 2.3 0 0 1-.5-1.4V7a5 5 0 0 0-5-5z" />
      <path d="M7.5 17a2.5 2.5 0 0 0 5 0h-5z" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
    </svg>
  );
}

// Design language §11 — logged-in mobile chrome. Bottom tab bar rather than
// a top hamburger: makes messaging/notifications thumb-reachable, which
// matters when responding fast is the whole point of a marketplace. Only
// shown below `sm`; the desktop header nav is unaffected.
export function BottomTabBar({
  homeHref,
  unreadNotifications,
  children,
}: {
  homeHref: string;
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: homeHref, label: "Home", icon: <HomeIcon /> },
    { href: "/projects", label: "Browse", icon: <BrowseIcon /> },
    { href: "/messages", label: "Messages", icon: <MessagesIcon /> },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
      aria-label="Primary"
    >
      {tabs.map((tab) => {
        const tabPath = tab.href.split("?")[0];
        const active = pathname === tabPath || (tabPath !== "/" && pathname.startsWith(tabPath));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              active ? "text-brand-600" : "text-neutral-500"
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}

      <Link
        href="/notifications"
        className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
          pathname === "/notifications" ? "text-brand-600" : "text-neutral-500"
        }`}
      >
        <span className="relative">
          <BellIcon />
          {unreadNotifications > 0 && (
            <span className="absolute -right-2 -top-1">
              <CountBadge count={unreadNotifications} />
            </span>
          )}
        </span>
        Alerts
      </Link>

      <MobileMenuSheet
        trigger={
          <span className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-neutral-500">
            <MenuIcon />
            Menu
          </span>
        }
      >
        {children}
      </MobileMenuSheet>
    </nav>
  );
}
