import { PLATFORM_FEE_BPS } from "@/modules/payments/stripe";

const feePercent = PLATFORM_FEE_BPS / 100;

export type Guide = {
  slug: string;
  title: string;
  summary: string;
  body: string[];
};

type GuideGroup = { heading: string; guides: Guide[] };

// Static, evergreen how-to content — no CMS/DB table for this yet, same
// call as app/faq/page.tsx. Kept as one array-per-group module (rather than
// one file per guide) since there are only a handful; split it out once
// that stops being true.
export const GUIDE_GROUPS: GuideGroup[] = [
  {
    heading: "// for_clients",
    guides: [
      {
        slug: "pricing-your-first-project",
        title: "Pricing your first project",
        summary: "How to set a budget that attracts serious proposals without overpaying.",
        body: [
          "A budget range does more work than a single number: it tells developers whether the project is worth their time before they read the description, and it gives you room to compare proposals that come in at different points in that range.",
          "For well-scoped work with a clear deliverable, fixed price is usually simplest — you and the developer agree on a total up front, and it's paid out through escrow as milestones are approved. For work where the scope will likely shift (ongoing feature work, unclear requirements, exploratory builds), hourly gives both sides room to adjust without renegotiating the whole agreement.",
          "If you're not sure what's reasonable, look at a few similar published projects for a sense of the going rate, and don't be afraid to under-specify the budget and let proposals tell you the real range — you're not committed to anything until you fund a milestone.",
          "One thing to avoid: setting a budget so low that only inexperienced developers will bother proposing. A tight range filters out exactly the people most likely to deliver well on a first project together.",
        ],
      },
      {
        slug: "writing-a-brief-that-gets-strong-proposals",
        title: "Writing a brief that gets strong proposals",
        summary: "What to include so developers can send a specific proposal, not a guess.",
        body: [
          "The proposals you get are only as good as the brief you post. A vague description (\"build me an app\") gets vague proposals back — generic pitches that could apply to almost any project. A specific one gets specific answers.",
          "At minimum, include: what the thing does and who uses it, any existing code or systems it needs to work with, the skills you think it needs (add them as required skills so the right developers see it), and a realistic timeline. If you have mockups, specs, or reference projects, attach them — developers price and plan around what they can actually see.",
          "It's fine to not have all the answers yet. Say so directly (\"scope is still being defined, looking for someone to help shape it\") rather than presenting a guess as a firm spec — that sets the right expectation for the kind of proposal you'll get back.",
        ],
      },
    ],
  },
  {
    heading: "// for_developers",
    guides: [
      {
        slug: "writing-a-proposal-that-gets-picked",
        title: "Writing a proposal that gets picked",
        summary: "How to stand out when a client is comparing several submissions.",
        body: [
          "Clients read proposals looking for one thing first: evidence you understood their specific project, not a template. Open by referencing something particular from the brief — the constraint, the stack, the deadline — before you talk about yourself.",
          "Be concrete about approach and timeline. \"I'll build this in three phases: data model and API first, then the UI, then integration testing — targeting two weeks\" tells a client far more than \"I have 5 years of experience and can start immediately.\" Specificity reads as competence.",
          "Price to the scope as described, not to a round number. If the brief is underspecified, say what you'd need clarified before committing to a final number — that's a stronger signal than guessing high or low and hoping it lands.",
          "Your portfolio does a lot of the persuading before the client finishes reading — keep it current with work that's actually relevant to the categories you propose on.",
        ],
      },
      {
        slug: "fixed-price-vs-hourly-which-to-propose",
        title: "Fixed price vs. hourly: which to propose",
        summary: "How to decide which rate type protects you on a given project.",
        body: [
          "Fixed price works in your favor when the scope is genuinely fixed and you're confident in your estimate — you're paid a known amount per milestone regardless of how efficiently you work, and a client evaluating proposals can compare them directly on price.",
          "Hourly protects you when scope is likely to move — exploratory work, unclear specs, ongoing maintenance. If a client's brief reads like the requirements aren't locked yet, proposing hourly (or a smaller fixed milestone to nail down scope first) is often the safer call for both sides.",
          "Either way, an agreement isn't binding until both parties accept it, and funds only move once a milestone is funded and later approved — so there's room to negotiate rate type in messages before anything is committed.",
        ],
      },
    ],
  },
  {
    heading: "// how_devworld_works",
    guides: [
      {
        slug: "how-escrow-and-milestones-work",
        title: "How escrow and milestones work",
        summary: "Where your money sits, and what triggers it moving.",
        body: [
          "Once a client and developer accept an agreement, work is broken into milestones — each with its own amount, and optionally a due date. Nothing is paid out yet at this point; the agreement just defines the plan.",
          "Before a developer starts on a milestone, the client funds it — the money moves into escrow and sits there, held by the platform rather than either party. The developer then does the work and submits it for review.",
          "The client reviews the submission and approves it (or requests a change first, on active agreements). Approval is what releases the escrowed funds — Devworld transfers the payout to the developer, minus the platform fee.",
          `The platform fee is ${feePercent}% and is only deducted from the developer's payout when a milestone or hourly invoice is actually paid out — there's no charge for posting a project, sending proposals, or messaging.`,
          "For hourly agreements, the same escrow-then-release pattern applies per invoice rather than per milestone.",
        ],
      },
      {
        slug: "what-happens-if-something-goes-wrong",
        title: "What happens if something goes wrong",
        summary: "Change requests and disputes — the two ways to resolve disagreement.",
        body: [
          "If the delivered work isn't quite right but you and the other party still agree on the path forward, either side can open a change request on an active agreement — adjusting scope, amount, or timeline — rather than treating it as a conflict.",
          "If you can't reach agreement, either party can open a dispute on the agreement (or a specific milestone). An admin reviews the message history and the work submitted, and resolves it — which can include releasing escrowed funds to the developer or refunding them to the client, depending on what actually happened.",
          "Disputes exist as a backstop, not a first move — most disagreements are cheaper and faster to resolve directly in the agreement's messages before escalating.",
        ],
      },
    ],
  },
];

export const GUIDES: Guide[] = GUIDE_GROUPS.flatMap((g) => g.guides);

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
