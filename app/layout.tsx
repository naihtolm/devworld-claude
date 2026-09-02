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
import { ToastProvider } from "@/modules/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Devworld — Find technical talent. Build great products.",
  description:
    "A specialized marketplace connecting businesses with developers and technical professionals.",
};

const navLinkClass = "text-sm text-neutral-600 transition-colors hover:text-neutral-900";
const menuLinkClass = "block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900";

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
  if (authProviderId) {
    const user = await ensureCurrentUser();
    if (user) roles = await getUserRoles(user.id);
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ToastProvider>
            <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span className="h-2 w-2 rounded-full bg-brand-600" />
                Devworld
              </Link>
              <nav className="flex items-center gap-5">
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
                      {roles?.isAdmin && (
                        <>
                          <div className="my-1 border-t border-neutral-100" />
                          <Link href="/admin" className={menuLinkClass}>
                            Admin
                          </Link>
                        </>
                      )}
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
            </header>
            {children}
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
