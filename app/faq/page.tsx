import { PLATFORM_FEE_BPS } from "@/modules/payments/stripe";

const feePercent = PLATFORM_FEE_BPS / 100;

const FAQ_GROUPS: { heading: string; items: { q: string; a: string }[] }[] = [
  {
    heading: "// general",
    items: [
      {
        q: "What is Devworld?",
        a: "A marketplace connecting businesses with developers, AI/ML engineers, cloud specialists, and other technical professionals — for quick tasks, fixed-price projects, and ongoing work.",
      },
      {
        q: "Is my money safe?",
        a: "Yes. Funded milestones and hourly invoices sit in escrow — the platform holds the money until the client approves the work, then releases it to the developer.",
      },
      {
        q: "What happens if there's a disagreement?",
        a: "Either party can open a dispute on an active agreement. An admin reviews the message history and resolves it — including releasing or refunding escrowed funds if needed.",
      },
    ],
  },
  {
    heading: "// for_clients",
    items: [
      {
        q: "How do I find a developer?",
        a: "Post a project and let developers send you proposals, or browse developer profiles directly and invite one to a project.",
      },
      {
        q: "What if the delivered work isn't right?",
        a: "You can request a change on an active agreement before approving a milestone, or open a dispute if you can't reach agreement with the developer.",
      },
      {
        q: "When do I get charged?",
        a: "Only when you fund a milestone or pay an hourly invoice — never just for posting a project or accepting proposals.",
      },
    ],
  },
  {
    heading: "// for_developers",
    items: [
      {
        q: "How do I get paid?",
        a: "Connect a Stripe account from an active agreement. Once a client funds a milestone (or pays an hourly invoice) and approves your submitted work, the payout is transferred to you automatically.",
      },
      {
        q: "What if a client won't approve or pay?",
        a: "You can open a dispute on the agreement. An admin reviews the case and can release the escrowed funds to you if the work was delivered as agreed.",
      },
      {
        q: "Do I need to pay to submit proposals?",
        a: "No — browsing projects, submitting proposals, and messaging clients are always free.",
      },
    ],
  },
  {
    heading: "// payments_and_fees",
    items: [
      {
        q: "What's the platform fee?",
        a: `Devworld takes a ${feePercent}% fee, deducted from the developer's payout when a milestone or hourly invoice is paid out — see the Pricing page for a worked example.`,
      },
      {
        q: "Is there a fee to post a project or send a proposal?",
        a: "No. The platform fee only applies to money that actually moves through escrow.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-10 font-mono text-h1">
        <span className="text-brand-600">$</span> faq
      </h1>

      {FAQ_GROUPS.map((group) => (
        <div key={group.heading} className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">{group.heading}</h2>
          <div className="space-y-2">
            {group.items.map((item) => (
              <details
                key={item.q}
                className="group rounded-card border border-neutral-200 bg-white p-4 shadow-card"
              >
                <summary className="cursor-pointer list-none text-sm font-medium">
                  {item.q}
                  <span className="float-right text-neutral-400 group-open:hidden">+</span>
                  <span className="float-right hidden text-neutral-400 group-open:inline">−</span>
                </summary>
                <p className="mt-3 text-sm text-neutral-500">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
