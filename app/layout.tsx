import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { ensureCurrentUser } from "@/modules/auth/user";
import { getUserRoles } from "@/modules/profiles/roles";
import { getUnreadCount } from "@/modules/notifications/actions";
import { ToastProvider } from "@/modules/ui/Toast";
import { NotificationBell } from "@/modules/notifications/NotificationBell";
import { BottomTabBar } from "@/modules/ui/BottomTabBar";
import { MobileMenuSheet } from "@/modules/ui/MobileMenuSheet";
import { Footer } from "@/modules/ui/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Devworld — Find technical talent. Build great products.",
  description:
    "A specialized marketplace connecting businesses with developers and technical professionals.",
};

const navLinkClass = "text-sm text-neutral-600 transition-colors hover:text-neutral-900";
const menuLinkClass = "block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // G-6: this used to show every menu item to every signed-in user
  // regardless of role — "My proposals"/"Dev profile" to clients who have
  // never touched a developer profile, and vice versa. Only fetch roles
  // when someone's actually signed in — no reason to add a DB round trip
  // to every anonymous page view.
  const { userId: authProviderId } = await auth();
  let roles: Awaited<ReturnType<typeof getUserRoles>> | null = null;
  let dbUserId: string | null = null;
  let unreadNotifications = 0;
  if (authProviderId) {
    const user = await ensureCurrentUser();
    if (user) {
      dbUserId = user.id;
      roles = await getUserRoles(user.id);
      unreadNotifications = await getUnreadCount(user.id);
    }
  }

  const homeHref = roles?.isClient ? "/dashboard?view=client" : roles?.isDeveloper ? "/dashboard?view=developer" : "/dashboard";

  // Shared between the desktop "More" dropdown and the mobile bottom tab
  // bar's "Menu" sheet — one role-gated link list, two presentations,
  // rather than keeping two copies in sync.
  const accountMenuLinks = (
    <>
      {roles?.isClient && (
        <Link href="/dashboard?view=client" className={menuLinkClass}>
          My projects
        </Link>
      )}
      {roles?.isDeveloper && (
        <>
          <Link href="/dashboard?view=developer" className={menuLinkClass}>
            My work
          </Link>
          <Link href="/proposals" className={menuLinkClass}>
            My proposals
          </Link>
          <Link href="/invitations" className={menuLinkClass}>
            Invitations
          </Link>
        </>
      )}
      {(roles?.isClient || roles?.isDeveloper) && <div className="my-1 border-t border-neutral-100" />}
      {roles?.isDeveloper && (
        <Link href="/profile/developer" className={menuLinkClass}>
          Dev profile
        </Link>
      )}
      {roles?.isClient && (
        <Link href="/profile/client" className={menuLinkClass}>
          Client profile
        </Link>
      )}
      <Link href="/saved" className={menuLinkClass}>
        Saved
      </Link>
      {(roles?.isClient || roles?.isDeveloper) && (
        <Link href="/earnings" className={menuLinkClass}>
          {roles?.isDeveloper && !roles?.isClient ? "Earnings" : roles?.isClient && !roles?.isDeveloper ? "Spending" : "Earnings & spending"}
        </Link>
      )}
      <div className="my-1 border-t border-neutral-100" />
      <Link href="/settings" className={menuLinkClass}>
        Account settings
      </Link>
      {roles?.isAdmin && (
        <>
          <div className="my-1 border-t border-neutral-100" />
          <Link href="/admin" className={menuLinkClass}>
            Admin
          </Link>
        </>
      )}
    </>
  );

  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ToastProvider>
            <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
              <Link href="/" className="flex items-center gap-2.5 font-mono text-base font-bold tracking-tight">
                <span className="h-2 w-2 bg-brand-600" />
                devworld<span className="text-brand-600">_</span>
              </Link>

              {/* Desktop nav — hidden below `sm`, replaced by the hamburger
                  (signed out) or bottom tab bar (signed in) instead of
                  trying to cram this same row into a phone width. */}
              <nav className="hidden items-center gap-5 sm:flex">
                <Link href="/projects" className={navLinkClass}>
                  Browse projects
                </Link>
                <Link href="/developers" className={navLinkClass}>
                  Browse developers
                </Link>
                <SignedIn>
                  <Link href="/messages" className={navLinkClass}>
                    Messages
                  </Link>
                  {dbUserId && <NotificationBell userId={dbUserId} />}
                  {roles?.isClient && (
                    <Link href="/projects/new" className={navLinkClass}>
                      Post a project
                    </Link>
                  )}
                  {/* No-JS dropdown, same <details> pattern used elsewhere in
                      the app (e.g. "Open a dispute") — everything less
                      frequent than the links above lives here instead of
                      crowding the header directly. */}
                  <details className="group relative">
                    <summary className={`${navLinkClass} inline-flex cursor-pointer list-none items-center gap-1`}>
                      More
                      <span className="text-xs text-neutral-400">▾</span>
                    </summary>
                    <div className="absolute right-0 z-10 mt-2 w-48 rounded-card border border-neutral-200 bg-white py-1 shadow-popover">
                      {accountMenuLinks}
                    </div>
                  </details>
                </SignedIn>
                <SignedOut>
                  <Link href="/sign-in" className={navLinkClass}>
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="rounded-card bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                  >
                    Sign up
                  </Link>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </nav>

              {/* Mobile chrome */}
              <div className="flex items-center gap-3 sm:hidden">
                <SignedIn>
                  {dbUserId && <NotificationBell userId={dbUserId} />}
                  <UserButton />
                </SignedIn>
                <SignedOut>
                  <Link
                    href="/sign-up"
                    className="rounded-card bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Sign up
                  </Link>
                  <MobileMenuSheet
                    trigger={
                      <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
                      </svg>
                    }
                  >
                    <Link href="/projects" className={menuLinkClass}>
                      Browse projects
                    </Link>
                    <Link href="/developers" className={menuLinkClass}>
                      Browse developers
                    </Link>
                    <div className="my-1 border-t border-neutral-100" />
                    <Link href="/sign-in" className={menuLinkClass}>
                      Sign in
                    </Link>
                  </MobileMenuSheet>
                </SignedOut>
              </div>
            </header>

            {/* Bottom padding keeps page content clear of the fixed tab
                bar — only applies when it's actually rendered (signed in,
                mobile). */}
            <div className={dbUserId ? "pb-16 sm:pb-0" : ""}>
              {children}
              <Footer />
            </div>

            {dbUserId && (
              <BottomTabBar homeHref={homeHref} unreadNotifications={unreadNotifications}>
                {accountMenuLinks}
              </BottomTabBar>
            )}
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
