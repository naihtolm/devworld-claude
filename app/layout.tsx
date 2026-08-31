import type { Metadata } from "next";
import Link from "next/link";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Devworld — Find technical talent. Build great products.",
  description:
    "A specialized marketplace connecting businesses with developers and technical professionals.",
};

const navLinkClass = "text-sm text-neutral-600 transition-colors hover:text-neutral-900";
const menuLinkClass = "block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="h-2 w-2 rounded-full bg-brand-600" />
              Devworld
            </Link>
            <nav className="flex items-center gap-5">
              <Link href="/projects" className={navLinkClass}>
                Browse projects
              </Link>
              <SignedIn>
                <Link href="/messages" className={navLinkClass}>
                  Messages
                </Link>
                <Link href="/projects/new" className={navLinkClass}>
                  Post a project
                </Link>
                {/* No-JS dropdown, same <details> pattern used elsewhere in
                    the app (e.g. "Open a dispute") — everything less
                    frequent than the three links above lives here instead
                    of crowding the header directly. */}
                <details className="group relative">
                  <summary className={`${navLinkClass} inline-flex cursor-pointer list-none items-center gap-1`}>
                    More
                    <span className="text-xs text-neutral-400">▾</span>
                  </summary>
                  <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                    <Link href="/dashboard" className={menuLinkClass}>
                      My projects
                    </Link>
                    <Link href="/proposals" className={menuLinkClass}>
                      My proposals
                    </Link>
                    <Link href="/invitations" className={menuLinkClass}>
                      Invitations
                    </Link>
                    <div className="my-1 border-t border-neutral-100" />
                    <Link href="/profile/developer" className={menuLinkClass}>
                      Dev profile
                    </Link>
                    <Link href="/profile/client" className={menuLinkClass}>
                      Client profile
                    </Link>
                  </div>
                </details>
              </SignedIn>
              <SignedOut>
                <Link href="/sign-in" className={navLinkClass}>
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
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
        </body>
      </html>
    </ClerkProvider>
  );
}
