import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

const linkClass = "block text-sm text-neutral-500 hover:text-neutral-900";
const headerClass = "mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500";

// No Terms/Privacy links here — those pages don't exist yet. Linking to
// them would just be a dead link dressed up as one.
export function Footer() {
  return (
    <footer className="border-t border-neutral-200">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <h3 className={headerClass}>{"// marketplace"}</h3>
          <nav className="space-y-2">
            <Link href="/projects" className={linkClass}>
              Browse projects
            </Link>
            <Link href="/developers" className={linkClass}>
              Browse developers
            </Link>
            <Link href="/projects/new" className={linkClass}>
              Post a project
            </Link>
          </nav>
        </div>
        <div>
          <h3 className={headerClass}>{"// company"}</h3>
          <nav className="space-y-2">
            <Link href="/how-it-works" className={linkClass}>
              How it works
            </Link>
            <Link href="/pricing" className={linkClass}>
              Pricing
            </Link>
            <Link href="/faq" className={linkClass}>
              FAQ
            </Link>
            <Link href="/spotlight" className={linkClass}>
              Spotlight
            </Link>
          </nav>
        </div>
        <div>
          <h3 className={headerClass}>{"// account"}</h3>
          <nav className="space-y-2">
            <SignedOut>
              <Link href="/sign-in" className={linkClass}>
                Sign in
              </Link>
              <Link href="/sign-up" className={linkClass}>
                Sign up
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className={linkClass}>
                Dashboard
              </Link>
            </SignedIn>
          </nav>
        </div>
      </div>
      <div className="border-t border-neutral-100 px-6 py-6 text-center font-mono text-xs text-neutral-400">
        devworld<span className="text-brand-600">_</span>
      </div>
    </footer>
  );
}
