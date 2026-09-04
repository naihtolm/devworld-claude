import Link from "next/link";

const CLIENT_STEPS = [
  { title: "Post a project", body: "Describe the work, pick fixed-price or hourly, set a budget and timeline." },
  { title: "Review proposals", body: "Developers apply with their rate and pitch — compare portfolios and fit." },
  { title: "Accept & fund", body: "Accept an agreement, then fund milestones (or pay hourly invoices) — money is held in escrow until you approve the work." },
  { title: "Track the work", body: "Message your developer, review submitted milestones, request changes if something's off." },
  { title: "Approve & review", body: "Approve a milestone and the funds release to the developer. Leave a review once the agreement is complete." },
];

const DEVELOPER_STEPS = [
  { title: "Browse projects", body: "Filter by category, skill, or budget — or get invited directly to a project." },
  { title: "Submit a proposal", body: "Pitch your rate and approach. The client reviews it alongside everyone else's." },
  { title: "Accept the agreement", body: "Once a client picks you, both sides accept the agreement's scope and terms." },
  { title: "Get paid through escrow", body: "Connect Stripe to receive payouts. Milestones are funded upfront and paid out when the client approves your work." },
  { title: "Deliver & get reviewed", body: "Submit your work, get paid, and collect a review that builds your public track record." },
];

function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4 rounded-card border border-neutral-200 bg-white p-4 shadow-card">
          <span className="font-mono text-xs text-brand-600">{String(i + 1).padStart(2, "0")}</span>
          <div>
            <p className="mb-1 text-sm font-medium">{step.title}</p>
            <p className="text-sm text-neutral-500">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 font-mono text-h1">
        <span className="text-brand-600">$</span> how_it_works
      </h1>
      <p className="mb-10 max-w-xl text-neutral-600">
        Devworld connects businesses with developers through escrow-backed agreements —
        money is only released when work is actually approved.
      </p>

      <div className="grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-500">{"// for_clients"}</h2>
          <StepList steps={CLIENT_STEPS} />
        </div>
        <div>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-500">{"// for_developers"}</h2>
          <StepList steps={DEVELOPER_STEPS} />
        </div>
      </div>

      <div className="mt-12 flex gap-4">
        <Link
          href="/pricing"
          className="rounded-card bg-brand-600 px-5 py-3 font-mono font-medium text-white transition-shadow hover:shadow-glow"
        >
          view_pricing →
        </Link>
        <Link
          href="/faq"
          className="rounded-card border border-neutral-300 px-5 py-3 font-mono font-medium transition-colors hover:border-brand-600"
        >
          read_faq →
        </Link>
      </div>
    </main>
  );
}
