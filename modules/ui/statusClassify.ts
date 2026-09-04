// Pure classification logic, kept separate from the StatusBadge component
// itself so it can be unit tested without pulling in JSX/React.

const DANGER = new Set([
  "cancelled",
  "disputed",
  "declined",
  "failed",
  "expired",
  "dismissed",
  "on_hold",
  "withdrawn",
  "closed",
]);

const SUCCESS = new Set([
  "published",
  "active",
  "completed",
  "funded",
  "approved",
  "paid",
  "succeeded",
  "resolved",
  "accepted",
  "actioned",
]);

const WARNING = new Set(["draft", "pending", "pending_acceptance", "submitted", "open", "processing"]);

const INFO = new Set([
  "in_discussion",
  "proposals_open",
  "developer_selected",
  "agreement_pending",
  "delivered",
  "under_review",
  "shortlisted",
  "viewed",
  "amended",
  "reviewed",
  "refunded",
  "in_progress",
]);

// Literal dark-adapted values, not Tailwind's built-in emerald/amber/red/
// blue scales — those aren't overridden by the Terminal theme (only
// neutral/white/brand are), so bg-emerald-50 etc. would still render as
// pale light-mode colors on a near-black page. Matches the approved
// design canvas's dark status-color set exactly.
export const STATUS_STYLES = {
  danger: "border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.12)] text-[#FCA5A5]",
  success: "border border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.12)] text-[#6EE7B7]",
  warning: "border border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.12)] text-[#FCD34D]",
  info: "border border-[rgba(96,165,250,0.3)] bg-[rgba(96,165,250,0.12)] text-[#93C5FD]",
  neutral: "border border-neutral-200 bg-neutral-100 text-neutral-600",
} as const;

// Same four status colors as STATUS_STYLES, as plain hex — for contexts that
// need a raw color value rather than a Tailwind class string (e.g. a bar
// chart fill), so both stay backed by one definition instead of duplicating
// the hex literals.
export const STATUS_HEX: Record<keyof typeof STATUS_STYLES, string> = {
  danger: "#FCA5A5",
  success: "#6EE7B7",
  warning: "#FCD34D",
  info: "#93C5FD",
  neutral: "#A1A1AA",
};

// One place that maps every status string used across the app (project,
// proposal, agreement, milestone, payment, dispute) to a consistent color —
// the same word ("active", "completed", "declined"...) always reads the
// same way regardless of which module it came from.
export function classify(status: string): keyof typeof STATUS_STYLES {
  if (DANGER.has(status)) return "danger";
  if (SUCCESS.has(status)) return "success";
  if (WARNING.has(status)) return "warning";
  if (INFO.has(status)) return "info";
  return "neutral";
}
