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

const STYLES = {
  danger: "bg-red-50 text-red-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-blue-50 text-blue-700",
  neutral: "bg-neutral-100 text-neutral-600",
} as const;

// One place that maps every status string used across the app (project,
// proposal, agreement, milestone, payment, dispute) to a consistent color —
// the same word ("active", "completed", "declined"...) always reads the
// same way regardless of which module it came from.
function classify(status: string): keyof typeof STYLES {
  if (DANGER.has(status)) return "danger";
  if (SUCCESS.has(status)) return "success";
  if (WARNING.has(status)) return "warning";
  if (INFO.has(status)) return "info";
  return "neutral";
}

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const style = STYLES[classify(status)];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style} ${className}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
