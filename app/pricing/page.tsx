import Link from "next/link";
import { CLIENT_FEE_BPS, DEVELOPER_FEE_BPS } from "@/modules/payments/stripe";
import { calculateFeeCents, calculatePayoutCents, centsToDollarString, dollarsToCents } from "@/modules/payments/fees";

// The fee figures and worked example below are computed from the real fee
// logic (modules/payments/stripe.ts, modules/payments/fees.ts), not typed
// in as a string — this page can never quote a stale rate.
const clientFeePercent = CLIENT_FEE_BPS / 100;
const developerFeePercent = DEVELOPER_FEE_BPS / 100;
const EXAMPLE_MILESTONE = 1000;
const exampleClientFeeCents = calculateFeeCents(EXAMPLE_MILESTONE, CLIENT_FEE_BPS);
const exampleDeveloperFeeCents = calculateFeeCents(EXAMPLE_MILESTONE, DEVELOPER_FEE_BPS);
const examplePayoutCents = calculatePayoutCents(EXAMPLE_MILESTONE, exampleDeveloperFeeCents);
const exampleMilestone = centsToDollarString(dollarsToCents(EXAMPLE_MILESTONE));
const exampleClientFee = centsToDollarString(exampleClientFeeCents);
const exampleClientTotal = centsToDollarString(dollarsToCents(EXAMPLE_MILESTONE) + exampleClientFeeCents);
const exampleDeveloperFee = centsToDollarString(exampleDeveloperFeeCents);
const examplePayout = centsToDollarString(examplePayoutCents);

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 font-mono text-h1">
        <span className="text-brand-600">$</span> pricing
      </h1>
      <p className="mb-10 max-w-xl text-neutral-600">
        Simple, transparent pricing. No fee to browse, post a project, or send a proposal — the
        platform fee is split evenly across both sides of a transaction.
      </p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-neutral-200 bg-white p-5 shadow-card">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-neutral-500">{"// for_clients"}</h2>
          <p className="mb-3 font-mono text-2xl font-bold text-brand-600">{clientFeePercent}%</p>
          <p className="text-sm text-neutral-500">
            Posting projects, browsing developers, and sending proposals are always free. When you
            fund a milestone or pay an hourly invoice, a {clientFeePercent}% platform fee is added
            on top, shown as its own line item at checkout.
          </p>
        </div>
        <div className="rounded-card border border-neutral-200 bg-white p-5 shadow-card">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-neutral-500">{"// for_developers"}</h2>
          <p className="mb-3 font-mono text-2xl font-bold text-brand-600">{developerFeePercent}%</p>
          <p className="text-sm text-neutral-500">
            A {developerFeePercent}% platform fee is deducted from each milestone or hourly
            payout — it covers escrow, payment processing, and dispute resolution. Browsing,
            proposing, and messaging are always free.
          </p>
        </div>
      </div>

      <div className="mb-10 rounded-card border border-neutral-200 bg-white p-5 shadow-card">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">{"// worked_example"}</h2>
        <dl className="grid grid-cols-2 gap-4 font-mono text-sm sm:grid-cols-4">
          <div>
            <dt className="text-neutral-500">milestone</dt>
            <dd className="text-lg font-semibold">${exampleMilestone}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">client_pays ({clientFeePercent}% fee)</dt>
            <dd className="text-lg font-semibold">${exampleClientTotal}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">developer_fee ({developerFeePercent}%)</dt>
            <dd className="text-lg font-semibold text-neutral-500">−${exampleDeveloperFee}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">developer_receives</dt>
            <dd className="text-lg font-semibold text-brand-600">${examplePayout}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-neutral-400">
          The client funds ${exampleClientTotal} into escrow (the ${exampleMilestone} milestone
          plus a ${exampleClientFee} platform fee); ${examplePayout} releases to the developer
          once the milestone is approved. The platform keeps ${exampleClientFee} +{" "}
          ${exampleDeveloperFee} = a combined {clientFeePercent + developerFeePercent}% per
          transaction.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/how-it-works"
          className="rounded-card border border-neutral-300 px-5 py-3 font-mono font-medium transition-colors hover:border-brand-600"
        >
          ← how_it_works
        </Link>
        <Link
          href="/faq"
          className="rounded-card bg-brand-600 px-5 py-3 font-mono font-medium text-white transition-shadow hover:shadow-glow"
        >
          read_faq →
        </Link>
      </div>
    </main>
  );
}
